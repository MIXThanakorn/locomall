-- Locomall Commerce Core. Existing auth.users/profiles are preserved.
-- The legacy business tables are empty in LOCO_MALL; abort rather than lose data
-- if this invariant changes before deployment.
do $$
declare
  t text;
  n bigint;
begin
  foreach t in array array['markets','market_members','market_products','seller_listings','orders','order_items','order_allocations','wallet_transactions','seller_wallet_transactions','market_wallet_transactions','chat_rooms','chat_messages','reviews','notifications','user_addresses'] loop
    if to_regclass('public.' || t) is not null then
      execute format('select count(*) from public.%I', t) into n;
      if n > 0 then raise exception 'Commerce migration refused: public.% contains % rows', t, n; end if;
    end if;
  end loop;
end $$;

create extension if not exists postgis with schema extensions;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Remove legacy RPCs before replacing their tables.
do $$ declare r record; begin
  for r in select p.oid::regprocedure as signature
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prokind='f'
  loop execute format('drop function if exists %s cascade', r.signature); end loop;
end $$;

drop table if exists public.reviews cascade;
drop table if exists public.wallet_transactions cascade;
drop table if exists public.seller_wallet_transactions cascade;
drop table if exists public.market_wallet_transactions cascade;
drop table if exists public.market_members cascade;
drop table if exists public.market_products cascade;
drop table if exists public.notifications cascade;
drop table if exists public.chat_messages cascade;
drop table if exists public.chat_rooms cascade;
drop table if exists public.order_allocations cascade;
drop table if exists public.order_items cascade;
drop table if exists public.orders cascade;
drop table if exists public.seller_listings cascade;
drop table if exists public.markets cascade;
drop table if exists public.user_addresses cascade;

alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists locale text not null default 'th';
update public.profiles set display_name=coalesce(display_name, full_name, username) where display_name is null;
revoke update(role, wallet_balance) on public.profiles from anon, authenticated;

create table public.platform_roles (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  role text not null check (role='platform_admin'),
  granted_by uuid references public.profiles(user_id),
  created_at timestamptz not null default now()
);

create table public.thai_provinces (
  code text primary key, name_th text not null, name_en text not null,
  geography extensions.geography(point,4326), source text not null, source_version text not null
);
create table public.thai_districts (
  code text primary key, province_code text not null references public.thai_provinces(code),
  name_th text not null, name_en text not null,
  geography extensions.geography(point,4326), source text not null, source_version text not null
);
create table public.thai_subdistricts (
  code text primary key, district_code text not null references public.thai_districts(code),
  province_code text not null references public.thai_provinces(code),
  name_th text not null, name_en text not null, postal_code text,
  geography extensions.geography(point,4326), source text not null, source_version text not null
);

