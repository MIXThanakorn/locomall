-- Close the findings recorded in docs/rls-security-audit-2026-09-28.md.
-- Business mutations are RPC-only; catalog RPCs expose an explicit safe shape.

-- ---------------------------------------------------------------------------
-- Least-privilege table grants
-- ---------------------------------------------------------------------------
revoke all privileges on all tables in schema public from anon, authenticated;
grant select on public.thai_provinces, public.thai_districts, public.thai_subdistricts to anon, authenticated;
grant select on all tables in schema public to authenticated;
grant insert, update on public.profiles to authenticated;
grant insert on public.chat_messages to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- ---------------------------------------------------------------------------
-- Internal relationship helpers. They always bind authorization to auth.uid().
-- ---------------------------------------------------------------------------
create or replace function private.can_access_market(p_market_id bigint)
returns boolean language sql stable security definer set search_path=''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.markets m
    where m.market_id=p_market_id and (
      m.owner_id=(select auth.uid()) or private.is_admin()
      or exists(select 1 from public.stores s where s.market_id=m.market_id and s.manager_id=(select auth.uid()))
      or exists(select 1 from public.stores s join public.seller_listings l on l.store_id=s.store_id where s.market_id=m.market_id and l.seller_id=(select auth.uid()))
      or exists(select 1 from public.stores s join public.store_seller_applications a on a.store_id=s.store_id where s.market_id=m.market_id and a.applicant_id=(select auth.uid()))
      or exists(select 1 from public.orders o where o.market_id=m.market_id and o.buyer_id=(select auth.uid()))
      or exists(select 1 from public.carts c where c.market_id=m.market_id and c.buyer_id=(select auth.uid()))
    )
  )
$$;

create or replace function private.can_access_store(p_store_id bigint)
returns boolean language sql stable security definer set search_path=''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.stores s
    where s.store_id=p_store_id and (
      s.manager_id=(select auth.uid()) or private.is_admin() or private.market_owner(s.market_id)
      or exists(select 1 from public.seller_listings l where l.store_id=s.store_id and l.seller_id=(select auth.uid()))
      or exists(select 1 from public.store_seller_applications a where a.store_id=s.store_id and a.applicant_id=(select auth.uid()))
      or exists(select 1 from public.chat_rooms r where r.store_id=s.store_id and r.buyer_id=(select auth.uid()))
      or exists(select 1 from public.order_items i join public.orders o on o.order_id=i.order_id where i.store_id=s.store_id and o.buyer_id=(select auth.uid()))
      or exists(select 1 from public.cart_items i join public.carts c on c.cart_id=i.cart_id where i.store_id=s.store_id and c.buyer_id=(select auth.uid()))
    )
  )
$$;

create or replace function private.can_access_allocation(p_allocation_id bigint)
returns boolean language sql stable security definer set search_path='pg_catalog'
as $$
  select coalesce((
    select a.seller_id=(select auth.uid())
      or private.is_admin()
      or private.store_manager(i.store_id)
      or private.market_owner(o.market_id)
    from public.order_allocations a
    join public.order_items i on i.order_item_id=a.order_item_id
    join public.orders o on o.order_id=i.order_id
    where a.allocation_id=p_allocation_id
  ),false)
$$;

revoke execute on function private.market_owner(bigint,uuid) from public, anon;
revoke execute on function private.store_manager(bigint,uuid) from public, anon;
revoke execute on function private.notify_approval() from public, anon, authenticated;
revoke execute on function private.can_access_market(bigint) from public, anon;
revoke execute on function private.can_access_store(bigint) from public, anon;
revoke execute on function private.can_access_allocation(bigint) from public, anon;
grant execute on function private.can_access_market(bigint), private.can_access_store(bigint), private.can_access_allocation(bigint) to authenticated;

-- ---------------------------------------------------------------------------
-- Replace broad row policies with relationship/read-only policies.
-- ---------------------------------------------------------------------------
drop policy if exists listing_catalog on public.seller_listings;
drop policy if exists listing_self_update on public.seller_listings;
create policy listing_relationship_read on public.seller_listings for select to authenticated
using (
  seller_id=(select auth.uid()) or private.is_admin() or private.store_manager(store_id)
  or private.market_owner((select s.market_id from public.stores s where s.store_id=seller_listings.store_id))
);

