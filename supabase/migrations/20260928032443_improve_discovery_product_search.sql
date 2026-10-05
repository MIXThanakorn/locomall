-- Keep Home/Nearby discovery as a single public catalog RPC, but include the
-- one-product-per-store field in text matching. The result shape stays stable
-- for existing mobile clients.
create or replace function public.discover_nearby(
  p_query text default null,
  p_kind text default 'all',
  p_limit integer default 30,
  p_lat double precision default null,
  p_lng double precision default null
)
returns table(
  entity_type text,
  entity_id bigint,
  market_id bigint,
  name text,
  description text,
  image_url text,
  distance_km numeric,
  radius_km integer,
  available_stock bigint
)
language sql stable security invoker set search_path='' as $$
with origin as (
  select case
    when p_lat between -90 and 90 and p_lng between -180 and 180
      then extensions.st_setsrid(extensions.st_makepoint(p_lng,p_lat),4326)::extensions.geography
    else (select ul.geography from public.user_locations ul where ul.user_id=auth.uid())
  end g
),
catalog as (
  select
    'market'::text entity_type,
    m.market_id entity_id,
    m.market_id,
    m.name,
    m.description,
    m.image_url,
    null::text product_name,
    m.geography g,
    coalesce((
      select sum(greatest(0,l.stock_quantity-l.reserved_quantity))
      from public.stores s
      join public.seller_listings l on l.store_id=s.store_id
      where s.market_id=m.market_id and s.approval_status='approved' and l.status='active'
    ),0)::bigint stock
  from public.markets m
  where m.approval_status='approved' and p_kind in ('all','market')

  union all

  select
    'store',
    s.store_id,
    m.market_id,
    s.name,
    s.description,
    s.image_url,
    s.product_name,
    m.geography,
    coalesce((
      select sum(greatest(0,l.stock_quantity-l.reserved_quantity))
      from public.seller_listings l
      where l.store_id=s.store_id and l.status='active'
    ),0)::bigint
  from public.stores s
  join public.markets m on m.market_id=s.market_id
  where s.approval_status='approved' and m.approval_status='approved' and p_kind in ('all','store')
),
scored as (
  select c.*,case when o.g is null then null else extensions.st_distance(c.g,o.g)/1000 end km
  from catalog c cross join origin o
  where p_query is null
     or btrim(p_query)=''
     or c.name ilike '%'||btrim(p_query)||'%'
     or c.description ilike '%'||btrim(p_query)||'%'
     or c.product_name ilike '%'||btrim(p_query)||'%'
),
bucketed as (
  select *,case
    when km is null then 1000
    when km<=10 then 10
    when km<=100 then (ceil((km-10)/5)*5+10)::int
    else 1000
  end bucket
  from scored
),
chosen as (
  select coalesce(min(bucket) filter(where bucket<=100),1000) b from bucketed
)
select b.entity_type,b.entity_id,b.market_id,b.name,b.description,b.image_url,
  round(b.km::numeric,2),b.bucket,b.stock
from bucketed b,chosen c
where b.bucket=c.b
order by
  b.bucket,
  case
    when lower(b.name)=lower(btrim(p_query)) or lower(coalesce(b.product_name,''))=lower(btrim(p_query)) then 0
    else 1
  end,
  b.km nulls last,
  (b.stock>0) desc,
  b.name
limit least(greatest(p_limit,1),100)
$$;

revoke execute on function public.discover_nearby(text,text,integer,double precision,double precision) from public;
grant execute on function public.discover_nearby(text,text,integer,double precision,double precision) to anon, authenticated;
