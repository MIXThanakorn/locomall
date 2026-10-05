-- Publish invalidation events for data screens. All published tables already
-- have RLS; clients subscribe only to INSERT/UPDATE, never DELETE (which
-- Postgres Changes cannot filter or authorize per deleted row).
do $$
declare
  data_table text;
begin
  foreach data_table in array array[
    'orders', 'order_allocations', 'carts', 'markets', 'stores',
    'store_seller_applications', 'seller_listings'
  ] loop
    if not exists (
      select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = data_table and c.relrowsecurity
    ) then
      raise exception 'Realtime table public.% must have RLS enabled', data_table;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = data_table
    ) then
      execute format('alter publication supabase_realtime add table public.%I', data_table);
    end if;
  end loop;
end $$;
