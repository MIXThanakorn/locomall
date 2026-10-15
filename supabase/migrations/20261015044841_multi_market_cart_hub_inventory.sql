-- Refuse a busy deployment rather than racing old stock writers. This short
-- migration runs atomically; no live order/checkout may cross its boundary.
lock table public.orders,public.order_allocations,public.seller_listings,public.carts,public.cart_items in access exclusive mode nowait;

-- One buyer basket, grouped by each item's store.market_id. carts.market_id is
-- only a compatibility hint, never the authoritative market of every item.
alter table public.carts drop constraint if exists carts_market_id_fkey;
alter table public.carts add constraint carts_market_id_fkey foreign key(market_id)
  references public.markets(market_id) on delete set null;

create or replace function private.set_my_cart_quantity(p_store_id bigint,p_quantity integer,p_increment boolean)
returns integer language plpgsql security definer set search_path='' as $$
declare cid bigint; mid bigint; available bigint; q integer;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_quantity is null or p_quantity<1 or p_quantity>999 then raise exception 'invalid cart quantity'; end if;
  select s.market_id into mid from public.stores s join public.markets m on m.market_id=s.market_id
    where s.store_id=p_store_id and s.approval_status='approved' and m.approval_status='approved' for share of s,m;
  if not found then raise exception 'store unavailable'; end if;
  insert into public.carts(buyer_id,market_id) values(auth.uid(),mid) on conflict(buyer_id) do nothing;
  select cart_id into cid from public.carts where buyer_id=auth.uid() for update;
  select case when p_increment then coalesce((select quantity from public.cart_items where cart_id=cid and store_id=p_store_id),0)+p_quantity else p_quantity end into q;
  if q>999 then raise exception 'invalid cart quantity'; end if;
  select coalesce(sum(stock_quantity-reserved_quantity),0) into available
    from public.seller_listings where store_id=p_store_id and status='active';
  if q>available then raise exception 'requested quantity exceeds available stock'; end if;
  -- Adding to a cart neither reserves nor deducts stock. Checkout revalidates it.
  insert into public.cart_items(cart_id,store_id,quantity) values(cid,p_store_id,q)
    on conflict(cart_id,store_id) do update set quantity=excluded.quantity;
  update public.carts set market_id=mid,updated_at=now() where cart_id=cid;
  return q;
end $$;
create or replace function public.increment_cart_item(p_store_id bigint,p_increment integer default 1)
returns integer language sql security invoker set search_path='' as $$
  select private.set_my_cart_quantity(p_store_id,p_increment,true)
$$;
create or replace function public.upsert_cart_item(p_store_id bigint,p_quantity integer)
returns void language plpgsql security invoker set search_path='' as $$
begin perform private.set_my_cart_quantity(p_store_id,p_quantity,false); end $$;
revoke all on function private.set_my_cart_quantity(bigint,integer,boolean),public.increment_cart_item(bigint,integer),public.upsert_cart_item(bigint,integer) from public,anon;
grant execute on function private.set_my_cart_quantity(bigint,integer,boolean),public.increment_cart_item(bigint,integer),public.upsert_cart_item(bigint,integer) to authenticated;

-- Marker distinguishes old delivered inventory from reservations still in flight.
alter table public.order_allocations add column stock_deducted_at timestamptz;
comment on column public.order_allocations.stock_deducted_at is 'Physical stock deducted at hub; retained on admin cancellation. Not a delivery/settlement marker.';
update public.order_allocations a set stock_deducted_at=coalesce(o.delivered_at,now())
  from public.order_items i join public.orders o on o.order_id=i.order_id
  where a.order_item_id=i.order_item_id and o.status='delivered';
-- Existing hub/shipped orders must cross the accounting boundary exactly once.
-- All changes share this migration transaction; mismatch aborts instead of clamping.
do $$
declare sale record;
begin
  for sale in select a.listing_id,sum(a.quantity)::integer q from public.order_allocations a
    join public.order_items i on i.order_item_id=a.order_item_id join public.orders o on o.order_id=i.order_id
    where a.stock_deducted_at is null and a.status='at_hub' and o.status not in ('cancelled','delivered')
    group by a.listing_id order by a.listing_id
  loop
    update public.seller_listings set stock_quantity=stock_quantity-sale.q,reserved_quantity=reserved_quantity-sale.q,updated_at=now()
      where listing_id=sale.listing_id and stock_quantity>=sale.q and reserved_quantity>=sale.q;
    if not found then raise exception 'stock reservation mismatch during hub migration'; end if;
  end loop;
  update public.order_allocations a set stock_deducted_at=now()
    from public.order_items i join public.orders o on o.order_id=i.order_id
    where a.order_item_id=i.order_item_id and a.stock_deducted_at is null and a.status='at_hub'
      and o.status not in ('cancelled','delivered');
end $$;

