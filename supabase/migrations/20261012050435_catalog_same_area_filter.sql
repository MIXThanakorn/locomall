-- Optional same-subdistrict discovery. The installed all-area RPC is unchanged.
-- This read-only DTO needs a definer helper because catalog tables/stock are
-- private under RLS. Scope is always auth.uid()'s saved area, never a supplied ID.
create or replace function private.discover_same_area_catalog_page(
  p_query text default null,
  p_kind text default 'all',
  p_limit integer default 24,
  p_lat double precision default null,
  p_lng double precision default null,
  p_after_distance_km numeric default null,
  p_after_entity_type text default null,
  p_after_entity_id bigint default null
)
returns table(entity_type text,entity_id bigint,market_id bigint,name text,
  description text,image_url text,distance_km numeric,radius_km integer,available_stock bigint)
language sql stable security definer set search_path = '' as $$
with saved_area as (
  select ul.subdistrict_code, ul.geography
  from public.user_locations ul where ul.user_id=(select auth.uid())
), origin as (
  select case
    when p_lat between -90 and 90 and p_lng between -180 and 180
      then extensions.st_setsrid(extensions.st_makepoint(p_lng,p_lat),4326)::extensions.geography
    else a.geography end as geography
  from saved_area a
), catalog as (
  select 'market'::text as entity_type,m.market_id as entity_id,m.market_id,
    m.name,m.description,m.image_url,null::text as product_name,m.geography,
    coalesce((select sum(greatest(0,l.stock_quantity-l.reserved_quantity))
      from public.stores s join public.seller_listings l on l.store_id=s.store_id
      where s.market_id=m.market_id and s.approval_status='approved' and l.status='active'),0)::bigint as stock
  from public.markets m join saved_area a on a.subdistrict_code=m.subdistrict_code
  where m.approval_status='approved' and p_kind in ('all','market')
  union all
  select 'store'::text,s.store_id,m.market_id,s.name,s.description,s.image_url,s.product_name,m.geography,
    coalesce((select sum(greatest(0,l.stock_quantity-l.reserved_quantity))
      from public.seller_listings l where l.store_id=s.store_id and l.status='active'),0)::bigint
  from public.stores s join public.markets m on m.market_id=s.market_id
  join saved_area a on a.subdistrict_code=m.subdistrict_code
  where s.approval_status='approved' and m.approval_status='approved' and p_kind in ('all','store')
), scored as (
  select c.*,case when o.geography is null then null
    else round((extensions.st_distance(c.geography,o.geography)/1000)::numeric,2) end as km
  from catalog c cross join origin o
  where p_query is null or btrim(p_query)=''
    or c.name ilike '%'||btrim(p_query)||'%'
    or c.description ilike '%'||btrim(p_query)||'%'
    or c.product_name ilike '%'||btrim(p_query)||'%'
), ordered as (
  select s.*,coalesce(s.km,1000000000::numeric) as sort_distance from scored s
)
select o.entity_type,o.entity_id,o.market_id,o.name,o.description,o.image_url,o.km,1000::integer,o.stock
from ordered o
where p_after_entity_type is null or (o.sort_distance,o.entity_type,o.entity_id) >
  (coalesce(p_after_distance_km,1000000000::numeric),p_after_entity_type,p_after_entity_id)
order by o.sort_distance,o.entity_type,o.entity_id
limit least(greatest(p_limit,1),100)
$$;

create or replace function public.discover_same_area_catalog_page(
  p_query text default null,p_kind text default 'all',p_limit integer default 24,
  p_lat double precision default null,p_lng double precision default null,
  p_after_distance_km numeric default null,p_after_entity_type text default null,p_after_entity_id bigint default null
)
returns table(entity_type text,entity_id bigint,market_id bigint,name text,
  description text,image_url text,distance_km numeric,radius_km integer,available_stock bigint)
language sql stable security invoker set search_path = '' as $$
  select * from private.discover_same_area_catalog_page(p_query,p_kind,p_limit,p_lat,p_lng,
    p_after_distance_km,p_after_entity_type,p_after_entity_id)
$$;
revoke all on function private.discover_same_area_catalog_page(text,text,integer,double precision,double precision,numeric,text,bigint) from public,anon,authenticated;
revoke all on function public.discover_same_area_catalog_page(text,text,integer,double precision,double precision,numeric,text,bigint) from public,anon,authenticated;
grant execute on function private.discover_same_area_catalog_page(text,text,integer,double precision,double precision,numeric,text,bigint) to authenticated;
grant execute on function public.discover_same_area_catalog_page(text,text,integer,double precision,double precision,numeric,text,bigint) to authenticated;
notify pgrst, 'reload schema';
