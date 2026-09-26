-- Market/store management, strict stock ownership, and local pickup.

alter table public.orders alter column address_id drop not null;
alter table public.orders add column if not exists fulfillment_method text not null default 'delivery';
alter table public.orders add column if not exists pickup_distance_km numeric(8,2);
alter table public.orders add column if not exists pickup_ready_at timestamptz;

alter table public.orders drop constraint if exists orders_fulfillment_method_check;
alter table public.orders add constraint orders_fulfillment_method_check
  check (fulfillment_method in ('delivery','pickup'));
alter table public.orders drop constraint if exists orders_fulfillment_address_check;
alter table public.orders add constraint orders_fulfillment_address_check
  check (
    (fulfillment_method = 'delivery' and address_id is not null)
    or (fulfillment_method = 'pickup' and address_id is null)
  ) not valid;
alter table public.orders validate constraint orders_fulfillment_address_check;

create index if not exists orders_market_fulfillment_status_idx
  on public.orders(market_id,fulfillment_method,status);

create or replace function public.update_market(
  p_market_id bigint,
  p_name text,
  p_description text,
  p_hub_address text,
  p_image_url text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if nullif(btrim(p_name),'') is null or nullif(btrim(p_hub_address),'') is null then
    raise exception 'name and hub address are required';
  end if;

  update public.markets m
  set name = btrim(p_name),
      description = btrim(coalesce(p_description,'')),
      hub_address = btrim(p_hub_address),
      image_url = coalesce(p_image_url,m.image_url),
      updated_at = now()
  where m.market_id = p_market_id
    and (m.owner_id = auth.uid() or (select private.is_admin()));

  if not found then raise exception 'forbidden or market unavailable'; end if;

  insert into public.admin_audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'update_market','market',p_market_id,jsonb_build_object('name',btrim(p_name)));
end
$$;

create or replace function public.update_store(
  p_store_id bigint,
  p_name text,
  p_product_name text,
  p_description text,
  p_unit text,
  p_unit_price numeric,
  p_image_url text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if nullif(btrim(p_name),'') is null
     or nullif(btrim(p_product_name),'') is null
     or nullif(btrim(p_unit),'') is null
     or p_unit_price is null or p_unit_price <= 0 then
    raise exception 'invalid store details';
  end if;

  update public.stores s
  set name = btrim(p_name),
      product_name = btrim(p_product_name),
      description = btrim(coalesce(p_description,'')),
      unit = btrim(p_unit),
      unit_price = p_unit_price,
      image_url = coalesce(p_image_url,s.image_url),
      updated_at = now()
  where s.store_id = p_store_id
    and (s.manager_id = auth.uid() or (select private.is_admin()));

  if not found then raise exception 'forbidden or store unavailable'; end if;

  insert into public.admin_audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'update_store','store',p_store_id,jsonb_build_object('name',btrim(p_name),'unit_price',p_unit_price));
end
$$;

