create or replace function public.disable_my_push_device(p_expo_push_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  update public.user_push_devices
  set enabled=false,updated_at=now()
  where user_id=auth.uid() and expo_push_token=p_expo_push_token and enabled;
end
$$;

revoke execute on function public.disable_my_push_device(text) from public,anon;
grant execute on function public.disable_my_push_device(text) to authenticated;
