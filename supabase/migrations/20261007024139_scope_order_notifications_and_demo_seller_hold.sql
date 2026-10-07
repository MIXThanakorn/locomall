-- Route order events by the actor and recipient, not merely by membership in an order.
-- Historical notification rows are deliberately left untouched.
create or replace function private.notify_order_status_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_title text;
  v_seller_id uuid;
begin
  if old.status is not distinct from new.status then return new; end if;
  v_title := 'สถานะของออเดอร์ #' || coalesce(nullif(right(new.order_number, 8), ''), new.order_id::text);

  -- Only seller-initiated preparation is sent to the buyer. Hub/market-owner
  -- transitions and the buyer's own receipt confirmation do not notify them.
  if new.status = 'preparing' and auth.uid() is distinct from new.buyer_id
    and exists (
      select 1 from public.order_allocations a
      join public.order_items i on i.order_item_id = a.order_item_id
      where i.order_id = new.order_id and a.seller_id = auth.uid()
    ) then
    insert into public.notifications(user_id, type, category, title, body, entity_type, entity_id)
    values(new.buyer_id, 'order_status', 'order', v_title,
      'ผู้ขายกำลังเตรียมสินค้า', 'order', new.order_id);
  elsif new.status = 'delivered' and auth.uid() = new.buyer_id then
    -- A seller sees only the buyer's final confirmation, never their own updates.
    for v_seller_id in
      select distinct a.seller_id from public.order_allocations a
      join public.order_items i on i.order_item_id = a.order_item_id
      where i.order_id = new.order_id and a.seller_id <> new.buyer_id
    loop
      insert into public.notifications(user_id, type, category, title, body, entity_type, entity_id)
      values(v_seller_id, 'order_status', 'order', v_title,
        'ผู้ซื้อยืนยันรับสินค้าแล้ว', 'order', new.order_id);
    end loop;
  end if;
  return new;
end $$;

create or replace function private.notify_allocation_ready()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid;
  v_buyer uuid;
  v_order_id bigint;
  v_order_number text;
  v_product_name text;
  v_title text;
begin
  if old.status is not distinct from new.status
    or new.status not in ('ready_for_pickup', 'at_hub') then return new; end if;

  select m.owner_id, o.buyer_id, o.order_id, o.order_number, i.product_name
  into v_owner, v_buyer, v_order_id, v_order_number, v_product_name
  from public.order_items i
  join public.orders o on o.order_id = i.order_id
  join public.markets m on m.market_id = o.market_id
  where i.order_item_id = new.order_item_id;
  v_title := 'สถานะของออเดอร์ #' || coalesce(nullif(right(v_order_number, 8), ''), v_order_id::text);

  if new.status = 'ready_for_pickup' and auth.uid() = new.seller_id
    and v_buyer is distinct from new.seller_id then
    insert into public.notifications(user_id, type, category, title, body, entity_type, entity_id)
    values(v_buyer, 'order_status', 'order', v_title,
      'ผู้ขายเตรียม ' || coalesce(v_product_name, 'สินค้า') || ' เสร็จแล้ว',
      'order', v_order_id);
  elsif new.status = 'at_hub' and v_owner is not null
    and not exists (
      select 1 from public.order_allocations a
      join public.order_items i on i.order_item_id = a.order_item_id
      where i.order_id = v_order_id and a.status <> 'at_hub'
    ) and not exists (
      select 1 from public.notifications n
      where n.user_id = v_owner and n.type = 'order_all_at_hub'
        and n.entity_type = 'order' and n.entity_id = v_order_id
    ) then
    insert into public.notifications(user_id, type, category, title, body, entity_type, entity_id)
    values(v_owner, 'order_all_at_hub', 'order', v_title,
      'ผู้ขายทุกรายส่งสินค้าถึงจุดรวมแล้ว', 'order', v_order_id);
  end if;
  return new;
end $$;

-- Show the seller's paid but undelivered allocation without releasing it to
-- settlement. This is computed from existing transactional order state, so
-- cancellation/refund needs no second mutable balance to reconcile.
create or replace function public.get_my_demo_seller_held()
returns numeric language sql stable security invoker set search_path = '' as $$
  select coalesce(sum(a.quantity * i.unit_price), 0)::numeric(12,2)
  from public.order_allocations a
  join public.order_items i on i.order_item_id = a.order_item_id
  join public.orders o on o.order_id = i.order_id
  where a.seller_id = (select auth.uid())
    and o.payment_method = 'demo_wallet' and o.payment_status = 'demo_paid'
    and o.status not in ('delivered', 'cancelled')
$$;

-- Only a paid demo-wallet order creates a demo settlement. COD must not mint
-- virtual seller credit when its buyer confirms receipt.
create or replace function private.post_demo_order_finance()
returns trigger language plpgsql security definer set search_path = '' as $$
declare sale record;
begin
  if old.status is not distinct from new.status then return new; end if;
  if new.status = 'cancelled' and new.payment_method = 'demo_wallet' then
    insert into public.demo_accounts(user_id) values(new.buyer_id) on conflict do nothing;
    update public.demo_accounts set wallet_balance = wallet_balance + new.total_amount, updated_at = now()
      where user_id = new.buyer_id;
    insert into public.demo_ledger(user_id, entry_type, wallet_delta, order_id)
      values(new.buyer_id, 'refund', new.total_amount, new.order_id);
  elsif new.status = 'delivered' and new.payment_method = 'demo_wallet'
    and new.payment_status = 'demo_paid' then
    for sale in
      select a.seller_id, sum(a.quantity * i.unit_price)::numeric(12,2) amount
      from public.order_allocations a
      join public.order_items i on i.order_item_id = a.order_item_id
      where i.order_id = new.order_id
      group by a.seller_id order by a.seller_id
    loop
      insert into public.demo_accounts(user_id) values(sale.seller_id) on conflict do nothing;
      update public.demo_accounts set seller_pending = seller_pending + sale.amount, updated_at = now()
        where user_id = sale.seller_id;
      insert into public.demo_ledger(user_id, entry_type, seller_delta, order_id)
        values(sale.seller_id, 'seller_sale', sale.amount, new.order_id);
    end loop;
  end if;
  return new;
end $$;

revoke execute on function private.notify_order_status_change() from public, anon, authenticated;
revoke execute on function private.notify_allocation_ready() from public, anon, authenticated;
revoke execute on function private.post_demo_order_finance() from public, anon, authenticated;
revoke execute on function public.get_my_demo_seller_held() from public, anon;
grant execute on function public.get_my_demo_seller_held() to authenticated;