create table public.user_locations (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  province_code text not null references public.thai_provinces(code),
  district_code text not null references public.thai_districts(code),
  subdistrict_code text not null references public.thai_subdistricts(code),
  geography extensions.geography(point,4326) not null,
  source text not null check (source in ('gps','subdistrict_centroid')),
  gps_consent boolean not null default false,
  updated_at timestamptz not null default now()
);
create table public.user_addresses (
  address_id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  label text not null default 'บ้าน', recipient_name text not null, phone text not null,
  address_line text not null, subdistrict_code text not null references public.thai_subdistricts(code),
  postal_code text not null, is_default boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.markets (
  market_id bigint generated always as identity primary key,
  owner_id uuid not null references public.profiles(user_id),
  name text not null, description text not null default '', image_url text,
  province_code text not null references public.thai_provinces(code),
  district_code text not null references public.thai_districts(code),
  subdistrict_code text not null references public.thai_subdistricts(code),
  geography extensions.geography(point,4326) not null,
  hub_address text not null,
  approval_status text not null default 'pending' check (approval_status in ('pending','approved','rejected','suspended')),
  approval_note text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.stores (
  store_id bigint generated always as identity primary key,
  market_id bigint not null references public.markets(market_id) on delete cascade,
  manager_id uuid not null references public.profiles(user_id),
  name text not null, product_name text not null, description text not null default '', image_url text,
  unit text not null default 'ชิ้น', unit_price numeric(12,2) not null check(unit_price>0),
  approval_status text not null default 'pending' check(approval_status in ('pending','approved','rejected','suspended')),
  approval_note text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(market_id, product_name)
);
create table public.store_seller_applications (
  application_id bigint generated always as identity primary key,
  store_id bigint not null references public.stores(store_id) on delete cascade,
  applicant_id uuid not null references public.profiles(user_id) on delete cascade,
  note text, status text not null default 'pending' check(status in ('pending','approved','rejected')),
  reviewed_by uuid references public.profiles(user_id), reviewed_at timestamptz, review_note text,
  created_at timestamptz not null default now(), unique(store_id,applicant_id)
);
create table public.seller_listings (
  listing_id bigint generated always as identity primary key,
  store_id bigint not null references public.stores(store_id) on delete cascade,
  seller_id uuid not null references public.profiles(user_id) on delete cascade,
  stock_quantity integer not null default 0 check(stock_quantity>=0),
  reserved_quantity integer not null default 0 check(reserved_quantity>=0 and reserved_quantity<=stock_quantity),
  fulfilled_quantity integer not null default 0 check(fulfilled_quantity>=0),
  status text not null default 'active' check(status in ('active','paused','suspended')),
  last_allocated_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(store_id,seller_id)
);
create table public.approval_events (
  event_id bigint generated always as identity primary key,
  entity_type text not null check(entity_type in ('market','store','seller')),
  entity_id bigint not null, action text not null check(action in ('submitted','approved','rejected','suspended')),
  actor_id uuid not null references public.profiles(user_id), note text, created_at timestamptz not null default now()
);

create table public.carts (
  cart_id bigint generated always as identity primary key,
  buyer_id uuid not null unique references public.profiles(user_id) on delete cascade,
  market_id bigint references public.markets(market_id) on delete cascade,
  updated_at timestamptz not null default now()
);
create table public.cart_items (
  cart_item_id bigint generated always as identity primary key,
  cart_id bigint not null references public.carts(cart_id) on delete cascade,
  store_id bigint not null references public.stores(store_id) on delete cascade,
  quantity integer not null check(quantity>0), unique(cart_id,store_id)
);
create table public.orders (
  order_id bigint generated always as identity primary key,
  order_number text not null unique default ('LM-'||to_char(now(),'YYYYMMDD')||'-'||upper(substr(gen_random_uuid()::text,1,8))),
  buyer_id uuid not null references public.profiles(user_id), address_id bigint not null references public.user_addresses(address_id),
  market_id bigint not null references public.markets(market_id), total_amount numeric(12,2) not null check(total_amount>=0),
  status text not null default 'awaiting_preparation' check(status in ('awaiting_preparation','preparing','at_hub','consolidated','shipped','delivered','cancelled')),
  payment_status text not null default 'cod_pending' check(payment_status in ('cod_pending','collected','failed')),
  tracking_number text, courier_name text, shipped_at timestamptz, delivered_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.order_items (
  order_item_id bigint generated always as identity primary key,
  order_id bigint not null references public.orders(order_id) on delete cascade,
  store_id bigint not null references public.stores(store_id), product_name text not null, unit text not null,
  unit_price numeric(12,2) not null, quantity integer not null check(quantity>0), total_amount numeric(12,2) not null
);
create table public.order_allocations (
  allocation_id bigint generated always as identity primary key,
  order_item_id bigint not null references public.order_items(order_item_id) on delete cascade,
  listing_id bigint not null references public.seller_listings(listing_id), seller_id uuid not null references public.profiles(user_id),
  quantity integer not null check(quantity>0), status text not null default 'preparing'
    check(status in ('preparing','ready_for_pickup','collected','at_hub','cancelled')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.allocation_status_events (
  event_id bigint generated always as identity primary key,
  allocation_id bigint not null references public.order_allocations(allocation_id) on delete cascade,
  from_status text, to_status text not null, actor_id uuid not null references public.profiles(user_id),
  created_at timestamptz not null default now(), unique(allocation_id,to_status)
);

create table public.chat_rooms (
  room_id bigint generated always as identity primary key,
  buyer_id uuid not null references public.profiles(user_id), store_id bigint not null references public.stores(store_id) on delete cascade,
  created_at timestamptz not null default now(), unique(buyer_id,store_id)
);
create table public.chat_messages (
  message_id bigint generated always as identity primary key,
  room_id bigint not null references public.chat_rooms(room_id) on delete cascade,
  sender_id uuid not null references public.profiles(user_id), message text not null check(length(message) between 1 and 2000),
  created_at timestamptz not null default now()
);
create table public.notifications (
  notification_id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  type text not null, title text not null, body text not null, entity_type text, entity_id bigint,
  read_at timestamptz, created_at timestamptz not null default now()
);
create table public.admin_audit_logs (
  audit_id bigint generated always as identity primary key,
  actor_id uuid not null references public.profiles(user_id), action text not null,
  entity_type text not null, entity_id bigint, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index markets_geography_gix on public.markets using gist(geography);
create index thai_subdistricts_geography_gix on public.thai_subdistricts using gist(geography);
create index markets_status_idx on public.markets(approval_status);
create index stores_market_status_idx on public.stores(market_id,approval_status);
create index listings_store_status_idx on public.seller_listings(store_id,status);
create index orders_buyer_created_idx on public.orders(buyer_id,created_at desc);
create index orders_market_status_idx on public.orders(market_id,status);
create index allocations_seller_status_idx on public.order_allocations(seller_id,status);
create index messages_room_created_idx on public.chat_messages(room_id,created_at);
create index notifications_user_created_idx on public.notifications(user_id,created_at desc);

create or replace function private.is_admin(p_user uuid default auth.uid()) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.platform_roles where user_id=p_user and role='platform_admin')
$$;
create or replace function private.market_owner(p_market bigint,p_user uuid default auth.uid()) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.markets where market_id=p_market and owner_id=p_user)
$$;
create or replace function private.store_manager(p_store bigint,p_user uuid default auth.uid()) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.stores where store_id=p_store and manager_id=p_user)
$$;
revoke all on all functions in schema private from public,anon,authenticated;

create or replace function public.complete_location_onboarding(p_province_code text,p_district_code text,p_subdistrict_code text,p_lat double precision default null,p_lng double precision default null,p_gps_consent boolean default false)
returns void language plpgsql security invoker set search_path='' as $$
declare g extensions.geography; begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not exists(select 1 from public.thai_subdistricts where code=p_subdistrict_code and district_code=p_district_code and province_code=p_province_code) then raise exception 'invalid address hierarchy'; end if;
  if p_gps_consent and p_lat is not null and p_lng is not null then g=extensions.st_setsrid(extensions.st_makepoint(p_lng,p_lat),4326)::extensions.geography;
  else select geography into g from public.thai_subdistricts where code=p_subdistrict_code; end if;
  if g is null then raise exception 'location unavailable'; end if;
  insert into public.user_locations(user_id,province_code,district_code,subdistrict_code,geography,source,gps_consent)
  values(auth.uid(),p_province_code,p_district_code,p_subdistrict_code,g,case when p_gps_consent and p_lat is not null then 'gps' else 'subdistrict_centroid' end,p_gps_consent)
  on conflict(user_id) do update set province_code=excluded.province_code,district_code=excluded.district_code,subdistrict_code=excluded.subdistrict_code,geography=excluded.geography,source=excluded.source,gps_consent=excluded.gps_consent,updated_at=now();
end $$;

create or replace function public.discover_nearby(p_query text default null,p_kind text default 'all',p_limit integer default 30)
returns table(entity_type text,entity_id bigint,market_id bigint,name text,description text,image_url text,distance_km numeric,radius_km integer,available_stock bigint)
language sql stable security invoker set search_path='' as $$
with origin as (select geography g from public.user_locations where user_id=auth.uid()),
catalog as (
 select 'market'::text entity_type,m.market_id entity_id,m.market_id,m.name,m.description,m.image_url,m.geography g,
   coalesce((select sum(greatest(0,l.stock_quantity-l.reserved_quantity)) from public.stores s join public.seller_listings l on l.store_id=s.store_id where s.market_id=m.market_id and s.approval_status='approved' and l.status='active'),0)::bigint stock
 from public.markets m where m.approval_status='approved' and p_kind in ('all','market')
 union all
 select 'store',s.store_id,m.market_id,s.name,s.description,s.image_url,m.geography,
   coalesce((select sum(greatest(0,l.stock_quantity-l.reserved_quantity)) from public.seller_listings l where l.store_id=s.store_id and l.status='active'),0)::bigint
 from public.stores s join public.markets m on m.market_id=s.market_id where s.approval_status='approved' and m.approval_status='approved' and p_kind in ('all','store')
), scored as (
 select c.*,case when o.g is null then null else extensions.st_distance(c.g,o.g)/1000 end km from catalog c left join origin o on true
 where p_query is null or btrim(p_query)='' or c.name ilike '%'||p_query||'%' or c.description ilike '%'||p_query||'%'
), bucketed as (
 select *,case when km is null then 1000 when km<=10 then 10 when km<=100 then (ceil((km-10)/5)*5+10)::int else 1000 end bucket from scored
), chosen as (select coalesce(min(bucket) filter(where bucket<=100),1000) b from bucketed)
select b.entity_type,b.entity_id,b.market_id,b.name,b.description,b.image_url,round(b.km::numeric,2),b.bucket,b.stock
from bucketed b,chosen c where b.bucket=c.b order by b.bucket,b.km nulls last,(b.stock>0) desc,b.name limit least(greatest(p_limit,1),100)
$$;

create or replace function public.apply_for_market(p_name text,p_description text,p_subdistrict_code text,p_hub_address text,p_image_url text default null)
returns bigint language plpgsql security definer set search_path='' as $$
declare loc public.user_locations; mid bigint; begin
 if auth.uid() is null then raise exception 'authentication required'; end if;
 select * into loc from public.user_locations where user_id=auth.uid() and subdistrict_code=p_subdistrict_code;
 if not found then raise exception 'market must be in your primary subdistrict'; end if;
 insert into public.markets(owner_id,name,description,image_url,province_code,district_code,subdistrict_code,geography,hub_address)
 values(auth.uid(),p_name,p_description,p_image_url,loc.province_code,loc.district_code,loc.subdistrict_code,loc.geography,p_hub_address) returning market_id into mid;
 insert into public.approval_events(entity_type,entity_id,action,actor_id) values('market',mid,'submitted',auth.uid()); return mid;
end $$;

create or replace function public.review_market(p_market_id bigint,p_approve boolean,p_note text default null)
returns void language plpgsql security definer set search_path='' as $$ begin
 if not private.is_admin() then raise exception 'forbidden'; end if;
 update public.markets set approval_status=case when p_approve then 'approved' else 'rejected' end,approval_note=p_note,updated_at=now() where market_id=p_market_id and approval_status='pending';
 if not found then raise exception 'market is not pending'; end if;
 insert into public.approval_events(entity_type,entity_id,action,actor_id,note) values('market',p_market_id,case when p_approve then 'approved' else 'rejected' end,auth.uid(),p_note);
 insert into public.admin_audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'review_market','market',p_market_id,jsonb_build_object('approved',p_approve,'note',p_note));
end $$;

create or replace function public.apply_to_open_store(p_market_id bigint,p_name text,p_product_name text,p_description text,p_unit text,p_unit_price numeric,p_image_url text default null)
returns bigint language plpgsql security definer set search_path='' as $$
declare m public.markets; sid bigint; begin
 if auth.uid() is null then raise exception 'authentication required'; end if;
 select * into m from public.markets where market_id=p_market_id and approval_status='approved'; if not found then raise exception 'market unavailable'; end if;
 if not exists(select 1 from public.user_locations where user_id=auth.uid() and subdistrict_code=m.subdistrict_code) then raise exception 'seller must be in the same subdistrict'; end if;
 insert into public.stores(market_id,manager_id,name,product_name,description,unit,unit_price,image_url) values(p_market_id,auth.uid(),p_name,p_product_name,p_description,p_unit,p_unit_price,p_image_url) returning store_id into sid;
 insert into public.approval_events(entity_type,entity_id,action,actor_id) values('store',sid,'submitted',auth.uid()); return sid;
end $$;

create or replace function public.review_store(p_store_id bigint,p_approve boolean,p_note text default null)
returns void language plpgsql security definer set search_path='' as $$
declare s public.stores; reviewer uuid; begin reviewer=auth.uid();
 select * into s from public.stores where store_id=p_store_id and approval_status='pending' for update; if not found then raise exception 'store is not pending'; end if;
 if s.manager_id=(select owner_id from public.markets where market_id=s.market_id) then
   if not private.is_admin(reviewer) then raise exception 'owner self-application requires platform admin'; end if;
 elsif not private.market_owner(s.market_id,reviewer) and not private.is_admin(reviewer) then raise exception 'forbidden'; end if;
 update public.stores set approval_status=case when p_approve then 'approved' else 'rejected' end,approval_note=p_note,updated_at=now() where store_id=p_store_id;
 if p_approve then insert into public.seller_listings(store_id,seller_id) values(p_store_id,s.manager_id) on conflict do nothing; end if;
 insert into public.approval_events(entity_type,entity_id,action,actor_id,note) values('store',p_store_id,case when p_approve then 'approved' else 'rejected' end,reviewer,p_note);
 insert into public.admin_audit_logs(actor_id,action,entity_type,entity_id,metadata) values(reviewer,'review_store','store',p_store_id,jsonb_build_object('approved',p_approve,'note',p_note));
end $$;

create or replace function public.apply_to_sell_in_store(p_store_id bigint,p_note text default null)
returns bigint language plpgsql security definer set search_path='' as $$ declare aid bigint; sd text; begin
 select m.subdistrict_code into sd from public.stores s join public.markets m on m.market_id=s.market_id where s.store_id=p_store_id and s.approval_status='approved'; if not found then raise exception 'store unavailable'; end if;
 if not exists(select 1 from public.user_locations where user_id=auth.uid() and subdistrict_code=sd) then raise exception 'seller must be in the same subdistrict'; end if;
 insert into public.store_seller_applications(store_id,applicant_id,note) values(p_store_id,auth.uid(),p_note) returning application_id into aid;
 insert into public.approval_events(entity_type,entity_id,action,actor_id) values('seller',aid,'submitted',auth.uid()); return aid;
end $$;

create or replace function public.review_store_seller(p_application_id bigint,p_approve boolean,p_note text default null)
returns void language plpgsql security definer set search_path='' as $$ declare a public.store_seller_applications; mid bigint; owner uuid; begin
 select * into a from public.store_seller_applications where application_id=p_application_id and status='pending' for update; if not found then raise exception 'application is not pending'; end if;
 select s.market_id,m.owner_id into mid,owner from public.stores s join public.markets m on m.market_id=s.market_id where s.store_id=a.store_id;
 if a.applicant_id=owner then if not private.is_admin() then raise exception 'owner self-application requires platform admin'; end if;
 elsif auth.uid()<>owner and not private.is_admin() then raise exception 'forbidden'; end if;
 update public.store_seller_applications set status=case when p_approve then 'approved' else 'rejected' end,reviewed_by=auth.uid(),reviewed_at=now(),review_note=p_note where application_id=p_application_id;
 if p_approve then insert into public.seller_listings(store_id,seller_id) values(a.store_id,a.applicant_id) on conflict do nothing; end if;
 insert into public.approval_events(entity_type,entity_id,action,actor_id,note) values('seller',p_application_id,case when p_approve then 'approved' else 'rejected' end,auth.uid(),p_note);
 insert into public.admin_audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'review_store_seller','seller',p_application_id,jsonb_build_object('approved',p_approve));
end $$;

create or replace function public.update_my_listing_stock(p_listing_id bigint,p_stock_quantity integer,p_status text default 'active')
returns void language plpgsql security invoker set search_path='' as $$ begin
 if p_stock_quantity<0 or p_status not in ('active','paused') then raise exception 'invalid stock/status'; end if;
 update public.seller_listings set stock_quantity=p_stock_quantity,status=p_status,updated_at=now() where listing_id=p_listing_id and seller_id=auth.uid() and reserved_quantity<=p_stock_quantity;
 if not found then raise exception 'listing not found or stock below reserved quantity'; end if;
end $$;

create or replace function public.create_cod_order(p_market_id bigint,p_address_id bigint,p_items jsonb)
returns bigint language plpgsql security definer set search_path='' as $$
declare oid bigint; item jsonb; s public.stores; q int; remaining int; total numeric=0; oi bigint; l record; take int; active_count int; share int; begin
 if auth.uid() is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'invalid order'; end if;
 if not exists(select 1 from public.user_addresses where address_id=p_address_id and user_id=auth.uid()) then raise exception 'invalid address'; end if;
 insert into public.orders(buyer_id,address_id,market_id,total_amount) values(auth.uid(),p_address_id,p_market_id,0) returning order_id into oid;
 for item in select * from jsonb_array_elements(p_items) loop
   q=(item->>'quantity')::int; if q<=0 then raise exception 'invalid quantity'; end if;
   select * into s from public.stores where store_id=(item->>'store_id')::bigint and market_id=p_market_id and approval_status='approved' for share; if not found then raise exception 'invalid store'; end if;
   if (select coalesce(sum(stock_quantity-reserved_quantity),0) from public.seller_listings where store_id=s.store_id and status='active')<q then raise exception 'insufficient stock for store %',s.store_id; end if;
   insert into public.order_items(order_id,store_id,product_name,unit,unit_price,quantity,total_amount) values(oid,s.store_id,s.product_name,s.unit,s.unit_price,q,s.unit_price*q) returning order_item_id into oi;
   total=total+s.unit_price*q; remaining=q;
   while remaining>0 loop
     select count(*) into active_count from public.seller_listings where store_id=s.store_id and status='active' and stock_quantity>reserved_quantity;
     if active_count=0 then raise exception 'stock changed during allocation'; end if;
     share=ceil(remaining::numeric/active_count)::int;
     for l in select listing_id,seller_id,stock_quantity-reserved_quantity available from public.seller_listings where store_id=s.store_id and status='active' and stock_quantity>reserved_quantity order by last_allocated_at nulls first,listing_id for update loop
       exit when remaining=0; take=least(l.available,share,remaining); if take<=0 then continue; end if;
       update public.seller_listings set reserved_quantity=reserved_quantity+take,updated_at=now() where listing_id=l.listing_id;
       insert into public.order_allocations(order_item_id,listing_id,seller_id,quantity) values(oi,l.listing_id,l.seller_id,take)
       on conflict(order_item_id,listing_id) do update set quantity=public.order_allocations.quantity+excluded.quantity,updated_at=now();
       remaining=remaining-take;
     end loop;
   end loop;
   update public.seller_listings sl set last_allocated_at=clock_timestamp()+(a.quantity*interval '1 microsecond')
   from public.order_allocations a where a.order_item_id=oi and a.listing_id=sl.listing_id;
 end loop;
 update public.orders set total_amount=total where order_id=oid; delete from public.carts where buyer_id=auth.uid(); return oid;
end $$;

create or replace function private.transition_allocation(p_allocation bigint,p_from text,p_to text,p_actor uuid) returns void
language plpgsql security definer set search_path='' as $$ begin
 update public.order_allocations set status=p_to,updated_at=now() where allocation_id=p_allocation and status=p_from;
 if not found then raise exception 'invalid allocation transition'; end if;
 insert into public.allocation_status_events(allocation_id,from_status,to_status,actor_id) values(p_allocation,p_from,p_to,p_actor) on conflict do nothing;
end $$;
create or replace function public.mark_allocation_ready(p_allocation_id bigint) returns void language plpgsql security definer set search_path='' as $$ begin
 if not exists(select 1 from public.order_allocations where allocation_id=p_allocation_id and seller_id=auth.uid()) then raise exception 'forbidden'; end if; perform private.transition_allocation(p_allocation_id,'preparing','ready_for_pickup',auth.uid()); end $$;
create or replace function public.record_allocation_collected(p_allocation_id bigint) returns void language plpgsql security definer set search_path='' as $$ declare mid bigint; begin
 select o.market_id into mid from public.order_allocations a join public.order_items i on i.order_item_id=a.order_item_id join public.orders o on o.order_id=i.order_id where a.allocation_id=p_allocation_id;
 if not private.market_owner(mid) and not private.is_admin() then raise exception 'forbidden'; end if; perform private.transition_allocation(p_allocation_id,'ready_for_pickup','collected',auth.uid()); end $$;
create or replace function public.record_allocation_at_hub(p_allocation_id bigint) returns void language plpgsql security definer set search_path='' as $$ declare mid bigint; begin
 select o.market_id into mid from public.order_allocations a join public.order_items i on i.order_item_id=a.order_item_id join public.orders o on o.order_id=i.order_id where a.allocation_id=p_allocation_id;
 if not private.market_owner(mid) and not private.is_admin() then raise exception 'forbidden'; end if; perform private.transition_allocation(p_allocation_id,'collected','at_hub',auth.uid()); end $$;
create or replace function public.consolidate_order(p_order_id bigint) returns void language plpgsql security definer set search_path='' as $$ declare mid bigint; begin
 select market_id into mid from public.orders where order_id=p_order_id and status in ('awaiting_preparation','preparing','at_hub'); if not private.market_owner(mid) and not private.is_admin() then raise exception 'forbidden'; end if;
 if exists(select 1 from public.order_allocations a join public.order_items i on i.order_item_id=a.order_item_id where i.order_id=p_order_id and a.status<>'at_hub') then raise exception 'all allocations must be at hub'; end if;
 update public.orders set status='consolidated',updated_at=now() where order_id=p_order_id; end $$;
create or replace function public.ship_order(p_order_id bigint,p_tracking_number text,p_courier_name text) returns void language plpgsql security definer set search_path='' as $$ declare mid bigint; begin
 select market_id into mid from public.orders where order_id=p_order_id and status='consolidated'; if not private.market_owner(mid) and not private.is_admin() then raise exception 'forbidden'; end if;
 update public.orders set status='shipped',tracking_number=p_tracking_number,courier_name=p_courier_name,shipped_at=now(),updated_at=now() where order_id=p_order_id; if not found then raise exception 'order is not consolidated'; end if; end $$;
create or replace function public.confirm_delivery(p_order_id bigint) returns void language plpgsql security definer set search_path='' as $$ begin
 update public.orders set status='delivered',payment_status='collected',delivered_at=now(),updated_at=now() where order_id=p_order_id and buyer_id=auth.uid() and status='shipped'; if not found then raise exception 'forbidden or invalid state'; end if;
 update public.seller_listings l set reserved_quantity=reserved_quantity-a.q,fulfilled_quantity=fulfilled_quantity+a.q from (select listing_id,sum(quantity)::int q from public.order_allocations oa join public.order_items oi on oi.order_item_id=oa.order_item_id where oi.order_id=p_order_id group by listing_id) a where l.listing_id=a.listing_id; end $$;
create or replace function public.cancel_order(p_order_id bigint,p_reason text default null,p_admin_override boolean default false) returns void language plpgsql security definer set search_path='' as $$ begin
 if not exists(select 1 from public.orders where order_id=p_order_id and ((buyer_id=auth.uid() and status in ('awaiting_preparation','preparing','at_hub','consolidated')) or (p_admin_override and private.is_admin()))) then raise exception 'forbidden or too late to cancel'; end if;
 update public.orders set status='cancelled',payment_status='failed',updated_at=now() where order_id=p_order_id and status<>'cancelled'; if not found then return; end if;
 update public.seller_listings l set reserved_quantity=greatest(0,reserved_quantity-a.q) from (select listing_id,sum(quantity)::int q from public.order_allocations oa join public.order_items oi on oi.order_item_id=oa.order_item_id where oi.order_id=p_order_id group by listing_id) a where l.listing_id=a.listing_id;
 update public.order_allocations a set status='cancelled',updated_at=now() from public.order_items i where i.order_item_id=a.order_item_id and i.order_id=p_order_id;
 if p_admin_override then insert into public.admin_audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'cancel_order','order',p_order_id,jsonb_build_object('reason',p_reason)); end if; end $$;

