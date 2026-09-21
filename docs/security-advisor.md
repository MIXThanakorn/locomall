# Supabase security verification

Checked against project `LOCO_MALL` on 2026-09-21.

- No Critical or High Security Advisor findings.
- `anon` cannot execute any `SECURITY DEFINER` function. Its only RPC is the
  `SECURITY INVOKER` catalog search `discover_nearby`.
- Authenticated write RPCs intentionally use `SECURITY DEFINER` so their
  transaction can reserve/release stock or append audit events. Every one uses an
  empty immutable `search_path`, schema-qualified objects, a minimal signature,
  explicit `auth.uid()`/ownership/state checks, and an explicit authenticated grant.
  Security Advisor consequently reports 18 expected authenticated-function
  warnings; these are the reviewed public command API, not anonymous helpers.
- Private helpers live in `private`; `anon` and `authenticated` have no execute grant.
- Platform Admin checks require both `platform_roles.platform_admin` and an `aal2`
  session produced by verified TOTP MFA.
- All public tables have RLS. Exact GPS, shipping addresses, phone numbers, audit
  logs and roles have no guest-readable policy.
- Email confirmation is temporarily disabled for V1. Secure password change, a
  strong minimum password policy and TOTP enrollment/verification are enabled.
  Remaining Security Advisor warning:
  leaked-password protection remains unavailable on the organization's Free plan
  (Supabase provides it on Pro and above). CAPTCHA still requires an hCaptcha or
  Turnstile secret. Platform Admin MFA is enforced in both the app and database.

Performance Advisor currently reports only new indexes as unused. This is expected
before production traffic and seed scenarios exercise the query paths.

References:

- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
