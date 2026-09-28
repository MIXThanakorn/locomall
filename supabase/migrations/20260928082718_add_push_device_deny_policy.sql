-- Explicit deny policy documents that Expo tokens are RPC/server only.
-- Table privileges remain revoked from anon and authenticated.
drop policy if exists push_devices_no_direct_access on public.user_push_devices;
create policy push_devices_no_direct_access
on public.user_push_devices
for all
to anon, authenticated
using (false)
with check (false);
