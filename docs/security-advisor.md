# Supabase security verification

Last live Advisor check against project `LOCO_MALL`: 2026-09-26, after deploying
the self-purchase guard and explicit seller order-acceptance migration.

> Scope note (updated 2026-09-26): V1 Admin authorization is role-based only.
> Email confirmation and MFA are intentionally not part of the authorization
> decision. The 2026-09-25 migration replaces the earlier `aal2` requirement.
> The check includes the 2026-09-26 Market/store management, pickup,
> self-purchase guard and Admin erroneous-order deletion migrations.

- No Critical or High Security Advisor findings.
- `anon` cannot execute any `SECURITY DEFINER` function. Its only RPC is the
  `SECURITY INVOKER` catalog search `discover_nearby`.
- Authenticated write RPCs intentionally use `SECURITY DEFINER` so their
  transaction can reserve/release stock or append audit events. Every one uses an
  empty immutable `search_path`, schema-qualified objects, a minimal signature,
  explicit `auth.uid()`/ownership/state checks, and an explicit authenticated grant.
  Security Advisor consequently reports 24 expected authenticated-function
  warnings; these are the reviewed public command API, not anonymous helpers.
- Private helpers live in `private`; `anon` and `authenticated` have no execute grant.
- Platform Admin checks require a server-controlled
  `platform_roles.platform_admin` relationship. The app does not derive Admin
  access from an email address, profile field or user metadata.
- All public tables have RLS. Exact GPS, shipping addresses, phone numbers, audit
  logs and roles have no guest-readable policy.
- Email confirmation and Admin MFA are temporarily disabled for V1. Secure
  password change and a strong minimum password policy remain enabled.
  Remaining production configuration:
  leaked-password protection remains unavailable on the organization's Free plan
  (Supabase provides it on Pro and above). CAPTCHA still requires an hCaptcha or
  Turnstile secret.

Performance Advisor reports 11 new indexes as unused. This is expected before
production traffic and seed scenarios exercise the query paths.

References:

- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
