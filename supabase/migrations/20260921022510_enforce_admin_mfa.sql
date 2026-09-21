-- Platform Admin authorization requires a session upgraded with TOTP MFA.
create or replace function private.is_admin(p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path='' as $$
  select coalesce((auth.jwt()->>'aal')='aal2',false)
    and exists(
      select 1 from public.platform_roles
      where user_id=p_user and role='platform_admin'
    )
$$;
revoke all on function private.is_admin(uuid) from public,anon,authenticated;
