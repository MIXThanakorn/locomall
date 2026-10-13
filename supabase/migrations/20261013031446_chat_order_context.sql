-- Read-only context cards, not chat messages. No addresses, phone numbers,
-- payment details, other stores or other buyers leave this scoped DTO.
-- Existing order_items_store_idx/orders_buyer_created_idx/allocations_item_idx
-- cover this lookup; do not add redundant indexes on the same columns.

create or replace function private.chat_order_context(p_room_id bigint)
returns table(order_id bigint,order_item_id bigint,order_number text,product_name text,
  quantity integer,unit text,item_amount numeric,order_status text,created_at timestamptz,
  viewer_is_buyer boolean,allocation_id bigint)
language sql stable security definer set search_path = '' as $$
  select o.order_id,i.order_item_id,o.order_number,i.product_name,i.quantity,i.unit,
    i.total_amount,o.status,o.created_at,r.buyer_id=(select auth.uid()),
    (select min(a.allocation_id) from public.order_allocations a
      where a.order_item_id=i.order_item_id and a.seller_id=(select auth.uid()))
  from public.chat_rooms r
  join public.stores s on s.store_id=r.store_id
  join public.orders o on o.buyer_id=r.buyer_id
  join public.order_items i on i.order_id=o.order_id and i.store_id=r.store_id
  where r.room_id=p_room_id and (select auth.uid()) is not null
    and (r.buyer_id=(select auth.uid()) or s.manager_id=(select auth.uid()))
  order by o.created_at desc,o.order_id desc,i.order_item_id desc limit 3
$$;
revoke all on function private.chat_order_context(bigint) from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.chat_order_context(bigint) to authenticated;

create or replace function public.get_chat_order_context(p_room_id bigint)
returns table(order_id bigint,order_item_id bigint,order_number text,product_name text,
  quantity integer,unit text,item_amount numeric,order_status text,created_at timestamptz,
  viewer_is_buyer boolean,allocation_id bigint)
language sql stable security invoker set search_path = '' as $$
  select * from private.chat_order_context(p_room_id)
$$;
revoke all on function public.get_chat_order_context(bigint) from public,anon;
grant execute on function public.get_chat_order_context(bigint) to authenticated;
comment on function public.get_chat_order_context(bigint) is
  'Latest 3 purchased store lines for a room participant; does not grant order-detail access.';
