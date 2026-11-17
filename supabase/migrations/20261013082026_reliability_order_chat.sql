-- Additive RPCs keep old APK contracts intact. Requests and stock allocation are
-- committed in the same transaction; clients cannot write request records.
create table private.cod_order_requests (
  user_id uuid not null references auth.users(id),
  request_id uuid not null,
  payload jsonb not null,
  order_id bigint,
  created_at timestamptz not null default now(),
  primary key (user_id,request_id)
);
alter table private.cod_order_requests enable row level security;
revoke all on private.cod_order_requests from public,anon,authenticated;
create policy deny_client_access on private.cod_order_requests to authenticated using (false) with check (false);
-- Keep the returned order ID as a tombstone even if an administrator removes an
-- old cancelled order: replay must never create a second purchase.
create function private.create_cod_order_once(
  p_request_id uuid,p_market_id bigint,p_address_id bigint,p_items jsonb,
  p_fulfillment_method text default 'delivery',p_lat double precision default null,p_lng double precision default null
) returns bigint language plpgsql security definer set search_path='' as $$
declare v_user uuid=auth.uid(); v_payload jsonb; v_request private.cod_order_requests; v_order bigint;
begin
  if v_user is null or p_request_id is null then raise exception 'Authentication and request ID required'; end if;
  v_payload=jsonb_build_object('market',p_market_id,'address',p_address_id,'items',p_items,'fulfillment',p_fulfillment_method);
  insert into private.cod_order_requests(user_id,request_id,payload) values(v_user,p_request_id,v_payload) on conflict do nothing;
  select * into v_request from private.cod_order_requests where user_id=v_user and request_id=p_request_id for update;
  if v_request.payload is distinct from v_payload then raise exception 'Request ID already used for different order'; end if;
  if v_request.order_id is not null then return v_request.order_id; end if;
  v_order=public.create_cod_order(p_market_id,p_address_id,p_items,p_fulfillment_method,p_lat,p_lng);
  update private.cod_order_requests set order_id=v_order where user_id=v_user and request_id=p_request_id;
  return v_order;
end $$;
create function public.create_cod_order_once(
  p_request_id uuid,p_market_id bigint,p_address_id bigint,p_items jsonb,
  p_fulfillment_method text default 'delivery',p_lat double precision default null,p_lng double precision default null
) returns bigint language sql security invoker set search_path='' as $$
  select private.create_cod_order_once(p_request_id,p_market_id,p_address_id,p_items,p_fulfillment_method,p_lat,p_lng)
$$;
revoke execute on function private.create_cod_order_once(uuid,bigint,bigint,jsonb,text,double precision,double precision) from public,anon;
revoke execute on function public.create_cod_order_once(uuid,bigint,bigint,jsonb,text,double precision,double precision) from public,anon;
grant execute on function private.create_cod_order_once(uuid,bigint,bigint,jsonb,text,double precision,double precision) to authenticated;
grant execute on function public.create_cod_order_once(uuid,bigint,bigint,jsonb,text,double precision,double precision) to authenticated;

create index if not exists chat_messages_room_cursor_idx on public.chat_messages(room_id,created_at,message_id);
create function private.get_chat_messages_page(
  p_room_id bigint,p_limit integer default 41,p_cursor_at timestamptz default null,
  p_cursor_id bigint default null,p_newer boolean default false
) returns table(message_id bigint,sender_id uuid,message text,created_at timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.chat_rooms r join public.stores s on s.store_id=r.store_id
    where r.room_id=p_room_id and (r.buyer_id=auth.uid() or s.manager_id=auth.uid())
  ) then raise exception 'Chat access denied' using errcode='42501'; end if;
  if (p_cursor_at is null) <> (p_cursor_id is null) or (p_newer and p_cursor_at is null) then raise exception 'Invalid chat cursor'; end if;
  if p_limit is null or p_limit<1 or p_limit>101 or p_newer is null then raise exception 'Invalid page size'; end if;
  if p_newer then
    return query select m.message_id,m.sender_id,m.message,m.created_at from public.chat_messages m
      where m.room_id=p_room_id and (m.created_at,m.message_id)>(p_cursor_at,p_cursor_id)
      order by m.created_at,m.message_id limit p_limit;
  else
    return query select m.message_id,m.sender_id,m.message,m.created_at from public.chat_messages m
      where m.room_id=p_room_id and (p_cursor_at is null or (m.created_at,m.message_id)<(p_cursor_at,p_cursor_id))
      order by m.created_at desc,m.message_id desc limit p_limit;
  end if;
end $$;
create function public.get_chat_messages_page(
  p_room_id bigint,p_limit integer default 41,p_cursor_at timestamptz default null,
  p_cursor_id bigint default null,p_newer boolean default false
) returns table(message_id bigint,sender_id uuid,message text,created_at timestamptz)
language sql stable security invoker set search_path='' as $$
  select * from private.get_chat_messages_page(p_room_id,p_limit,p_cursor_at,p_cursor_id,p_newer)
$$;
revoke execute on function private.get_chat_messages_page(bigint,integer,timestamptz,bigint,boolean) from public,anon;
revoke execute on function public.get_chat_messages_page(bigint,integer,timestamptz,bigint,boolean) from public,anon;
grant execute on function private.get_chat_messages_page(bigint,integer,timestamptz,bigint,boolean) to authenticated;
grant execute on function public.get_chat_messages_page(bigint,integer,timestamptz,bigint,boolean) to authenticated;
