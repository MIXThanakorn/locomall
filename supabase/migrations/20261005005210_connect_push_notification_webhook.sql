-- The notification INSERT trigger enqueues a Push delivery after commit.
-- The URL and shared secret are provisioned in Vault, never committed to Git.
create extension if not exists pg_net with schema extensions;

create or replace function private.enqueue_push_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  webhook_url text;
  webhook_secret text;
begin
  select decrypted_secret into webhook_url
  from vault.decrypted_secrets where name = 'locomall_push_edge_url';
  select decrypted_secret into webhook_secret
  from vault.decrypted_secrets where name = 'locomall_push_webhook_secret';

  if webhook_url is null or webhook_secret is null then
    raise warning 'Push webhook is not configured for notification %', new.notification_id;
    return new;
  end if;

  perform net.http_post(
    url := webhook_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-locomall-webhook-secret', webhook_secret
    ),
    body := jsonb_build_object(
      'type', 'INSERT', 'schema', 'public', 'table', 'notifications',
      'record', jsonb_build_object('notification_id', new.notification_id)
    ),
    timeout_milliseconds := 5000
  );
  return new;
exception when others then
  -- An external Push outage must never roll back the original notification.
  raise warning 'Push enqueue failed for notification %: %', new.notification_id, sqlerrm;
  return new;
end
$$;

drop trigger if exists notifications_enqueue_push on public.notifications;
create trigger notifications_enqueue_push
after insert on public.notifications
for each row execute function private.enqueue_push_notification();

revoke execute on function private.enqueue_push_notification() from public, anon, authenticated;
