-- Store moderation is independent of seller stock and existing fulfillment.
-- Privileged mutation stays private; the exposed RPC is SECURITY INVOKER.
alter table public.approval_events drop constraint approval_events_action_check;
alter table public.approval_events add constraint approval_events_action_check
  check (action in ('submitted','approved','rejected','suspended','restored'));

create or replace function private.set_store_suspension(
  p_store_id bigint, p_suspend boolean, p_note text, p_expected_updated_at timestamptz
)
returns boolean language plpgsql security definer set search_path='' as $$
declare
  s public.stores;
  target_status text;
  reason text := nullif(btrim(p_note),'');
begin
  if auth.uid() is null or not coalesce((select private.is_admin()),false) then
    raise exception 'forbidden';
  end if;
  if p_suspend is null or p_store_id is null or p_expected_updated_at is null then
    raise exception 'invalid store moderation request';
  end if;
  if reason is null or char_length(reason)>500 then
    raise exception 'store moderation reason required (1-500 characters)';
  end if;
  target_status := case when p_suspend then 'suspended' else 'approved' end;
  -- Checkout takes FOR SHARE on this same row, so suspension cannot race
  -- past an accepted checkout. No external network call runs in this lock.
  select * into s from public.stores where store_id=p_store_id for update;
  if not found then raise exception 'store unavailable'; end if;
  if s.approval_status=target_status then return false; end if;
  if s.updated_at is distinct from p_expected_updated_at then
    raise exception 'store moderation state changed';
  end if;
  if (p_suspend and s.approval_status<>'approved')
    or (not p_suspend and s.approval_status<>'suspended') then
    raise exception 'invalid store moderation state';
  end if;
  if not p_suspend and not exists (
    select 1 from public.markets where market_id=s.market_id and approval_status='approved'
  ) then raise exception 'market unavailable'; end if;

  update public.stores set approval_status=target_status,approval_note=reason,updated_at=clock_timestamp()
    where store_id=p_store_id;
  insert into public.approval_events(entity_type,entity_id,action,actor_id,note)
    values('store',p_store_id,case when p_suspend then 'suspended' else 'restored' end,auth.uid(),reason);
  insert into public.admin_audit_logs(actor_id,action,entity_type,entity_id,metadata)
    values(auth.uid(),case when p_suspend then 'suspend_store' else 'restore_store' end,'store',p_store_id,
      jsonb_build_object('note',reason,'previous_status',s.approval_status,'status',target_status));
  return true;
end $$;

create or replace function public.set_store_suspension(
  p_store_id bigint, p_suspend boolean, p_note text, p_expected_updated_at timestamptz
)
returns boolean language sql security invoker set search_path='' as $$
  select private.set_store_suspension(p_store_id,p_suspend,p_note,p_expected_updated_at)
$$;
revoke all on function private.set_store_suspension(bigint,boolean,text,timestamptz) from public,anon,authenticated;
revoke all on function public.set_store_suspension(bigint,boolean,text,timestamptz) from public,anon,authenticated;
grant execute on function private.set_store_suspension(bigint,boolean,text,timestamptz),
  public.set_store_suspension(bigint,boolean,text,timestamptz) to authenticated;

-- Pending co-seller approvals cannot create a new listing in a suspended store.
-- Existing listings remain intact, including their active/paused choices.
create or replace function private.require_open_store_for_listing()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.stores s where s.store_id=new.store_id and s.approval_status='approved' for share;
  if not found then raise exception 'store unavailable'; end if;
  return new;
end $$;
revoke all on function private.require_open_store_for_listing() from public,anon,authenticated;
create trigger listing_requires_open_store before insert on public.seller_listings
  for each row execute function private.require_open_store_for_listing();

create or replace function private.notify_approval()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_target uuid; v_kind text; v_entity_id bigint;
begin
  if tg_op<>'UPDATE' or old.approval_status is not distinct from new.approval_status then return new; end if;
  if tg_table_name='stores' and (new.approval_status='suspended'
    or (old.approval_status='suspended' and new.approval_status='approved')) then
    -- Only parties managing this store/market, never unrelated buyers/followers.
    -- A moderation notification stays in the inbox (not the hidden public catalog).
    insert into public.notifications(user_id,type,category,title,body,entity_type,entity_id)
    select recipients.user_id,'store_moderation','system','ข้อความจากระบบ',
      'ร้านค้า '||new.name||case when new.approval_status='suspended'
        then ' ถูกระงับการรับคำสั่งซื้อใหม่' else ' ได้รับการคืนสิทธิ์เปิดขายแล้ว' end
      ||' · เหตุผล: '||coalesce(new.approval_note,'-')
      ||' · ออเดอร์เดิมยังดำเนินการต่อได้', 'store_moderation',new.store_id
    from (
      select new.manager_id as user_id
      union select m.owner_id from public.markets m where m.market_id=new.market_id
      union select l.seller_id from public.seller_listings l where l.store_id=new.store_id
    ) recipients where recipients.user_id is not null and recipients.user_id<>auth.uid();
    return new;
  end if;
  if new.approval_status not in ('approved','rejected') then return new; end if;
  if tg_table_name='markets' then
    v_target:=new.owner_id; v_kind:='ตลาด'; v_entity_id:=new.market_id;
  else
    v_target:=new.manager_id; v_kind:='ร้านค้า'; v_entity_id:=new.store_id;
  end if;
  insert into public.notifications(user_id,type,category,title,body,entity_type,entity_id)
    values(v_target,'approval','approval','ข้อความจากระบบ',
      'คำขอเปิด'||v_kind||'ของคุณได้รับการ'||case new.approval_status when 'approved' then 'อนุมัติ' else 'ปฏิเสธ' end||'แล้ว',
      tg_table_name,v_entity_id);
  return new;
end $$;
revoke all on function private.notify_approval() from public,anon,authenticated;

-- Restoring a previously approved store is not a new-store announcement.
create or replace function private.notify_followed_market_new_store()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if old.approval_status='pending' and new.approval_status='approved'
    and exists(select 1 from public.markets where market_id=new.market_id and approval_status='approved') then
    insert into public.notifications(user_id,type,category,title,body,entity_type,entity_id)
    select l.user_id,'follow_new_store','system','ร้านใหม่ในตลาดที่ติดตาม',
      new.name||' เปิดขายในตลาดที่คุณติดตามแล้ว','store',new.store_id
    from public.user_catalog_links l where l.kind='follow' and l.target_type='market'
      and l.target_id=new.market_id and l.user_id<>new.manager_id;
  end if;
  return new;
end $$;
revoke all on function private.notify_followed_market_new_store() from public,anon,authenticated;
