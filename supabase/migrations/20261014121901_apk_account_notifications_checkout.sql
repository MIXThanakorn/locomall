-- Archive read inbox rows, preserving deduplication and audit/history records.
alter table public.notifications add column if not exists dismissed_at timestamptz;

create or replace function private.dismiss_my_read_notifications()
returns integer language plpgsql security definer set search_path='' as $$
declare affected integer;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  update public.notifications set dismissed_at=now()
    where user_id=auth.uid() and read_at is not null and dismissed_at is null and category<>'chat';
  get diagnostics affected=row_count;
  return affected;
end $$;
create or replace function public.dismiss_my_read_notifications()
returns integer language sql security invoker set search_path='' as $$
  select private.dismiss_my_read_notifications()
$$;
revoke all on function private.dismiss_my_read_notifications() from public,anon;
revoke all on function public.dismiss_my_read_notifications() from public,anon;
grant execute on function private.dismiss_my_read_notifications(),public.dismiss_my_read_notifications() to authenticated;

-- Notify only the actual reviewer. Market owners' self-applications need admin.
create or replace function private.notify_pending_commerce_request()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_owner uuid; v_applicant uuid; v_name text; v_kind text; v_id bigint; v_applicant_name text;
begin
  if tg_table_name='stores' then
    if new.approval_status<>'pending' then return new; end if;
    if tg_op='UPDATE' then
      if old.approval_status='pending' then return new; end if;
    end if;
    select owner_id into v_owner from public.markets where market_id=new.market_id;
    v_applicant:=new.manager_id; v_name:=new.name; v_kind:='store_request'; v_id:=new.store_id;
  else
    if new.status<>'pending' then return new; end if;
    if tg_op='UPDATE' then
      if old.status='pending' then return new; end if;
    end if;
    select m.owner_id,s.name into v_owner,v_name from public.stores s
      join public.markets m on m.market_id=s.market_id where s.store_id=new.store_id;
    v_applicant:=new.applicant_id; v_kind:='seller_request'; v_id:=new.application_id;
  end if;
  select coalesce(nullif(username,''),nullif(display_name,''),nullif(full_name,''),'ผู้สมัคร')
    into v_applicant_name from public.profiles where user_id=v_applicant;
  insert into public.notifications(user_id,type,category,title,body,entity_type,entity_id)
    select recipient,'approval_request','approval','ข้อความจากระบบ',
      coalesce(v_applicant_name,'ผู้สมัคร')||case when v_kind='store_request' then ' ขอเปิดร้าน ' else ' ขอขายร่วมในร้าน ' end
      ||v_name||' · รอการอนุมัติ',v_kind,v_id
    from (
      select v_owner as recipient where v_owner is distinct from v_applicant
      union
      select user_id from public.platform_roles where role='platform_admin' and v_owner=v_applicant
    ) reviewers where recipient is not null and recipient is distinct from v_applicant;
  return new;
end $$;
revoke all on function private.notify_pending_commerce_request() from public,anon,authenticated;
create trigger pending_store_request_notification after insert or update of approval_status on public.stores
  for each row execute function private.notify_pending_commerce_request();
create trigger pending_seller_request_notification after insert or update of status on public.store_seller_applications
  for each row execute function private.notify_pending_commerce_request();

-- Private identity projection scoped to the reviewer/market owner, not buyers.
create or replace function private.get_market_seller_contacts(p_order_id bigint default null)
returns table(allocation_id bigint,order_id bigint,seller_name text,seller_username text,seller_phone text)
language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  return query select a.allocation_id,o.order_id,
    coalesce(nullif(p.display_name,''),nullif(p.full_name,''),nullif(p.username,''),'ผู้ขาย')::text,
    p.username::text,p.phone_num::text
    from public.order_allocations a join public.order_items i on i.order_item_id=a.order_item_id
    join public.orders o on o.order_id=i.order_id join public.markets m on m.market_id=o.market_id
    join public.profiles p on p.user_id=a.seller_id
    where (m.owner_id=auth.uid() or private.is_admin())
      and (p_order_id is null or o.order_id=p_order_id)
      and (p_order_id is not null or o.status not in ('delivered','cancelled'));
end $$;
create or replace function public.get_market_seller_contacts(p_order_id bigint default null)
returns table(allocation_id bigint,order_id bigint,seller_name text,seller_username text,seller_phone text)
language sql stable security invoker set search_path='' as $$
  select * from private.get_market_seller_contacts(p_order_id)
$$;
revoke all on function private.get_market_seller_contacts(bigint),public.get_market_seller_contacts(bigint) from public,anon;
grant execute on function private.get_market_seller_contacts(bigint),public.get_market_seller_contacts(bigint) to authenticated;

create or replace function private.get_market_application_contacts()
returns table(application_id bigint,applicant_name text,applicant_username text,applicant_phone text)
language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  return query select a.application_id,
    coalesce(nullif(p.display_name,''),nullif(p.full_name,''),nullif(p.username,''),'ผู้สมัคร')::text,
    p.username::text,p.phone_num::text
    from public.store_seller_applications a join public.stores s on s.store_id=a.store_id
    join public.markets m on m.market_id=s.market_id join public.profiles p on p.user_id=a.applicant_id
    where a.status='pending' and (m.owner_id=auth.uid() or private.is_admin());
end $$;
create or replace function public.get_market_application_contacts()
returns table(application_id bigint,applicant_name text,applicant_username text,applicant_phone text)
language sql stable security invoker set search_path='' as $$ select * from private.get_market_application_contacts() $$;
revoke all on function private.get_market_application_contacts(),public.get_market_application_contacts() from public,anon;
grant execute on function private.get_market_application_contacts(),public.get_market_application_contacts() to authenticated;

-- Resolve from the owned notification, never trust push-provided ownership.
create or replace function private.get_my_notification_target(p_notification_id bigint)
returns table(entity_type text,entity_id bigint)
language plpgsql stable security definer set search_path='' as $$
declare n public.notifications; v_allocation bigint;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into n from public.notifications where notification_id=p_notification_id and user_id=auth.uid();
  if not found then return; end if;
  if n.entity_type='order' then
    if n.type in ('order_all_at_hub','order_allocation_ready') then
      return query select 'order_hub_ready'::text,n.entity_id; return;
    end if;
    select a.allocation_id into v_allocation from public.order_allocations a
      join public.order_items i on i.order_item_id=a.order_item_id
      join public.orders o on o.order_id=i.order_id
      where i.order_id=n.entity_id and a.seller_id=auth.uid() and o.buyer_id<>auth.uid()
      order by a.allocation_id limit 1;
    if v_allocation is not null then return query select 'allocation'::text,v_allocation; return; end if;
  elsif n.entity_type in ('stores','store') and n.type='approval' then
    return query select 'my_store'::text,n.entity_id; return;
  elsif n.entity_type in ('markets','market') and n.type='approval' then
    return query select 'my_market'::text,n.entity_id; return;
  end if;
  return query select n.entity_type,n.entity_id;
end $$;
create or replace function public.get_my_notification_target(p_notification_id bigint)
returns table(entity_type text,entity_id bigint)
language sql stable security invoker set search_path='' as $$ select * from private.get_my_notification_target(p_notification_id) $$;
revoke all on function private.get_my_notification_target(bigint),public.get_my_notification_target(bigint) from public,anon;
grant execute on function private.get_my_notification_target(bigint),public.get_my_notification_target(bigint) to authenticated;