-- RLS: default-deny, public catalog only, private data scoped to participants.
do $$ declare t text; begin foreach t in array array['profiles','platform_roles','thai_provinces','thai_districts','thai_subdistricts','user_locations','user_addresses','markets','stores','store_seller_applications','seller_listings','approval_events','carts','cart_items','orders','order_items','order_allocations','allocation_status_events','chat_rooms','chat_messages','notifications','admin_audit_logs'] loop execute format('alter table public.%I enable row level security',t); end loop; end $$;
drop policy if exists "Profiles viewable by everyone" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
create policy profile_self_select on public.profiles for select to authenticated using((select auth.uid())=user_id or private.is_admin());
create policy profile_self_update on public.profiles for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy thai_provinces_read on public.thai_provinces for select using(true);
create policy thai_districts_read on public.thai_districts for select using(true);
create policy thai_subdistricts_read on public.thai_subdistricts for select using(true);
create policy locations_self on public.user_locations for all to authenticated using((select auth.uid())=user_id or private.is_admin()) with check((select auth.uid())=user_id);
create policy addresses_self on public.user_addresses for all to authenticated using((select auth.uid())=user_id or private.is_admin()) with check((select auth.uid())=user_id);
create policy markets_catalog on public.markets for select using(approval_status='approved' or owner_id=(select auth.uid()) or private.is_admin());
create policy stores_catalog on public.stores for select using(approval_status='approved' or manager_id=(select auth.uid()) or private.is_admin() or private.market_owner(market_id));
create policy listing_catalog on public.seller_listings for select using(status='active' or seller_id=(select auth.uid()) or private.store_manager(store_id) or private.is_admin());
create policy listing_self_update on public.seller_listings for update to authenticated using(seller_id=(select auth.uid())) with check(seller_id=(select auth.uid()));
create policy applications_participants on public.store_seller_applications for select to authenticated using(applicant_id=(select auth.uid()) or private.store_manager(store_id) or private.is_admin() or private.market_owner((select market_id from public.stores where store_id=store_seller_applications.store_id)));
create policy carts_self on public.carts for all to authenticated using(buyer_id=(select auth.uid())) with check(buyer_id=(select auth.uid()));
create policy cart_items_self on public.cart_items for all to authenticated using(exists(select 1 from public.carts c where c.cart_id=cart_items.cart_id and c.buyer_id=(select auth.uid()))) with check(exists(select 1 from public.carts c where c.cart_id=cart_items.cart_id and c.buyer_id=(select auth.uid())));
create policy orders_participants on public.orders for select to authenticated using(buyer_id=(select auth.uid()) or private.market_owner(market_id) or private.is_admin() or exists(select 1 from public.order_items i join public.order_allocations a on a.order_item_id=i.order_item_id where i.order_id=orders.order_id and a.seller_id=(select auth.uid())));
create policy order_items_participants on public.order_items for select to authenticated using(exists(select 1 from public.orders o where o.order_id=order_items.order_id and (o.buyer_id=(select auth.uid()) or private.market_owner(o.market_id) or private.is_admin())) or exists(select 1 from public.order_allocations a where a.order_item_id=order_items.order_item_id and a.seller_id=(select auth.uid())));
create policy allocations_participants on public.order_allocations for select to authenticated using(seller_id=(select auth.uid()) or private.is_admin() or exists(select 1 from public.order_items i join public.orders o on o.order_id=i.order_id where i.order_item_id=order_allocations.order_item_id and (o.buyer_id=(select auth.uid()) or private.market_owner(o.market_id))));
create policy allocation_events_participants on public.allocation_status_events for select to authenticated using(exists(select 1 from public.order_allocations a where a.allocation_id=allocation_status_events.allocation_id and (a.seller_id=(select auth.uid()) or private.is_admin() or exists(select 1 from public.order_items i join public.orders o on o.order_id=i.order_id where i.order_item_id=a.order_item_id and (o.buyer_id=(select auth.uid()) or private.market_owner(o.market_id))))));
create policy rooms_participants on public.chat_rooms for select to authenticated using(buyer_id=(select auth.uid()) or private.store_manager(store_id));
create policy rooms_buyer_insert on public.chat_rooms for insert to authenticated with check(buyer_id=(select auth.uid()) and exists(select 1 from public.stores where store_id=chat_rooms.store_id and approval_status='approved'));
create policy messages_participants_read on public.chat_messages for select to authenticated using(exists(select 1 from public.chat_rooms r where r.room_id=chat_messages.room_id and (r.buyer_id=(select auth.uid()) or private.store_manager(r.store_id))));
create policy messages_participants_insert on public.chat_messages for insert to authenticated with check(sender_id=(select auth.uid()) and exists(select 1 from public.chat_rooms r where r.room_id=chat_messages.room_id and (r.buyer_id=(select auth.uid()) or private.store_manager(r.store_id))));
create policy notifications_self on public.notifications for select to authenticated using(user_id=(select auth.uid()));
create policy notifications_self_update on public.notifications for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy roles_admin_read on public.platform_roles for select to authenticated using(user_id=(select auth.uid()) or private.is_admin());
create policy approvals_admin_read on public.approval_events for select to authenticated using(private.is_admin());
create policy audit_admin_read on public.admin_audit_logs for select to authenticated using(private.is_admin());

