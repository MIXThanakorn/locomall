-- Only the authenticated Edge Function may reserve AI capacity. No prompt/image logs.
create table private.ai_listing_quota (
  scope text primary key,
  user_id uuid unique references auth.users(id) on delete cascade,
  minute_start timestamptz not null,
  minute_count integer not null default 0 check (minute_count >= 0),
  day_start timestamptz not null,
  day_count integer not null default 0 check (day_count >= 0),
  check ((scope = 'global' and user_id is null) or (user_id is not null and scope = user_id::text))
);
alter table private.ai_listing_quota enable row level security;
revoke all on private.ai_listing_quota from public, anon, authenticated;
grant usage on schema private to service_role;
grant select, insert, update on private.ai_listing_quota to service_role;

create function public.reserve_listing_ai_request(p_user_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_now timestamptz := clock_timestamp();
  v_minute timestamptz := date_trunc('minute', v_now, 'UTC');
  v_day timestamptz := date_trunc('day', v_now, 'UTC');
  v_global private.ai_listing_quota;
  v_user private.ai_listing_quota;
begin
  if p_user_id is null then
    raise exception 'invalid AI account';
  end if;
  insert into private.ai_listing_quota(scope, minute_start, day_start)
    values ('global', v_minute, v_day) on conflict do nothing;
  -- Always lock the global row first: serializes limits across Edge instances.
  select * into v_global from private.ai_listing_quota where scope = 'global' for update;
  insert into private.ai_listing_quota(scope, user_id, minute_start, day_start)
    values (p_user_id::text, p_user_id, v_minute, v_day) on conflict do nothing;
  select * into v_user from private.ai_listing_quota where scope = p_user_id::text for update;

  update private.ai_listing_quota set
    minute_count = case when minute_start = v_minute then minute_count else 0 end,
    minute_start = v_minute,
    day_count = case when day_start = v_day then day_count else 0 end,
    day_start = v_day
    where scope in ('global', p_user_id::text);
  select * into v_global from private.ai_listing_quota where scope = 'global';
  select * into v_user from private.ai_listing_quota where scope = p_user_id::text;
  if v_global.day_count >= 100 or v_user.day_count >= 20 then
    return jsonb_build_object('allowed', false, 'retry_after_seconds',
      greatest(1, ceil(extract(epoch from (v_day + interval '1 day' - v_now)))));
  end if;
  if v_global.minute_count >= 10 or v_user.minute_count >= 3 then
    return jsonb_build_object('allowed', false, 'retry_after_seconds',
      greatest(1, ceil(extract(epoch from (v_minute + interval '1 minute' - v_now)))));
  end if;
  update private.ai_listing_quota set minute_count = minute_count + 1, day_count = day_count + 1
    where scope in ('global', p_user_id::text);
  return jsonb_build_object('allowed', true);
end $$;
revoke all on function public.reserve_listing_ai_request(uuid) from public, anon, authenticated;
grant execute on function public.reserve_listing_ai_request(uuid) to service_role;
