-- Preserve the original RPC for installed APKs. Reuse approved public DTOs,
-- without new table privileges or exposing seller identities.
create or replace function public.get_catalog_card_details(p_market_ids bigint[], p_store_ids bigint[])
returns table(entity_type text, entity_id bigint, min_price numeric, rating_average numeric,
  rating_count integer, sold_quantity bigint, product_name text, unit text, market_name text)
language sql stable security invoker set search_path = '' as $$
  select c.*, d.catalog->>'product_name', d.catalog->>'unit', d.catalog->'markets'->>'name'
  from public.get_catalog_card_metrics(p_market_ids, p_store_ids) c
  left join lateral (
    select public.get_store_catalog(c.entity_id) as catalog where c.entity_type = 'store'
  ) d on true
$$;
revoke all on function public.get_catalog_card_details(bigint[],bigint[]) from public;
grant execute on function public.get_catalog_card_details(bigint[],bigint[]) to anon, authenticated;