-- Explicit RPC surface. SECURITY DEFINER functions remain inaccessible unless granted here.
revoke execute on all functions in schema public from public,anon,authenticated;
grant execute on function public.complete_location_onboarding(text,text,text,double precision,double precision,boolean) to authenticated;
grant execute on function public.discover_nearby(text,text,integer) to anon,authenticated;
grant execute on function public.apply_for_market(text,text,text,text,text) to authenticated;
grant execute on function public.review_market(bigint,boolean,text) to authenticated;
grant execute on function public.apply_to_open_store(bigint,text,text,text,text,numeric,text) to authenticated;
grant execute on function public.review_store(bigint,boolean,text) to authenticated;
grant execute on function public.apply_to_sell_in_store(bigint,text) to authenticated;
grant execute on function public.review_store_seller(bigint,boolean,text) to authenticated;
grant execute on function public.update_my_listing_stock(bigint,integer,text) to authenticated;
grant execute on function public.create_cod_order(bigint,bigint,jsonb) to authenticated;
grant execute on function public.mark_allocation_ready(bigint) to authenticated;
grant execute on function public.record_allocation_collected(bigint) to authenticated;
grant execute on function public.record_allocation_at_hub(bigint) to authenticated;
grant execute on function public.consolidate_order(bigint) to authenticated;
grant execute on function public.ship_order(bigint,text,text) to authenticated;
grant execute on function public.confirm_delivery(bigint) to authenticated;
grant execute on function public.cancel_order(bigint,text,boolean) to authenticated;

-- User-owned uploads only. Market/store imagery should be uploaded by their owner/manager.
drop policy if exists "Users can upload their avatar" on storage.objects;
drop policy if exists "Users can update their avatar" on storage.objects;
drop policy if exists "Users can delete their avatar" on storage.objects;
create policy locomall_upload_own on storage.objects for insert to authenticated with check(bucket_id in ('avatars','market-images','store-images') and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy locomall_update_own on storage.objects for update to authenticated using((storage.foldername(name))[1]=(select auth.uid())::text) with check((storage.foldername(name))[1]=(select auth.uid())::text);
create policy locomall_delete_own on storage.objects for delete to authenticated using((storage.foldername(name))[1]=(select auth.uid())::text);

-- Realtime is intentionally limited to rows already protected by RLS.
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.chat_messages;
exception when duplicate_object then null; end $$;