-- Shared order lock serializes handoff/hub arrivals against cancellation and
-- receipt. Every normal transition uses order -> allocation -> listing order.
create or replace function private.transition_allocation(p_allocation bigint,p_from text,p_to text,p_actor uuid)
returns void language plpgsql security definer set search_path='' as $$
declare oid bigint; parent public.orders; a public.order_allocations;
begin
  if auth.uid() is null or p_actor is distinct from auth.uid() then raise exception 'authentication required'; end if;
  select i.order_id into oid from public.order_allocations x join public.order_items i on i.order_item_id=x.order_item_id where x.allocation_id=p_allocation;
  select * into parent from public.orders where order_id=oid for update;
  if not found or parent.status in ('cancelled','delivered') then raise exception 'invalid allocation transition'; end if;
  select * into a from public.order_allocations where allocation_id=p_allocation for update;
  if p_to in ('preparing','ready_for_pickup') then
    if a.seller_id is distinct from auth.uid() then raise exception 'forbidden'; end if;
  elsif p_to in ('collected','at_hub') then
    if not coalesce(private.market_owner(parent.market_id),false) and not coalesce(private.is_admin(),false) then raise exception 'forbidden'; end if;
  else raise exception 'invalid allocation transition'; end if;
  if (p_from,p_to) not in (('awaiting_preparation','preparing'),('preparing','ready_for_pickup'),('ready_for_pickup','collected'),('collected','at_hub')) then raise exception 'invalid allocation transition'; end if;
  if a.status=p_to then return; end if;
  if a.status<>p_from then raise exception 'invalid allocation transition'; end if;
  if p_to='at_hub' and a.stock_deducted_at is null then
    update public.seller_listings set stock_quantity=stock_quantity-a.quantity,reserved_quantity=reserved_quantity-a.quantity,updated_at=now()
      where listing_id=a.listing_id and reserved_quantity>=a.quantity and stock_quantity>=a.quantity;
    if not found then raise exception 'stock reservation mismatch'; end if;
  end if;
  update public.order_allocations set status=p_to,updated_at=now(),
    stock_deducted_at=case when p_to='at_hub' then coalesce(stock_deducted_at,now()) else stock_deducted_at end
    where allocation_id=p_allocation;
  insert into public.allocation_status_events(allocation_id,from_status,to_status,actor_id)
    values(p_allocation,p_from,p_to,p_actor) on conflict do nothing;
  if p_to in ('preparing','ready_for_pickup') then
    update public.orders set status='preparing',updated_at=now() where order_id=oid and status='awaiting_preparation';
  end if;
  if p_to='at_hub' and not exists(select 1 from public.order_allocations x join public.order_items i on i.order_item_id=x.order_item_id where i.order_id=oid and x.status<>'at_hub') then
    update public.orders set status='at_hub',pickup_ready_at=case when fulfillment_method='pickup' then now() else pickup_ready_at end,updated_at=now()
      where order_id=oid and status in ('awaiting_preparation','preparing');
  end if;
end $$;
revoke all on function private.transition_allocation(bigint,text,text,uuid) from public,anon,authenticated;

create or replace function private.accept_allocation(p_allocation_id bigint)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  perform private.transition_allocation(p_allocation_id,'awaiting_preparation','preparing',auth.uid());
end $$;
create or replace function public.accept_allocation(p_allocation_id bigint)
returns void language sql security invoker set search_path='' as $$ select private.accept_allocation(p_allocation_id) $$;
revoke all on function private.accept_allocation(bigint),public.accept_allocation(bigint) from public,anon;
grant execute on function private.accept_allocation(bigint),public.accept_allocation(bigint) to authenticated;

create or replace function private.confirm_delivery(p_order_id bigint)
returns void language plpgsql security definer set search_path='' as $$
declare parent public.orders; sale record;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into parent from public.orders where order_id=p_order_id for update;
  if not found or parent.buyer_id is distinct from auth.uid() then raise exception 'forbidden or invalid state'; end if;
  if parent.status='delivered' then return; end if;
  if not ((parent.fulfillment_method='delivery' and parent.status='shipped') or (parent.fulfillment_method='pickup' and parent.status='at_hub')) then raise exception 'forbidden or invalid state'; end if;
  if not exists(select 1 from public.order_items i join public.order_allocations a on a.order_item_id=i.order_item_id where i.order_id=p_order_id)
    or exists(select 1 from public.order_items i join public.order_allocations a on a.order_item_id=i.order_item_id where i.order_id=p_order_id and (a.stock_deducted_at is null or a.status<>'at_hub')) then raise exception 'stock reservation mismatch'; end if;
  -- Inventory already left the seller at the hub. Receipt only records sales.
  for sale in select a.listing_id,sum(a.quantity)::integer q from public.order_items i
    join public.order_allocations a on a.order_item_id=i.order_item_id where i.order_id=p_order_id
    group by a.listing_id order by a.listing_id
  loop
    update public.seller_listings set fulfilled_quantity=fulfilled_quantity+sale.q,updated_at=now() where listing_id=sale.listing_id;
  end loop;
  update public.orders set status='delivered',payment_status='collected',delivered_at=now(),updated_at=now() where order_id=p_order_id;
