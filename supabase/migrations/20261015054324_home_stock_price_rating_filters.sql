-- Additive read-only catalog API. Existing installed clients retain their RPCs.
-- Private definer is needed for approved public DTOs across private catalog RLS;
-- saved location/area is always scoped to auth.uid(), never supplied user IDs.
create or replace function private.discover_filtered_catalog_page(
  p_query text default null,p_kind text default 'all',p_limit integer default 24,
  p_lat double precision default null,p_lng double precision default null,
  p_same_area boolean default false,p_nearby_only boolean default false,
  p_in_stock_only boolean default false,p_sort text default 'distance',
  p_after_missing boolean default null,p_after_value numeric default null,
  p_after_distance_km numeric default null,p_after_entity_type text default null,
  p_after_entity_id bigint default null
)
returns table(entity_type text,entity_id bigint,market_id bigint,name text,
  description text,image_url text,distance_km numeric,radius_km integer,available_stock bigint,
  unit_price numeric,rating_average numeric,rating_count integer,cursor_missing boolean,cursor_value numeric)
language sql stable security definer set search_path='' as $$
with saved_area as (
  select ul.subdistrict_code,ul.geography from public.user_locations ul
  where ul.user_id=(select auth.uid())
), origin as (
  select case when p_lat between -90 and 90 and p_lng between -180 and 180
    then extensions.st_setsrid(extensions.st_makepoint(p_lng,p_lat),4326)::extensions.geography
    else (select a.geography from saved_area a) end as geography
), catalog as (
  select 'market'::text as entity_type,m.market_id as entity_id,m.market_id,
    m.name,m.description,m.image_url,null::text as product_name,m.geography,
    coalesce((select sum(greatest(0,l.stock_quantity-l.reserved_quantity))
      from public.stores s join public.seller_listings l on l.store_id=s.store_id
      where s.market_id=m.market_id and s.approval_status='approved' and l.status='active'),0)::bigint as stock,
    (select min(s.unit_price) from public.stores s where s.market_id=m.market_id and s.approval_status='approved') as price,
    m.rating_average,m.rating_count
  from public.markets m
  where m.approval_status='approved' and p_kind in ('all','market')
    and (not coalesce(p_same_area,false) or m.subdistrict_code=(select a.subdistrict_code from saved_area a))
  union all
  select 'store'::text,s.store_id,m.market_id,s.name,s.description,s.image_url,s.product_name,m.geography,
    coalesce((select sum(greatest(0,l.stock_quantity-l.reserved_quantity))
      from public.seller_listings l where l.store_id=s.store_id and l.status='active'),0)::bigint,
    s.unit_price,s.rating_average,s.rating_count
  from public.stores s join public.markets m on m.market_id=s.market_id
  where s.approval_status='approved' and m.approval_status='approved' and p_kind in ('all','store')
    and (not coalesce(p_same_area,false) or m.subdistrict_code=(select a.subdistrict_code from saved_area a))
), scored as (
  select c.*,case when o.geography is null then null
    else round((extensions.st_distance(c.geography,o.geography)/1000)::numeric,2) end as km
  from catalog c cross join origin o
  where (not coalesce(p_in_stock_only,false) or c.stock>0)
    and (not coalesce(p_nearby_only,false) or
      (o.geography is not null and extensions.st_distance(c.geography,o.geography)<=10000))
    and (p_query is null or btrim(p_query)='' or c.name ilike '%'||btrim(p_query)||'%'
      or c.description ilike '%'||btrim(p_query)||'%' or c.product_name ilike '%'||btrim(p_query)||'%')
), ordered as (
  select s.*,coalesce(s.km,1000000000::numeric) as sort_distance,
    case when p_sort in ('price_asc','price_desc') then s.price is null
      when p_sort='rating' then s.rating_count=0 else false end as sort_missing,
    coalesce(case when p_sort='price_asc' then s.price
      when p_sort='price_desc' then -s.price
      when p_sort='rating' and s.rating_count>0 then -s.rating_average else 0 end,0)::numeric as sort_value
  from scored s
)
select o.entity_type,o.entity_id,o.market_id,o.name,o.description,o.image_url,o.km,
  case when coalesce(p_nearby_only,false) then 10 else 1000 end,o.stock,
  o.price,o.rating_average,o.rating_count,o.sort_missing,o.sort_value
from ordered o
where p_after_entity_type is null or (o.sort_missing,o.sort_value,o.sort_distance,o.entity_type,o.entity_id)>
  (coalesce(p_after_missing,false),coalesce(p_after_value,0),
   coalesce(p_after_distance_km,1000000000::numeric),p_after_entity_type,p_after_entity_id)
order by o.sort_missing,o.sort_value,o.sort_distance,o.entity_type,o.entity_id
limit least(greatest(p_limit,1),100)
$$;

create or replace function public.discover_filtered_catalog_page(
  p_query text default null,p_kind text default 'all',p_limit integer default 24,
  p_lat double precision default null,p_lng double precision default null,
  p_same_area boolean default false,p_nearby_only boolean default false,
  p_in_stock_only boolean default false,p_sort text default 'distance',
  p_after_missing boolean default null,p_after_value numeric default null,
  p_after_distance_km numeric default null,p_after_entity_type text default null,
  p_after_entity_id bigint default null
)
returns table(entity_type text,entity_id bigint,market_id bigint,name text,
  description text,image_url text,distance_km numeric,radius_km integer,available_stock bigint,
  unit_price numeric,rating_average numeric,rating_count integer,cursor_missing boolean,cursor_value numeric)
language sql stable security invoker set search_path='' as $$
  select * from private.discover_filtered_catalog_page(p_query,p_kind,p_limit,p_lat,p_lng,
    p_same_area,p_nearby_only,p_in_stock_only,p_sort,p_after_missing,p_after_value,
    p_after_distance_km,p_after_entity_type,p_after_entity_id)
$$;
revoke all on function private.discover_filtered_catalog_page(text,text,integer,double precision,double precision,boolean,boolean,boolean,text,boolean,numeric,numeric,text,bigint) from public,anon,authenticated;
revoke all on function public.discover_filtered_catalog_page(text,text,integer,double precision,double precision,boolean,boolean,boolean,text,boolean,numeric,numeric,text,bigint) from public,anon,authenticated;
grant execute on function private.discover_filtered_catalog_page(text,text,integer,double precision,double precision,boolean,boolean,boolean,text,boolean,numeric,numeric,text,bigint) to anon,authenticated;
grant execute on function public.discover_filtered_catalog_page(text,text,integer,double precision,double precision,boolean,boolean,boolean,text,boolean,numeric,numeric,text,bigint) to anon,authenticated;
notify pgrst,'reload schema';
