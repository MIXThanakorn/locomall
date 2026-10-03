-- The chat tab lists only rooms the signed-in buyer or store manager can open.
create function private.get_my_chat_inbox()
returns table(
  room_id bigint,
  store_name text,
  product_name text,
  market_name text,
  partner_name text,
  partner_role text,
  last_message text,
  last_message_at timestamptz,
  last_sender_id uuid,
  sort_at timestamptz,
  unread_count bigint
)
language sql stable security definer set search_path = '' as $$
  select r.room_id,s.name,s.product_name,m.name,
    coalesce(nullif(btrim(p.display_name),''),nullif(btrim(p.full_name),''),
      nullif(btrim(p.username),''),
      case when r.buyer_id=auth.uid() then 'ผู้ดูแลร้าน' else 'ผู้ซื้อ' end)::text,
    case when r.buyer_id=auth.uid() then 'ผู้ดูแลร้าน' else 'ผู้ซื้อ' end::text,
    latest.message,latest.created_at,latest.sender_id,
    coalesce(latest.created_at,r.created_at),
    (select count(*) from public.notifications n
      where n.user_id=auth.uid() and n.category='chat'
        and n.entity_type='chat' and n.entity_id=r.room_id
        and n.read_at is null)
  from public.chat_rooms r
  join public.stores s on s.store_id=r.store_id
  join public.markets m on m.market_id=s.market_id
  left join public.profiles p on p.user_id=
    case when r.buyer_id=auth.uid() then s.manager_id else r.buyer_id end
  left join lateral (
    select cm.message,cm.created_at,cm.sender_id
    from public.chat_messages cm
    where cm.room_id=r.room_id
    order by cm.created_at desc,cm.message_id desc
    limit 1
  ) latest on true
  where auth.uid() is not null
    and (r.buyer_id=auth.uid() or s.manager_id=auth.uid())
  order by coalesce(latest.created_at,r.created_at) desc,r.room_id desc
$$;

revoke execute on function private.get_my_chat_inbox() from public,anon,authenticated;
grant execute on function private.get_my_chat_inbox() to authenticated;

create function public.get_my_chat_inbox()
returns table(
  room_id bigint,
  store_name text,
  product_name text,
  market_name text,
  partner_name text,
  partner_role text,
  last_message text,
  last_message_at timestamptz,
  last_sender_id uuid,
  sort_at timestamptz,
  unread_count bigint
)
language sql stable security invoker set search_path = '' as $$
  select * from private.get_my_chat_inbox()
$$;
revoke execute on function public.get_my_chat_inbox() from public,anon;
grant execute on function public.get_my_chat_inbox() to authenticated;

-- Chat notifications still power push and the chat badge, but opening a room
-- clears only that room's unread state without affecting order notifications.
create function private.mark_my_chat_room_read(p_room_id bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if not exists (
    select 1 from public.chat_rooms r
    join public.stores s on s.store_id=r.store_id
    where r.room_id=p_room_id
      and (r.buyer_id=v_user_id or s.manager_id=v_user_id)
  ) then
    raise exception 'chat room not found' using errcode = '42501';
  end if;
  update public.notifications n set read_at=now()
  where n.user_id=v_user_id and n.category='chat'
    and n.entity_type='chat' and n.entity_id=p_room_id
    and n.read_at is null;
end $$;

revoke execute on function private.mark_my_chat_room_read(bigint) from public,anon,authenticated;
grant execute on function private.mark_my_chat_room_read(bigint) to authenticated;

create function public.mark_my_chat_room_read(p_room_id bigint)
returns void language sql security invoker set search_path = '' as $$
  select private.mark_my_chat_room_read(p_room_id)
$$;
revoke execute on function public.mark_my_chat_room_read(bigint) from public,anon;
grant execute on function public.mark_my_chat_room_read(bigint) to authenticated;

create function private.mark_my_non_chat_notifications_read()
returns void language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  update public.notifications n set read_at=now()
  where n.user_id=v_user_id and n.category<>'chat' and n.read_at is null;
end $$;
revoke execute on function private.mark_my_non_chat_notifications_read() from public,anon,authenticated;
grant execute on function private.mark_my_non_chat_notifications_read() to authenticated;

create function public.mark_my_non_chat_notifications_read()
returns void language sql security invoker set search_path = '' as $$
  select private.mark_my_non_chat_notifications_read()
$$;
revoke execute on function public.mark_my_non_chat_notifications_read() from public,anon;
grant execute on function public.mark_my_non_chat_notifications_read() to authenticated;
