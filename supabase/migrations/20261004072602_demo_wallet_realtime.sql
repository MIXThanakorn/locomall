-- Publish only the user's demo wallet rows. RLS continues to determine which
-- events a subscribed client is allowed to receive.
do $$
declare
  wallet_table text;
begin
  foreach wallet_table in array array['demo_accounts', 'demo_topup_requests', 'demo_ledger'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = wallet_table
    ) then
      execute format('alter publication supabase_realtime add table public.%I', wallet_table);
    end if;
  end loop;
end $$;