drop policy if exists locations_self on public.user_locations;
create policy locations_self_read on public.user_locations for select to authenticated
using (user_id=(select auth.uid()) or private.is_admin());

drop policy if exists rooms_buyer_insert on public.chat_rooms;
drop policy if exists rooms_buyer_update on public.chat_rooms;

drop policy if exists notifications_self_update on public.notifications;

drop policy if exists carts_self on public.carts;
create policy carts_self_read on public.carts for select to authenticated
using (buyer_id=(select auth.uid()));
drop policy if exists cart_items_self on public.cart_items;
create policy cart_items_self_read on public.cart_items for select to authenticated
using (exists(select 1 from public.carts c where c.cart_id=cart_items.cart_id and c.buyer_id=(select auth.uid())));

drop policy if exists addresses_self on public.user_addresses;
create policy addresses_self_read on public.user_addresses for select to authenticated
using (user_id=(select auth.uid()) or private.is_admin());

drop policy if exists markets_public_catalog on public.markets;
drop policy if exists markets_authenticated_catalog on public.markets;
create policy markets_relationship_read on public.markets for select to authenticated
using ((select private.can_access_market(markets.market_id)));

drop policy if exists stores_public_catalog on public.stores;
drop policy if exists stores_authenticated_catalog on public.stores;
create policy stores_relationship_read on public.stores for select to authenticated
using ((select private.can_access_store(stores.store_id)));

drop policy if exists allocations_participants on public.order_allocations;
create policy allocations_operational_read on public.order_allocations for select to authenticated
using ((select private.can_access_allocation(order_allocations.allocation_id)));

drop policy if exists allocation_events_participants on public.allocation_status_events;
create policy allocation_events_operational_read on public.allocation_status_events for select to authenticated
using ((select private.can_access_allocation(allocation_status_events.allocation_id)));

-- ---------------------------------------------------------------------------
-- Validated write APIs
-- ---------------------------------------------------------------------------
create or replace function public.complete_location_onboarding(
  p_province_code text,p_district_code text,p_subdistrict_code text,
  p_lat double precision default null,p_lng double precision default null,p_gps_consent boolean default false
) returns void language plpgsql security definer set search_path=''
as $$
declare ref public.thai_subdistricts; g extensions.geography;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into ref from public.thai_subdistricts
  where code=p_subdistrict_code and district_code=p_district_code and province_code=p_province_code;
  if not found then raise exception 'invalid address hierarchy'; end if;
  -- A mobile GPS coordinate is useful for discovery but is not trusted as a permanent
  -- authorization location. Persist the official subdistrict centroid only.
  g=ref.geography;
  if g is null then raise exception 'location unavailable'; end if;
  insert into public.user_locations(user_id,province_code,district_code,subdistrict_code,geography,source,gps_consent)
  values(auth.uid(),ref.province_code,ref.district_code,ref.code,g,'subdistrict_centroid',coalesce(p_gps_consent,false))
  on conflict(user_id) do update set province_code=excluded.province_code,district_code=excluded.district_code,
    subdistrict_code=excluded.subdistrict_code,geography=excluded.geography,source=excluded.source,
    gps_consent=excluded.gps_consent,updated_at=now();
end $$;

create or replace function public.update_my_listing_stock(p_listing_id bigint,p_stock_quantity integer,p_status text default 'active')
returns void language plpgsql security definer set search_path=''
as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_stock_quantity<0 or p_status not in ('active','paused') then raise exception 'invalid stock/status'; end if;
  update public.seller_listings l set stock_quantity=p_stock_quantity,status=p_status,updated_at=now()
  where l.listing_id=p_listing_id and l.seller_id=auth.uid() and l.reserved_quantity<=p_stock_quantity;
  if not found then raise exception 'listing not found or stock below reserved quantity'; end if;
end $$;

create or replace function public.get_or_create_chat_room(p_store_id bigint)
returns bigint language plpgsql security definer set search_path=''
as $$
declare rid bigint;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not exists(select 1 from public.stores s join public.markets m on m.market_id=s.market_id
    where s.store_id=p_store_id and s.approval_status='approved' and m.approval_status='approved') then
    raise exception 'store unavailable';
  end if;
  insert into public.chat_rooms(store_id,buyer_id) values(p_store_id,auth.uid())
  on conflict(buyer_id,store_id) do nothing returning room_id into rid;
  if rid is null then select room_id into rid from public.chat_rooms where store_id=p_store_id and buyer_id=auth.uid(); end if;
  return rid;