create or replace function public.get_store_request_detail(p_store_id bigint)
returns table(
  store_id bigint,
  market_id bigint,
  market_name text,
  store_name text,
  product_name text,
  description text,
  unit text,
  unit_price numeric,
  image_url text,
  approval_status text,
  approval_note text,
  applicant_id uuid,
  applicant_name text,
  applicant_username text,
  applicant_phone text,
  province_name text,
  district_name text,
  subdistrict_name text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not exists (
    select 1 from public.stores s
    join public.markets m on m.market_id=s.market_id
    where s.store_id=p_store_id
      and (m.owner_id=auth.uid() or s.manager_id=auth.uid() or (select private.is_admin()))
  ) then raise exception 'forbidden'; end if;

  return query
  select s.store_id,s.market_id,m.name,s.name,s.product_name,s.description,s.unit,s.unit_price,s.image_url,
         s.approval_status,s.approval_note,s.manager_id,
         coalesce(p.display_name,p.full_name::text,'ผู้ใช้ Locomall'),p.username::text,p.phone_num::text,
         tp.name_th::text,td.name_th::text,ts.name_th::text,s.created_at
  from public.stores s
  join public.markets m on m.market_id=s.market_id
  join public.profiles p on p.user_id=s.manager_id
  left join public.user_locations ul on ul.user_id=s.manager_id
  left join public.thai_provinces tp on tp.code=ul.province_code
  left join public.thai_districts td on td.code=ul.district_code
  left join public.thai_subdistricts ts on ts.code=ul.subdistrict_code
  where s.store_id=p_store_id;
end
$$;

create or replace function public.get_pickup_eligibility(
  p_market_id bigint,
  p_lat double precision default null,
  p_lng double precision default null
)
returns table(eligible boolean,distance_km numeric,hub_address text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  origin extensions.geography;
  destination extensions.geography;
  hub text;
  distance_m double precision;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select m.geography,m.hub_address into destination,hub
  from public.markets m
  where m.market_id=p_market_id and m.approval_status='approved';
  if not found then raise exception 'market unavailable'; end if;

  if p_lat is not null and p_lng is not null
     and p_lat between -90 and 90 and p_lng between -180 and 180 then
    origin=extensions.st_setsrid(extensions.st_makepoint(p_lng,p_lat),4326)::extensions.geography;
  else
    select ul.geography into origin from public.user_locations ul where ul.user_id=auth.uid();
  end if;
  if origin is null then raise exception 'location unavailable'; end if;

  distance_m=extensions.st_distance(origin,destination);
  return query select distance_m<=10000,round((distance_m/1000)::numeric,2),hub;
end
$$;

-- Requiring a reason on rejection gives applicants actionable feedback.
create or replace function public.review_store(p_store_id bigint,p_approve boolean,p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare s public.stores; reviewer uuid:=auth.uid();
begin
  if reviewer is null then raise exception 'authentication required'; end if;
  if not p_approve and nullif(btrim(coalesce(p_note,'')),'') is null then raise exception 'rejection reason required'; end if;
  select * into s from public.stores where store_id=p_store_id and approval_status='pending' for update;
  if not found then raise exception 'store is not pending'; end if;
  if s.manager_id=(select owner_id from public.markets where market_id=s.market_id) then
    if not (select private.is_admin(reviewer)) then raise exception 'owner self-application requires platform admin'; end if;
  elsif not (select private.market_owner(s.market_id,reviewer)) and not (select private.is_admin(reviewer)) then
    raise exception 'forbidden';
  end if;
  update public.stores set approval_status=case when p_approve then 'approved' else 'rejected' end,
    approval_note=nullif(btrim(coalesce(p_note,'')),''),updated_at=now() where store_id=p_store_id;
  if p_approve then
    insert into public.seller_listings(store_id,seller_id) values(p_store_id,s.manager_id) on conflict do nothing;
  end if;
  insert into public.approval_events(entity_type,entity_id,action,actor_id,note)
  values('store',p_store_id,case when p_approve then 'approved' else 'rejected' end,reviewer,nullif(btrim(coalesce(p_note,'')),''));
  insert into public.admin_audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values(reviewer,'review_store','store',p_store_id,jsonb_build_object('approved',p_approve,'note',p_note));
end
$$;

create or replace function public.review_store_seller(p_application_id bigint,p_approve boolean,p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare a public.store_seller_applications; mid bigint; owner uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not p_approve and nullif(btrim(coalesce(p_note,'')),'') is null then raise exception 'rejection reason required'; end if;
  select * into a from public.store_seller_applications where application_id=p_application_id and status='pending' for update;
  if not found then raise exception 'application is not pending'; end if;
  select s.market_id,m.owner_id into mid,owner from public.stores s join public.markets m on m.market_id=s.market_id where s.store_id=a.store_id;
  if a.applicant_id=owner then
    if not (select private.is_admin()) then raise exception 'owner self-application requires platform admin'; end if;
  elsif auth.uid()<>owner and not (select private.is_admin()) then raise exception 'forbidden'; end if;
  update public.store_seller_applications
    set status=case when p_approve then 'approved' else 'rejected' end,reviewed_by=auth.uid(),reviewed_at=now(),review_note=nullif(btrim(coalesce(p_note,'')),'')
    where application_id=p_application_id;
  if p_approve then insert into public.seller_listings(store_id,seller_id) values(a.store_id,a.applicant_id) on conflict do nothing; end if;
  insert into public.approval_events(entity_type,entity_id,action,actor_id,note)
    values('seller',p_application_id,case when p_approve then 'approved' else 'rejected' end,auth.uid(),nullif(btrim(coalesce(p_note,'')),''));
  insert into public.admin_audit_logs(actor_id,action,entity_type,entity_id,metadata)
    values(auth.uid(),'review_store_seller','seller',p_application_id,jsonb_build_object('approved',p_approve,'note',p_note));
end
$$;

-- Keep stock mutation scoped to the listing owner even if catalog rows are
-- visible for aggregate availability in V1.
create or replace function public.update_my_listing_stock(p_listing_id bigint,p_stock_quantity integer,p_status text default 'active')
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_stock_quantity<0 or p_status not in ('active','paused') then raise exception 'invalid stock/status'; end if;
  update public.seller_listings l
    set stock_quantity=p_stock_quantity,status=p_status,updated_at=now()
    where l.listing_id=p_listing_id and l.seller_id=auth.uid() and l.reserved_quantity<=p_stock_quantity;
  if not found then raise exception 'listing not found or stock below reserved quantity'; end if;
end
$$;

drop function if exists public.create_cod_order(bigint,bigint,jsonb);
create function public.create_cod_order(
  p_market_id bigint,
  p_address_id bigint,
  p_items jsonb,
  p_fulfillment_method text default 'delivery',
  p_lat double precision default null,
  p_lng double precision default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  oid bigint; item jsonb; s public.stores; q int; remaining int; total numeric=0; oi bigint;
  l record; take int; active_count int; share int; origin extensions.geography;
  destination extensions.geography; pickup_km numeric;
begin
  if auth.uid() is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'invalid order'; end if;
  if p_fulfillment_method not in ('delivery','pickup') then raise exception 'invalid fulfillment method'; end if;

  if p_fulfillment_method='delivery' then
    if p_address_id is null or not exists(select 1 from public.user_addresses where address_id=p_address_id and user_id=auth.uid()) then
      raise exception 'invalid address';
    end if;
  else
    select m.geography into destination from public.markets m where m.market_id=p_market_id and m.approval_status='approved';
    if destination is null then raise exception 'market unavailable'; end if;
    if p_lat is not null and p_lng is not null and p_lat between -90 and 90 and p_lng between -180 and 180 then
      origin=extensions.st_setsrid(extensions.st_makepoint(p_lng,p_lat),4326)::extensions.geography;
    else
      select ul.geography into origin from public.user_locations ul where ul.user_id=auth.uid();
    end if;
    if origin is null then raise exception 'location unavailable'; end if;
    pickup_km=round((extensions.st_distance(origin,destination)/1000)::numeric,2);
    if pickup_km>10 then raise exception 'pickup is limited to 10 km'; end if;
  end if;

  insert into public.orders(buyer_id,address_id,market_id,total_amount,fulfillment_method,pickup_distance_km)
    values(auth.uid(),case when p_fulfillment_method='delivery' then p_address_id else null end,p_market_id,0,p_fulfillment_method,pickup_km)
    returning order_id into oid;

  for item in select * from jsonb_array_elements(p_items) loop
    q=(item->>'quantity')::int; if q<=0 then raise exception 'invalid quantity'; end if;
    select * into s from public.stores where store_id=(item->>'store_id')::bigint and market_id=p_market_id and approval_status='approved' for share;
    if not found then raise exception 'invalid store'; end if;
    if (select coalesce(sum(stock_quantity-reserved_quantity),0) from public.seller_listings where store_id=s.store_id and status='active')<q then
      raise exception 'insufficient stock for store %',s.store_id;
    end if;
    insert into public.order_items(order_id,store_id,product_name,unit,unit_price,quantity,total_amount)
      values(oid,s.store_id,s.product_name,s.unit,s.unit_price,q,s.unit_price*q) returning order_item_id into oi;
    total=total+s.unit_price*q; remaining=q;
    while remaining>0 loop
      select count(*) into active_count from public.seller_listings where store_id=s.store_id and status='active' and stock_quantity>reserved_quantity;
      if active_count=0 then raise exception 'stock changed during allocation'; end if;
      share=ceil(remaining::numeric/active_count)::int;
      for l in select listing_id,seller_id,stock_quantity-reserved_quantity available
        from public.seller_listings where store_id=s.store_id and status='active' and stock_quantity>reserved_quantity
        order by last_allocated_at nulls first,listing_id for update loop
        exit when remaining=0;
        take=least(l.available,share,remaining); if take<=0 then continue; end if;
        update public.seller_listings set reserved_quantity=reserved_quantity+take,updated_at=now() where listing_id=l.listing_id;
        insert into public.order_allocations(order_item_id,listing_id,seller_id,quantity) values(oi,l.listing_id,l.seller_id,take)
          on conflict(order_item_id,listing_id) do update set quantity=public.order_allocations.quantity+excluded.quantity,updated_at=now();
        remaining=remaining-take;
      end loop;
    end loop;
    update public.seller_listings sl set last_allocated_at=clock_timestamp()+(a.quantity*interval '1 microsecond')
      from public.order_allocations a where a.order_item_id=oi and a.listing_id=sl.listing_id;
  end loop;
  update public.orders set total_amount=total where order_id=oid;
  delete from public.carts where buyer_id=auth.uid();
  return oid;
end
$$;

create or replace function private.transition_allocation(p_allocation bigint,p_from text,p_to text,p_actor uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare oid bigint;
begin
  update public.order_allocations set status=p_to,updated_at=now() where allocation_id=p_allocation and status=p_from;
  if not found then raise exception 'invalid allocation transition'; end if;
  insert into public.allocation_status_events(allocation_id,from_status,to_status,actor_id)
    values(p_allocation,p_from,p_to,p_actor) on conflict do nothing;
  select i.order_id into oid from public.order_allocations a join public.order_items i on i.order_item_id=a.order_item_id where a.allocation_id=p_allocation;
  if p_to='ready_for_pickup' then
    update public.orders set status='preparing',updated_at=now() where order_id=oid and status='awaiting_preparation';
  end if;
  if p_to='at_hub' and not exists(
    select 1 from public.order_allocations a join public.order_items i on i.order_item_id=a.order_item_id
    where i.order_id=oid and a.status<>'at_hub'
  ) then
    update public.orders
      set status='at_hub',pickup_ready_at=case when fulfillment_method='pickup' then now() else pickup_ready_at end,updated_at=now()
      where order_id=oid and status in ('awaiting_preparation','preparing');
  end if;
end
$$;

create or replace function public.consolidate_order(p_order_id bigint)
returns void language plpgsql security definer set search_path=''
as $$
declare mid bigint;
begin
  select market_id into mid from public.orders where order_id=p_order_id and status='at_hub' and fulfillment_method='delivery';
  if mid is null then raise exception 'delivery order is not ready to consolidate'; end if;
  if not (select private.market_owner(mid)) and not (select private.is_admin()) then raise exception 'forbidden'; end if;
  if exists(select 1 from public.order_allocations a join public.order_items i on i.order_item_id=a.order_item_id where i.order_id=p_order_id and a.status<>'at_hub') then
    raise exception 'all allocations must be at hub';
  end if;
  update public.orders set status='consolidated',updated_at=now() where order_id=p_order_id;
end
$$;

create or replace function public.ship_order(p_order_id bigint,p_tracking_number text,p_courier_name text)
returns void language plpgsql security definer set search_path=''
as $$
declare mid bigint;
begin
  if nullif(btrim(p_tracking_number),'') is null then raise exception 'tracking number required'; end if;
  select market_id into mid from public.orders where order_id=p_order_id and status='consolidated' and fulfillment_method='delivery';
  if mid is null then raise exception 'order is not consolidated'; end if;
  if not (select private.market_owner(mid)) and not (select private.is_admin()) then raise exception 'forbidden'; end if;
  update public.orders set status='shipped',tracking_number=btrim(p_tracking_number),courier_name=btrim(p_courier_name),shipped_at=now(),updated_at=now()
    where order_id=p_order_id;
end
$$;

create or replace function public.confirm_delivery(p_order_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.orders o
  set status='delivered',payment_status='collected',delivered_at=now(),updated_at=now()
  where o.order_id=p_order_id and o.buyer_id=auth.uid()
    and ((o.fulfillment_method='delivery' and o.status='shipped')
      or (o.fulfillment_method='pickup' and o.status='at_hub'));
  if not found then raise exception 'forbidden or invalid state'; end if;

  update public.seller_listings l
  set reserved_quantity=greatest(0,l.reserved_quantity-allocation.allocated_quantity),
      fulfilled_quantity=l.fulfilled_quantity+allocation.allocated_quantity
  from (
    select oa.listing_id,sum(oa.quantity)::integer allocated_quantity
    from public.order_allocations oa join public.order_items oi on oi.order_item_id=oa.order_item_id
    where oi.order_id=p_order_id group by oa.listing_id
  ) allocation
  where l.listing_id=allocation.listing_id;
end
$$;

revoke execute on function public.update_market(bigint,text,text,text,text) from public,anon;
revoke execute on function public.update_store(bigint,text,text,text,text,numeric,text) from public,anon;
revoke execute on function public.get_store_request_detail(bigint) from public,anon;
revoke execute on function public.get_pickup_eligibility(bigint,double precision,double precision) from public,anon;
revoke execute on function public.create_cod_order(bigint,bigint,jsonb,text,double precision,double precision) from public,anon;
revoke execute on function public.update_my_listing_stock(bigint,integer,text) from public,anon;
revoke execute on function public.review_store(bigint,boolean,text) from public,anon;
revoke execute on function public.review_store_seller(bigint,boolean,text) from public,anon;
revoke execute on function public.consolidate_order(bigint) from public,anon;
revoke execute on function public.ship_order(bigint,text,text) from public,anon;
revoke execute on function public.confirm_delivery(bigint) from public,anon;

grant execute on function public.update_market(bigint,text,text,text,text) to authenticated;
grant execute on function public.update_store(bigint,text,text,text,text,numeric,text) to authenticated;
grant execute on function public.get_store_request_detail(bigint) to authenticated;
grant execute on function public.get_pickup_eligibility(bigint,double precision,double precision) to authenticated;
grant execute on function public.create_cod_order(bigint,bigint,jsonb,text,double precision,double precision) to authenticated;
grant execute on function public.update_my_listing_stock(bigint,integer,text) to authenticated;
grant execute on function public.review_store(bigint,boolean,text) to authenticated;
grant execute on function public.review_store_seller(bigint,boolean,text) to authenticated;
grant execute on function public.consolidate_order(bigint) to authenticated;
grant execute on function public.ship_order(bigint,text,text) to authenticated;
grant execute on function public.confirm_delivery(bigint) to authenticated;
