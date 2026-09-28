# Supabase security verification

Last live Advisor check against project `LOCO_MALL`: 2026-09-28, after deploying
the RLS least-privilege, private seller-evidence and Push-device migrations.

> Scope note (updated 2026-09-28): V1 Admin authorization is role-based only.
> Email confirmation and MFA are intentionally not part of the authorization
> decision. The 2026-09-25 migration replaces the earlier `aal2` requirement.
> The check includes safe catalog RPCs, RPC-only sensitive writes, restricted
> allocation reads and private application evidence.

- No Critical or High Security Advisor findings.
- `anon` cannot select catalog base tables. It can execute three reviewed,
  read-only safe-shape `SECURITY DEFINER` APIs: `discover_nearby`,
  `get_market_catalog` and `get_store_catalog`. They return no owner/manager/seller
  UUID, exact geography, approval note or per-seller allocation metadata.
- Authenticated write RPCs intentionally use `SECURITY DEFINER` so their
  transaction can reserve/release stock or append audit events. Every one uses an
  empty immutable `search_path`, schema-qualified objects, a minimal signature,
  explicit `auth.uid()`/ownership/state checks, and an explicit authenticated grant.
  Security Advisor consequently reports 36 expected authenticated-function
  warnings; these are the reviewed public command API, not anonymous helpers.
- Private helpers live in `private` and are not exposed through Data API. `anon`
  has no execute grant; authenticated execute is limited to helpers used inside RLS.
- Platform Admin checks require a server-controlled
  `platform_roles.platform_admin` relationship. The app does not derive Admin
  access from an email address, profile field or user metadata.
- All public tables have RLS. Exact GPS, shipping addresses, phone numbers, audit
  logs and roles have no guest-readable policy. Listing/location/cart/address/chat
  and notification mutations identified by the audit can no longer bypass RPC validation.
- `user_push_devices` is RPC/server-only: `anon` and `authenticated` have no
  table or sequence privileges, an explicit deny RLS policy remains as defense in
  depth, and logout can disable only the current device token. The Push Edge
  Function rejects requests that do not carry a service/secret key.
- Email confirmation and Admin MFA are temporarily disabled for V1. Secure
  password change and a strong minimum password policy remain enabled.
  Remaining production configuration:
  leaked-password protection remains unavailable on the organization's Free plan
  (Supabase provides it on Pro and above). CAPTCHA still requires an hCaptcha or
  Turnstile secret.

Performance Advisor reports 13 indexes as unused. This is expected before
production traffic and seed scenarios exercise the query paths.

References:

- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
