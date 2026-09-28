-- Categorized in-app notifications and private Expo push-device registration.
alter table public.notifications
  add column if not exists category text;

update public.notifications
set category = case
  when type like 'approval%' or entity_type in ('market','store','seller') then 'approval'
  when type like 'order%' or entity_type = 'order' then 'order'
  when type like 'chat%' or entity_type = 'chat' then 'chat'
  else 'system'
end
where category is null;

alter table public.notifications alter column category set default 'system';
alter table public.notifications alter column category set not null;
alter table public.notifications drop constraint if exists notifications_category_check;
alter table public.notifications add constraint notifications_category_check
  check (category in ('order','approval','chat','system'));
create index if not exists notifications_user_category_created_idx
  on public.notifications(user_id,category,created_at desc);

create or replace function private.set_notification_category()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.category is null or new.category = 'system' then
    new.category := case
      when new.type like 'approval%' or new.entity_type in ('market','store','seller') then 'approval'
      when new.type like 'order%' or new.entity_type = 'order' then 'order'
      when new.type like 'chat%' or new.entity_type = 'chat' then 'chat'
      else 'system'
    end;
  end if;
  return new;
end
$$;

drop trigger if exists notifications_set_category on public.notifications;
create trigger notifications_set_category
before insert or update of type,entity_type,category on public.notifications
for each row execute function private.set_notification_category();

create table if not exists public.user_push_devices (
  push_device_id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  expo_push_token text not null unique,
  platform text not null check (platform in ('android','ios')),
  device_name text,
  enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  last_success_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists user_push_devices_user_enabled_idx
  on public.user_push_devices(user_id,enabled) where enabled;
alter table public.user_push_devices enable row level security;

-- Tokens are intentionally not readable through the Data API. Registration is RPC-only.
revoke all on public.user_push_devices from public, anon, authenticated;
revoke all on sequence public.user_push_devices_push_device_id_seq from public, anon, authenticated;

create or replace function public.register_my_push_device(
  p_expo_push_token text,
  p_platform text,
  p_device_name text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_platform not in ('android','ios') then raise exception 'invalid platform'; end if;
  if length(p_expo_push_token) > 220 or
     p_expo_push_token !~ '^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$'
  then raise exception 'invalid Expo push token'; end if;

  insert into public.user_push_devices(user_id,expo_push_token,platform,device_name)
  values(auth.uid(),p_expo_push_token,p_platform,nullif(left(btrim(p_device_name),120),''))
  on conflict(expo_push_token) do update set
    user_id=excluded.user_id,
    platform=excluded.platform,
    device_name=excluded.device_name,
    enabled=true,
    last_seen_at=now(),
    last_error=null,
    updated_at=now();
end
$$;

create or replace function public.disable_my_push_devices()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  update public.user_push_devices
  set enabled=false,updated_at=now()
  where user_id=auth.uid() and enabled;
end
$$;

create or replace function public.mark_all_notifications_read()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  update public.notifications set read_at=coalesce(read_at,now())
  where user_id=auth.uid() and read_at is null;
end
$$;

revoke execute on function private.set_notification_category() from public,anon,authenticated;
revoke execute on function public.register_my_push_device(text,text,text) from public,anon;
revoke execute on function public.disable_my_push_devices() from public,anon;
revoke execute on function public.mark_all_notifications_read() from public,anon;
grant execute on function public.register_my_push_device(text,text,text) to authenticated;
grant execute on function public.disable_my_push_devices() to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;