end $$;

create or replace function public.mark_notification_read(p_notification_id bigint)
returns void language plpgsql security definer set search_path=''
as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  update public.notifications set read_at=coalesce(read_at,now())
  where notification_id=p_notification_id and user_id=auth.uid();
  if not found then raise exception 'notification not found'; end if;
end $$;

create or replace function public.save_my_address(
  p_address_id bigint,p_recipient_name text,p_phone text,p_address_line text,
  p_subdistrict_code text,p_is_default boolean default false
) returns bigint language plpgsql security definer set search_path=''
as $$
declare aid bigint; postal text;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if nullif(btrim(p_recipient_name),'') is null or nullif(btrim(p_phone),'') is null or nullif(btrim(p_address_line),'') is null then
    raise exception 'address fields are required';
  end if;
  select postal_code into postal from public.thai_subdistricts where code=p_subdistrict_code;
  if not found then raise exception 'invalid subdistrict'; end if;
  if p_is_default then update public.user_addresses set is_default=false where user_id=auth.uid(); end if;
  if p_address_id is null then
    insert into public.user_addresses(user_id,recipient_name,phone,address_line,subdistrict_code,postal_code,is_default)
    values(auth.uid(),btrim(p_recipient_name),btrim(p_phone),btrim(p_address_line),p_subdistrict_code,postal,coalesce(p_is_default,false))
    returning address_id into aid;
  else
    update public.user_addresses set recipient_name=btrim(p_recipient_name),phone=btrim(p_phone),address_line=btrim(p_address_line),
      subdistrict_code=p_subdistrict_code,postal_code=postal,is_default=coalesce(p_is_default,false),updated_at=now()
    where address_id=p_address_id and user_id=auth.uid() returning address_id into aid;
    if aid is null then raise exception 'address not found'; end if;
  end if;
  return aid;
end $$;

-- ---------------------------------------------------------------------------
-- Safe public catalog APIs. No UUIDs, exact geography, approval notes or seller
-- allocation metadata are returned.
-- ---------------------------------------------------------------------------
create or replace function public.get_market_catalog(p_market_id bigint)
returns jsonb language sql stable security definer set search_path=''
as $$
  select jsonb_build_object(
    'market_id',m.market_id,'name',m.name,'description',m.description,'image_url',m.image_url,
    'hub_address',m.hub_address,'province_code',m.province_code,'district_code',m.district_code,
    'subdistrict_code',m.subdistrict_code,'is_owner',m.owner_id=(select auth.uid()),
    'stores',coalesce((select jsonb_agg(jsonb_build_object(
      'store_id',s.store_id,'name',s.name,'product_name',s.product_name,'description',s.description,
      'unit',s.unit,'unit_price',s.unit_price,'image_url',s.image_url,
      'available_stock',coalesce((select sum(greatest(0,l.stock_quantity-l.reserved_quantity))
        from public.seller_listings l where l.store_id=s.store_id and l.status='active'),0)
    ) order by s.created_at) from public.stores s where s.market_id=m.market_id and s.approval_status='approved'),'[]'::jsonb)
  )
  from public.markets m where m.market_id=p_market_id and m.approval_status='approved'
$$;

create or replace function public.get_store_catalog(p_store_id bigint)
returns jsonb language sql stable security definer set search_path=''
as $$
  select jsonb_build_object(
    'store_id',s.store_id,'market_id',s.market_id,'name',s.name,'product_name',s.product_name,
    'description',s.description,'unit',s.unit,'unit_price',s.unit_price,'image_url',s.image_url,
    'available_stock',coalesce((select sum(greatest(0,l.stock_quantity-l.reserved_quantity))
      from public.seller_listings l where l.store_id=s.store_id and l.status='active'),0),
    'is_manager',s.manager_id=(select auth.uid()),
    'is_seller',exists(select 1 from public.seller_listings l where l.store_id=s.store_id and l.seller_id=(select auth.uid())),
    'same_area',exists(select 1 from public.user_locations ul where ul.user_id=(select auth.uid()) and ul.subdistrict_code=m.subdistrict_code),
    'markets',jsonb_build_object('name',m.name,'hub_address',m.hub_address,'subdistrict_code',m.subdistrict_code)
  )
  from public.stores s join public.markets m on m.market_id=s.market_id
  where s.store_id=p_store_id and s.approval_status='approved' and m.approval_status='approved'
