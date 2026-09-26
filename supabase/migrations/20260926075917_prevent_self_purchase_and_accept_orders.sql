-- A seller must explicitly accept an allocation before preparing it. Also enforce
-- the no-self-purchase rule below the UI so direct Data API/RPC calls cannot bypass it.

alter table public.order_allocations
  drop constraint if exists order_allocations_status_check;
alter table public.order_allocations
  add constraint order_allocations_status_check
  check (status in ('awaiting_preparation','preparing','ready_for_pickup','collected','at_hub','cancelled'));
alter table public.order_allocations
  alter column status set default 'awaiting_preparation';

-- Existing allocations whose parent order has not started can enter the new
-- explicit acceptance step without changing work that is already underway.
update public.order_allocations allocation
set status='awaiting_preparation',updated_at=now()
from public.order_items item
join public.orders order_record on order_record.order_id=item.order_id
where allocation.order_item_id=item.order_item_id
  and allocation.status='preparing'
  and order_record.status='awaiting_preparation';

create or replace function private.reject_self_purchase()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare buyer uuid; target_store bigint;
begin
  if tg_table_name='cart_items' then
    select cart.buyer_id into buyer from public.carts cart where cart.cart_id=new.cart_id;
    target_store=new.store_id;
  else
    select order_record.buyer_id into buyer from public.orders order_record where order_record.order_id=new.order_id;
    target_store=new.store_id;
  end if;

  if exists(select 1 from public.stores store where store.store_id=target_store and store.manager_id=buyer)
     or exists(select 1 from public.seller_listings listing where listing.store_id=target_store and listing.seller_id=buyer) then
    raise exception 'cannot purchase from your own store';
  end if;
  return new;
end
$$;

revoke execute on function private.reject_self_purchase() from public,anon,authenticated;
drop trigger if exists reject_self_purchase_cart on public.cart_items;
create trigger reject_self_purchase_cart
before insert or update on public.cart_items
for each row execute function private.reject_self_purchase();
drop trigger if exists reject_self_purchase_order on public.order_items;
create trigger reject_self_purchase_order
before insert or update on public.order_items
for each row execute function private.reject_self_purchase();

create or replace function public.accept_allocation(p_allocation_id bigint)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare target_order bigint;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;

  update public.order_allocations allocation
  set status='preparing',updated_at=now()
  where allocation.allocation_id=p_allocation_id
    and allocation.seller_id=auth.uid()
    and allocation.status='awaiting_preparation'
  returning (
    select item.order_id from public.order_items item
    where item.order_item_id=allocation.order_item_id
  ) into target_order;
  if not found then raise exception 'forbidden or invalid allocation state'; end if;

  insert into public.allocation_status_events(allocation_id,from_status,to_status,actor_id)
  values(p_allocation_id,'awaiting_preparation','preparing',auth.uid())
  on conflict do nothing;

  update public.orders
  set status='preparing',updated_at=now()
  where order_id=target_order and status='awaiting_preparation';
end
$$;

revoke execute on function public.accept_allocation(bigint) from public,anon;
grant execute on function public.accept_allocation(bigint) to authenticated;

create or replace function public.delete_cancelled_order(p_order_id bigint,p_reason text)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare target public.orders;
begin
  if auth.uid() is null or not (select private.is_admin()) then raise exception 'forbidden'; end if;
  if nullif(btrim(p_reason),'') is null then raise exception 'deletion reason required'; end if;

  select * into target from public.orders where order_id=p_order_id and status='cancelled' for update;
  if not found then raise exception 'only cancelled orders can be deleted'; end if;

  insert into public.admin_audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'delete_cancelled_order','order',p_order_id,jsonb_build_object(
    'reason',btrim(p_reason),'order_number',target.order_number,'buyer_id',target.buyer_id,
    'market_id',target.market_id,'total_amount',target.total_amount,'created_at',target.created_at
  ));
  delete from public.orders where order_id=p_order_id;
end
$$;

revoke execute on function public.delete_cancelled_order(bigint,text) from public,anon;
grant execute on function public.delete_cancelled_order(bigint,text) to authenticated;
