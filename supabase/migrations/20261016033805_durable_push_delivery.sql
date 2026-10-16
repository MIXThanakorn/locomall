alter table public.user_push_devices add column registration_version uuid not null default gen_random_uuid();
create function private.version_push_registration() returns trigger language plpgsql set search_path='' as $$
begin
  if row(new.user_id,new.enabled,new.expo_push_token) is distinct from row(old.user_id,old.enabled,old.expo_push_token) then new.registration_version:=gen_random_uuid(); end if;
  return new;
end $$;
revoke all on function private.version_push_registration() from public,anon,authenticated;
create trigger version_push_registration before update on public.user_push_devices for each row execute function private.version_push_registration();
create table public.push_delivery_jobs(
  job_id bigint generated always as identity primary key,
  notification_id bigint not null references public.notifications(notification_id) on delete cascade,
  push_device_id bigint not null references public.user_push_devices(push_device_id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  registration_version uuid not null,
  status text not null default 'pending' check(status in ('pending','sending','accepted','checking','delivered','failed','cancelled','uncertain')),
  attempts integer not null default 0,receipt_checks integer not null default 0,
  ticket_id text,last_error text,next_attempt_at timestamptz not null default now(),lease_until timestamptz,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  unique(notification_id,push_device_id,registration_version)
);
alter table public.push_delivery_jobs enable row level security;
create policy no_client_push_jobs on public.push_delivery_jobs to authenticated using(false) with check(false);
revoke all on public.push_delivery_jobs from public,anon,authenticated;
grant all on public.push_delivery_jobs to service_role;
grant usage,select on sequence public.push_delivery_jobs_job_id_seq to service_role;
create index push_jobs_due_idx on public.push_delivery_jobs(next_attempt_at) where status in ('pending','accepted');
create index push_jobs_notification_idx on public.push_delivery_jobs(notification_id);
create index push_jobs_device_idx on public.push_delivery_jobs(push_device_id);
create index push_jobs_user_idx on public.push_delivery_jobs(user_id);
create function private.enqueue_push_delivery_jobs() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.push_delivery_jobs(notification_id,push_device_id,user_id,registration_version)
    select new.notification_id,d.push_device_id,d.user_id,d.registration_version from public.user_push_devices d
    where d.user_id=new.user_id and d.enabled on conflict do nothing;
  return new;
end $$;
revoke all on function private.enqueue_push_delivery_jobs() from public,anon,authenticated;
-- Run before the best-effort webhook. Do not replay historical notifications.
create trigger notifications_create_delivery_jobs after insert on public.notifications for each row execute function private.enqueue_push_delivery_jobs();
create function public.claim_push_delivery_jobs(p_limit integer default 100)
returns setof public.push_delivery_jobs language plpgsql security invoker set search_path='' as $$
begin
  -- Interrupted sends without tickets are ambiguous: do not blindly resend.
  update public.push_delivery_jobs set status='uncertain',last_error='worker interrupted during send',lease_until=null where status='sending' and lease_until<now();
  update public.push_delivery_jobs set status='accepted',lease_until=null where status='checking' and lease_until<now();
  return query with due as (
    select job_id from public.push_delivery_jobs where status in ('pending','accepted') and next_attempt_at<=now()
    order by next_attempt_at,job_id for update skip locked limit least(greatest(coalesce(p_limit,100),1),100)
  ) update public.push_delivery_jobs j set status=case when j.ticket_id is null then 'sending' else 'checking' end,
    lease_until=now()+interval '2 minutes',updated_at=now(),
    attempts=j.attempts+case when j.ticket_id is null then 1 else 0 end,
    receipt_checks=j.receipt_checks+case when j.ticket_id is not null then 1 else 0 end
    from due where j.job_id=due.job_id returning j.*;
end $$;
revoke all on function public.claim_push_delivery_jobs(integer) from public,anon,authenticated;
grant execute on function public.claim_push_delivery_jobs(integer) to service_role;
create extension if not exists pg_cron;
-- Two-phase cutover: queue new jobs, deploy the worker, then activate with an
-- administrative SQL update. No old worker can send and leave a duplicate job.
create table private.push_worker_control(singleton boolean primary key default true check(singleton),active boolean not null default false);
insert into private.push_worker_control(singleton,active) values(true,false);
alter table private.push_worker_control enable row level security;
create policy no_client_push_worker_control on private.push_worker_control to authenticated using(false) with check(false);
revoke all on private.push_worker_control from public,anon,authenticated;
create function private.wake_push_worker() returns void language plpgsql security definer set search_path='' as $$
declare edge_url text; secret text;
begin
  if not exists(select 1 from private.push_worker_control where active) then return; end if;
  if not exists(select 1 from public.push_delivery_jobs where status in ('pending','accepted','sending','checking') and next_attempt_at<=now()) then return; end if;
  select decrypted_secret into edge_url from vault.decrypted_secrets where name='locomall_push_edge_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name='locomall_push_webhook_secret';
  if edge_url is null or secret is null then return; end if;
  perform net.http_post(url:=edge_url,headers:=jsonb_build_object('Content-Type','application/json','x-locomall-webhook-secret',secret),body:='{"type":"DRAIN"}'::jsonb,timeout_milliseconds:=5000);
end $$;
revoke all on function private.wake_push_worker() from public,anon,authenticated;
create or replace function private.enqueue_push_notification() returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform private.wake_push_worker();
  return new;
exception when others then
  -- Durable jobs remain queued even if the immediate wake request fails.
  raise warning 'Push worker wake unavailable'; return new;
end $$;
revoke all on function private.enqueue_push_notification() from public,anon,authenticated;
select cron.schedule('locomall-push-delivery-retry','* * * * *','select private.wake_push_worker()');
notify pgrst,'reload schema';
