-- Reserve units at checkout, then remove those units from on-hand stock only
-- when the buyer confirms receipt. Both counters must change together so
-- available stock (stock_quantity - reserved_quantity) never rebounds.
create or replace function public.confirm_delivery(p_order_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated_listings integer;
  v_allocated_listings integer;
begin
  update public.orders o
  set status = 'delivered', payment_status = 'collected', delivered_at = now(), updated_at = now()
  where o.order_id = p_order_id and o.buyer_id = auth.uid()
    and ((o.fulfillment_method = 'delivery' and o.status = 'shipped')
      or (o.fulfillment_method = 'pickup' and o.status = 'at_hub'));
  if not found then raise exception 'forbidden or invalid state'; end if;

  update public.seller_listings l
  set stock_quantity = l.stock_quantity - allocation.allocated_quantity,
      reserved_quantity = l.reserved_quantity - allocation.allocated_quantity,
      fulfilled_quantity = l.fulfilled_quantity + allocation.allocated_quantity,
      updated_at = now()
  from (
    select oa.listing_id, sum(oa.quantity)::integer as allocated_quantity
    from public.order_allocations oa
    join public.order_items oi on oi.order_item_id = oa.order_item_id
    where oi.order_id = p_order_id
    group by oa.listing_id
  ) allocation
  where l.listing_id = allocation.listing_id
    and l.reserved_quantity >= allocation.allocated_quantity
    and l.stock_quantity >= allocation.allocated_quantity;
  get diagnostics v_updated_listings = row_count;

  select count(*) into v_allocated_listings
  from (
    select oa.listing_id
    from public.order_allocations oa
    join public.order_items oi on oi.order_item_id = oa.order_item_id
    where oi.order_id = p_order_id
    group by oa.listing_id
  ) allocation;
  if v_allocated_listings = 0 or v_updated_listings <> v_allocated_listings then
    raise exception 'stock reservation mismatch';
  end if;
end
$$;

-- A completed sale has already consumed physical inventory. Cancelling it
-- must not release units reserved by unrelated, still-open orders.
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
declare
  v_status text;
  v_buyer_id uuid;
  v_updated_listings integer;
  v_allocated_listings integer;
begin
  select o.status, o.buyer_id into v_status, v_buyer_id
  from public.orders o where o.order_id = p_order_id for update;

  if v_status is null or v_status = 'delivered'
    or not ((v_buyer_id = auth.uid() and v_status in ('awaiting_preparation','preparing','at_hub','consolidated'))
      or (p_admin_override and (select private.is_admin()))) then
    raise exception 'forbidden or too late to cancel';
  end if;
  if v_status = 'cancelled' then return; end if;

  update public.orders o
  set status = 'cancelled', payment_status = 'failed', updated_at = now()
  where o.order_id = p_order_id;

  update public.seller_listings l
  set reserved_quantity = l.reserved_quantity - allocation.allocated_quantity,
      updated_at = now()
  from (
    select oa.listing_id, sum(oa.quantity)::integer as allocated_quantity
    from public.order_allocations oa
    join public.order_items oi on oi.order_item_id = oa.order_item_id
    where oi.order_id = p_order_id
    group by oa.listing_id
  ) allocation
  where l.listing_id = allocation.listing_id
    and l.reserved_quantity >= allocation.allocated_quantity;
  get diagnostics v_updated_listings = row_count;

  select count(*) into v_allocated_listings
  from (
    select oa.listing_id
    from public.order_allocations oa
    join public.order_items oi on oi.order_item_id = oa.order_item_id
    where oi.order_id = p_order_id
    group by oa.listing_id
  ) allocation;
  if v_allocated_listings = 0 or v_updated_listings <> v_allocated_listings then
    raise exception 'stock reservation mismatch';
  end if;

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
