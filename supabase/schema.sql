-- Convenience entry point for psql users.
-- supabase/migrations is the canonical source of truth; keep this file as includes
-- so it cannot drift from the migration history deployed to LOCO_MALL.
\ir migrations/20260920070832_commerce_core.sql
\ir migrations/20260920071701_commerce_core_hardening.sql
\ir migrations/20260920073052_commerce_core_indexes.sql
\ir migrations/20260920073812_allocation_canonical.sql
\ir migrations/20260920073926_authorization_fixes.sql
\ir migrations/20260920074002_logistics_state_sync.sql
\ir migrations/20260921020823_v1_release_hardening.sql
\ir migrations/20260921022510_enforce_admin_mfa.sql
