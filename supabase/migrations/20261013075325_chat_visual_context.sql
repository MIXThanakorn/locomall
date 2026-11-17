-- Additive endpoint: older APKs keep using the existing header/inbox contracts.
-- Profiles remain private; only the current room's partner avatar is exposed.
create function private.get_my_chat_visuals(p_room_ids bigint[] default null)
returns table(room_id bigint,partner_image_url text,product_image_url text)
language sql stable security definer set search_path = '' as $$
  select r.room_id,nullif(btrim(p.user_img_url),''),nullif(btrim(s.image_url),'')
  from public.chat_rooms r
  join public.stores s on s.store_id=r.store_id
  left join public.profiles p on p.user_id=
    case when r.buyer_id=(select auth.uid()) then s.manager_id else r.buyer_id end
  where (select auth.uid()) is not null
    and (r.buyer_id=(select auth.uid()) or s.manager_id=(select auth.uid()))
    and (p_room_ids is null or r.room_id=any(p_room_ids))
$$;
revoke execute on function private.get_my_chat_visuals(bigint[]) from public,anon,authenticated;
grant execute on function private.get_my_chat_visuals(bigint[]) to authenticated;

create function public.get_my_chat_visuals(p_room_ids bigint[] default null)
returns table(room_id bigint,partner_image_url text,product_image_url text)
language sql stable security invoker set search_path = '' as $$
  select * from private.get_my_chat_visuals(p_room_ids)
$$;
revoke execute on function public.get_my_chat_visuals(bigint[]) from public,anon;
grant execute on function public.get_my_chat_visuals(bigint[]) to authenticated;