end $$;
create or replace function public.confirm_delivery(p_order_id bigint)
returns void language sql security invoker set search_path='' as $$ select private.confirm_delivery(p_order_id) $$;
revoke all on function private.confirm_delivery(bigint),public.confirm_delivery(bigint) from public,anon;
grant execute on function private.confirm_delivery(bigint),public.confirm_delivery(bigint) to authenticated;

create or replace function private.cancel_order(p_order_id bigint,p_reason text,p_admin_override boolean)
returns void language plpgsql security definer set search_path='' as $$
declare parent public.orders; sale record; admin_override boolean;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  admin_override:=coalesce(p_admin_override,false) and coalesce(private.is_admin(),false);
  select * into parent from public.orders where order_id=p_order_id for update;
  if not found or (parent.buyer_id is distinct from auth.uid() and not admin_override) then raise exception 'forbidden'; end if;
  if parent.status='cancelled' then return; end if;
  if parent.status='delivered' then raise exception 'forbidden or too late to cancel'; end if;
  if not admin_override and (parent.status not in ('awaiting_preparation','preparing') or exists(
    select 1 from public.order_items i join public.order_allocations a on a.order_item_id=i.order_item_id
    where i.order_id=p_order_id and (a.status in ('collected','at_hub') or a.stock_deducted_at is not null)
  )) then raise exception 'order cancellation closed after seller handoff'; end if;
  if admin_override and nullif(btrim(p_reason),'') is null then raise exception 'cancellation reason required'; end if;
  -- Only uncommitted reservations are released. Hub stock is NOT silently
  -- restocked at the seller by an admin override; physical return is separate.
  for sale in select a.listing_id,sum(a.quantity)::integer q from public.order_items i
    join public.order_allocations a on a.order_item_id=i.order_item_id
    where i.order_id=p_order_id and a.stock_deducted_at is null group by a.listing_id order by a.listing_id
  loop
    update public.seller_listings set reserved_quantity=reserved_quantity-sale.q,updated_at=now()
      where listing_id=sale.listing_id and reserved_quantity>=sale.q;
    if not found then raise exception 'stock reservation mismatch'; end if;
  end loop;
  update public.order_allocations a set status='cancelled',updated_at=now() from public.order_items i where i.order_item_id=a.order_item_id and i.order_id=p_order_id;
  update public.orders set status='cancelled',payment_status='failed',updated_at=now() where order_id=p_order_id;
  if admin_override then insert into public.admin_audit_logs(actor_id,action,entity_type,entity_id,metadata)
    values(auth.uid(),'cancel_order','order',p_order_id,jsonb_build_object('reason',p_reason,'hub_stock_not_restocked',true)); end if;
end $$;
create or replace function public.cancel_order(p_order_id bigint,p_reason text default null,p_admin_override boolean default false)
returns void language sql security invoker set search_path='' as $$ select private.cancel_order(p_order_id,p_reason,p_admin_override) $$;
revoke all on function private.cancel_order(bigint,text,boolean),public.cancel_order(bigint,text,boolean) from public,anon;
grant execute on function private.cancel_order(bigint,text,boolean),public.cancel_order(bigint,text,boolean) to authenticated;

create or replace function private.create_cod_order(
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
  if auth.uid() is null or coalesce(jsonb_typeof(p_items),'')<>'array' or jsonb_array_length(p_items)=0 then raise exception 'invalid order'; end if;
  perform 1 from public.carts where buyer_id=auth.uid() for update;
  if not exists(select 1 from public.markets where market_id=p_market_id and approval_status='approved') then raise exception 'market unavailable'; end if;
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

  for item in select value from jsonb_array_elements(p_items) order by (value->>'store_id')::bigint loop
    q=(item->>'quantity')::int; if q is null or q<=0 then raise exception 'invalid quantity'; end if;
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
  delete from public.cart_items ci using public.carts c, public.stores basket_store
    where ci.cart_id=c.cart_id and c.buyer_id=auth.uid() and basket_store.store_id=ci.store_id and basket_store.market_id=p_market_id
      and ci.store_id in (select (value->>'store_id')::bigint from jsonb_array_elements(p_items));
  update public.carts c set updated_at=now(),market_id=(
    select basket_store.market_id from public.cart_items ci join public.stores basket_store on basket_store.store_id=ci.store_id
    where ci.cart_id=c.cart_id order by ci.cart_item_id limit 1
  ) where c.buyer_id=auth.uid();
  return oid;
end
$$;

create or replace function public.create_cod_order(
  p_market_id bigint,p_address_id bigint,p_items jsonb,p_fulfillment_method text default 'delivery',
  p_lat double precision default null,p_lng double precision default null
)
returns bigint language sql security invoker set search_path='' as $$
  select private.create_cod_order(p_market_id,p_address_id,p_items,p_fulfillment_method,p_lat,p_lng)
$$;
revoke all on function private.create_cod_order(bigint,bigint,jsonb,text,double precision,double precision),
  public.create_cod_order(bigint,bigint,jsonb,text,double precision,double precision) from public,anon;
grant execute on function private.create_cod_order(bigint,bigint,jsonb,text,double precision,double precision),
  public.create_cod_order(bigint,bigint,jsonb,text,double precision,double precision) to authenticated;
