-- Public cards need the advertised price, but must not expose pending stores.
create function public.get_public_store_prices(p_store_ids bigint[])
returns table(store_id bigint, unit_price numeric)
language sql stable security definer set search_path = '' as $$
  select s.store_id, s.unit_price
  from public.stores s
  join public.markets m on m.market_id=s.market_id
  where s.store_id=any(p_store_ids)
    and cardinality(p_store_ids) between 1 and 100
    and s.approval_status='approved'
    and m.approval_status='approved'
$$;

revoke execute on function public.get_public_store_prices(bigint[]) from public,anon;
grant execute on function public.get_public_store_prices(bigint[]) to anon,authenticated;
