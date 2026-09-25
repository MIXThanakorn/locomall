-- Convenience entry point for psql users.
-- supabase/migrations is the canonical source of truth; keep this file as includes
-- so it cannot drift from the migration history deployed to LOCO_MALL.
\ir migrations/20260920070832_commerce_core.sql
\ir migrations/20260920071701_commerce_core_hardening.sql
\ir migrations/20260920073052_commerce_core_indexes.sql
\ir migrations/20260920073812_allocation_canonical.sql
\ir migrations/20260920073926_authorization_fixes.sql
\ir migrations/20260920074002_logistics_state_sync.sql
\ir migrations/20260921021549_v1_release_hardening.sql
\ir migrations/20260921022618_enforce_admin_mfa.sql
\ir migrations/20260921080637_runtime_location_and_policy_helpers.sql
\ir migrations/20260921084304_fix_order_rls_recursion.sql
\ir migrations/20260925015236_admin_workspace_and_request_rls_fixes.sql
