-- Guest catalog policies must never call private authorization helpers. Those
-- helpers intentionally remain unavailable to anon; public catalog access is
-- limited to approved rows, while authenticated users get relationship-aware
-- access through a separate policy.
drop policy if exists markets_catalog on public.markets;
drop policy if exists markets_public_catalog on public.markets;
drop policy if exists markets_authenticated_catalog on public.markets;

create policy markets_public_catalog
on public.markets for select to anon
using (approval_status = 'approved');

create policy markets_authenticated_catalog
on public.markets for select to authenticated
using (
  approval_status = 'approved'
  or owner_id = (select auth.uid())
  or (select private.is_admin())
);

drop policy if exists stores_catalog on public.stores;
drop policy if exists stores_public_catalog on public.stores;
drop policy if exists stores_authenticated_catalog on public.stores;

create policy stores_public_catalog
on public.stores for select to anon
using (approval_status = 'approved');

create policy stores_authenticated_catalog
on public.stores for select to authenticated
using (
  approval_status = 'approved'
  or manager_id = (select auth.uid())
  or (select private.is_admin())
  or (select private.market_owner(market_id))
);

-- Qualify allocation quantities so PostgreSQL never confuses
-- order_allocations.quantity with order_items.quantity.
create or replace function public.confirm_delivery(p_order_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.orders o
  set status = 'delivered',
      payment_status = 'collected',
      delivered_at = now(),
      updated_at = now()
  where o.order_id = p_order_id
    and o.buyer_id = auth.uid()
    and o.status = 'shipped';

  if not found then
    raise exception 'forbidden or invalid state';
  end if;

  update public.seller_listings l
  set reserved_quantity = greatest(0, l.reserved_quantity - allocation.allocated_quantity),
      fulfilled_quantity = l.fulfilled_quantity + allocation.allocated_quantity
  from (
    select oa.listing_id, sum(oa.quantity)::integer as allocated_quantity
    from public.order_allocations oa
    join public.order_items oi on oi.order_item_id = oa.order_item_id
    where oi.order_id = p_order_id
    group by oa.listing_id
  ) allocation
  where l.listing_id = allocation.listing_id;
end
$$;

create or replace function public.cancel_order(
  p_order_id bigint,
  p_reason text default null,
  p_admin_override boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.orders o
    where o.order_id = p_order_id
      and (
        (o.buyer_id = auth.uid() and o.status in ('awaiting_preparation','preparing','at_hub','consolidated'))
        or (p_admin_override and (select private.is_admin()))
      )
  ) then
    raise exception 'forbidden or too late to cancel';
  end if;

  update public.orders o
  set status = 'cancelled', payment_status = 'failed', updated_at = now()
  where o.order_id = p_order_id and o.status <> 'cancelled';

  if not found then
    return;
  end if;

  update public.seller_listings l
  set reserved_quantity = greatest(0, l.reserved_quantity - allocation.allocated_quantity)
  from (
    select oa.listing_id, sum(oa.quantity)::integer as allocated_quantity
    from public.order_allocations oa
    join public.order_items oi on oi.order_item_id = oa.order_item_id
    where oi.order_id = p_order_id
    group by oa.listing_id
  ) allocation
  where l.listing_id = allocation.listing_id;

  update public.order_allocations oa
  set status = 'cancelled', updated_at = now()
  from public.order_items oi
  where oi.order_item_id = oa.order_item_id and oi.order_id = p_order_id;

  if p_admin_override then
    insert into public.admin_audit_logs(actor_id, action, entity_type, entity_id, metadata)
    values (auth.uid(), 'cancel_order', 'order', p_order_id, jsonb_build_object('reason', p_reason));
  end if;
end
$$;

revoke execute on function public.confirm_delivery(bigint) from public, anon;
revoke execute on function public.cancel_order(bigint,text,boolean) from public, anon;
grant execute on function public.confirm_delivery(bigint) to authenticated;
grant execute on function public.cancel_order(bigint,text,boolean) to authenticated;

-- Notify every Platform Admin once when a new Market request is created. A
-- retry reuses the pending Market and therefore does not duplicate alerts.
create or replace function public.apply_for_market(
  p_name text,
  p_description text,
  p_subdistrict_code text,
  p_hub_address text,
  p_image_url text default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  loc public.user_locations;
  mid bigint;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if nullif(btrim(p_name), '') is null or nullif(btrim(p_hub_address), '') is null then raise exception 'name and hub address are required'; end if;
  select * into loc from public.user_locations where user_id = auth.uid() and subdistrict_code = p_subdistrict_code;
  if not found then raise exception 'market must be in your primary subdistrict'; end if;

  select market_id into mid
  from public.markets
  where owner_id = auth.uid() and approval_status = 'pending'
  order by created_at desc
  limit 1
  for update;

  if mid is null then
    insert into public.markets(owner_id,name,description,image_url,province_code,district_code,subdistrict_code,geography,hub_address)
    values(auth.uid(),btrim(p_name),btrim(coalesce(p_description,'')),p_image_url,loc.province_code,loc.district_code,loc.subdistrict_code,loc.geography,btrim(p_hub_address))
    returning market_id into mid;

    insert into public.approval_events(entity_type,entity_id,action,actor_id)
    values('market',mid,'submitted',auth.uid());

    insert into public.notifications(user_id,type,title,body,entity_type,entity_id)
    select pr.user_id,'approval_request','คำขอเปิด Market ใหม่',
           'มีคำขอเปิด Market “'||btrim(p_name)||'” รอการตรวจสอบ','market',mid
    from public.platform_roles pr
    where pr.role = 'platform_admin';
  else
    update public.markets
    set name=btrim(p_name),description=btrim(coalesce(p_description,'')),hub_address=btrim(p_hub_address),
        province_code=loc.province_code,district_code=loc.district_code,subdistrict_code=loc.subdistrict_code,
        geography=loc.geography,image_url=coalesce(p_image_url,image_url),updated_at=now()
    where market_id=mid;
  end if;
  return mid;
end
$$;

revoke execute on function public.apply_for_market(text,text,text,text,text) from public, anon;
grant execute on function public.apply_for_market(text,text,text,text,text) to authenticated;
