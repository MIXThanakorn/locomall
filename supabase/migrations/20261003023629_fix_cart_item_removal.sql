-- Cart tables remain read-only to the Data API. This narrow internal function
-- deletes only an authenticated user's own item, including quantity 1 -> 0.
create or replace function private.remove_my_cart_item(p_store_id bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_cart_id bigint;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if p_store_id is null or p_store_id <= 0 then
    raise exception 'invalid store id' using errcode = '22023';
  end if;

  select c.cart_id into v_cart_id
  from public.carts c
  where c.buyer_id = v_user_id
  for update;
  if v_cart_id is null then return; end if;

  delete from public.cart_items ci
  where ci.cart_id = v_cart_id and ci.store_id = p_store_id;
  if found then
    update public.carts set updated_at = now() where cart_id = v_cart_id;
  end if;
end $$;

revoke execute on function private.remove_my_cart_item(bigint) from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.remove_my_cart_item(bigint) to authenticated;

-- Keep the existing RPC name so already-installed apps can also delete items.
create or replace function public.remove_cart_item(p_store_id bigint)
returns void language sql security invoker set search_path = '' as $$
  select private.remove_my_cart_item(p_store_id)
$$;
revoke execute on function public.remove_cart_item(bigint) from public, anon;
grant execute on function public.remove_cart_item(bigint) to authenticated;