$$;

alter function public.discover_nearby(text,text,integer,double precision,double precision) security definer;

-- ---------------------------------------------------------------------------
-- Private seller-application evidence
-- ---------------------------------------------------------------------------
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('seller-evidence','seller-evidence',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy seller_evidence_insert on storage.objects for insert to authenticated
with check(bucket_id='seller-evidence' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy seller_evidence_select on storage.objects for select to authenticated
using(bucket_id='seller-evidence' and (
  (storage.foldername(name))[1]=(select auth.uid())::text or private.is_admin()
  or exists(select 1 from public.store_seller_applications a join public.stores s on s.store_id=a.store_id
    where a.product_image_url=storage.objects.name and (s.manager_id=(select auth.uid()) or private.market_owner(s.market_id)))
));
create policy seller_evidence_delete on storage.objects for delete to authenticated
using(bucket_id='seller-evidence' and (storage.foldername(name))[1]=(select auth.uid())::text
  and not exists(select 1 from public.store_seller_applications a where a.product_image_url=storage.objects.name and a.status='pending'));

create or replace function public.apply_to_sell_in_store(p_store_id bigint,p_note text default null,p_product_image_url text default null)
returns bigint language plpgsql security definer set search_path=''
as $$
declare aid bigint; sd text; existing_status text;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if nullif(btrim(coalesce(p_product_image_url,'')),'') is null
    or p_product_image_url not like auth.uid()::text||'/%'
    or not exists(select 1 from storage.objects o where o.bucket_id='seller-evidence' and o.name=p_product_image_url) then
    raise exception 'valid product image required';
  end if;
  select m.subdistrict_code into sd from public.stores s join public.markets m on m.market_id=s.market_id
  where s.store_id=p_store_id and s.approval_status='approved' and m.approval_status='approved';
  if not found then raise exception 'store unavailable'; end if;
  if not exists(select 1 from public.user_locations where user_id=auth.uid() and subdistrict_code=sd) then
    raise exception 'seller must be in the same subdistrict';
  end if;
  select application_id,status into aid,existing_status from public.store_seller_applications
  where store_id=p_store_id and applicant_id=auth.uid() for update;
  if aid is null then
    insert into public.store_seller_applications(store_id,applicant_id,note,product_image_url)
    values(p_store_id,auth.uid(),p_note,p_product_image_url) returning application_id into aid;
  elsif existing_status='rejected' then
    update public.store_seller_applications set status='pending',note=p_note,product_image_url=p_product_image_url,
      reviewed_by=null,reviewed_at=null,review_note=null where application_id=aid;
  else return aid;
  end if;
  insert into public.approval_events(entity_type,entity_id,action,actor_id) values('seller',aid,'submitted',auth.uid());
  return aid;
end $$;

-- Explicit API execute grants. New functions default to PUBLIC execute in Postgres.
revoke execute on function public.complete_location_onboarding(text,text,text,double precision,double precision,boolean),
  public.update_my_listing_stock(bigint,integer,text), public.get_or_create_chat_room(bigint),
  public.mark_notification_read(bigint), public.save_my_address(bigint,text,text,text,text,boolean),
  public.get_market_catalog(bigint), public.get_store_catalog(bigint),
  public.apply_to_sell_in_store(bigint,text,text) from public, anon;
grant execute on function public.complete_location_onboarding(text,text,text,double precision,double precision,boolean),
  public.update_my_listing_stock(bigint,integer,text), public.get_or_create_chat_room(bigint),
  public.mark_notification_read(bigint), public.save_my_address(bigint,text,text,text,text,boolean),
  public.apply_to_sell_in_store(bigint,text,text) to authenticated;
grant execute on function public.get_market_catalog(bigint), public.get_store_catalog(bigint) to anon, authenticated;

revoke execute on function public.discover_nearby(text,text,integer,double precision,double precision) from public;
grant execute on function public.discover_nearby(text,text,integer,double precision,double precision) to anon,authenticated;
