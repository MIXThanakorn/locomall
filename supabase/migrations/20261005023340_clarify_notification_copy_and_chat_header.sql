-- Notification rows are the single source for both the in-app list and Expo push.
create or replace function private.notify_chat_recipient()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_buyer uuid;
  v_manager uuid;
  v_product_name text;
  v_sender_name text;
  v_target uuid;
begin
  select r.buyer_id, s.manager_id, s.product_name,
    coalesce(nullif(btrim(p.display_name), ''), nullif(btrim(p.full_name), ''),
      nullif(btrim(p.username), ''), 'ผู้ใช้ Locomall')
  into v_buyer, v_manager, v_product_name, v_sender_name
  from public.chat_rooms r
  join public.stores s on s.store_id = r.store_id
  left join public.profiles p on p.user_id = new.sender_id
  where r.room_id = new.room_id;

  v_target := case when new.sender_id = v_buyer then v_manager else v_buyer end;
  if v_target is not null and v_target <> new.sender_id then
    insert into public.notifications(user_id, type, category, title, body, entity_type, entity_id)
    values(v_target, 'chat_message', 'chat', coalesce(nullif(btrim(v_product_name), ''), 'สินค้า'),
      v_sender_name || ': ' || left(replace(replace(new.message, chr(13), ' '), chr(10), ' '), 140),
      'chat', new.room_id);
  end if;
  return new;
end
$$;

create or replace function private.notify_new_order_allocation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id bigint;
  v_product_name text;
begin
  select o.order_id, i.product_name
  into v_order_id, v_product_name
  from public.order_items i
  join public.orders o on o.order_id = i.order_id
  where i.order_item_id = new.order_item_id;

  if not exists (
    select 1 from public.notifications n
    where n.user_id = new.seller_id and n.type = 'order_new'
      and n.entity_type = 'order' and n.entity_id = v_order_id
  ) then
    insert into public.notifications(user_id, type, category, title, body, entity_type, entity_id)
    values(new.seller_id, 'order_new', 'order', 'ออเดอร์ใหม่',
      'มีออเดอร์ใหม่สำหรับ ' || v_product_name || ' จำนวน ' || new.quantity || ' ชิ้น',
      'order', v_order_id);
  end if;
  return new;
end
$$;

create or replace function private.notify_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text;
  v_body text;
  v_seller_id uuid;
begin
  if old.status is not distinct from new.status then return new; end if;

  v_title := 'สถานะของออเดอร์ #' || coalesce(nullif(right(new.order_number, 8), ''), new.order_id::text);
  v_body := case new.status
    when 'preparing' then 'ผู้ขายกำลังเตรียมสินค้า'
    when 'at_hub' then 'สินค้ากำลังเข้าสู่จุดรวมสินค้า'
    when 'consolidated' then case when new.fulfillment_method = 'pickup'
      then 'สินค้าพร้อมให้รับที่จุดรวมแล้ว' else 'รวมสินค้าแล้ว พร้อมจัดส่งเป็นพัสดุเดียว' end
    when 'shipped' then 'สินค้ากำลังจัดส่ง' || coalesce(' · เลขติดตาม ' || new.tracking_number, '')
    when 'delivered' then 'ผู้ซื้อยืนยันว่าได้รับสินค้าแล้ว'
    when 'cancelled' then 'ออเดอร์ถูกยกเลิกแล้ว'
    else null
  end;

  if v_body is not null then
    insert into public.notifications(user_id, type, category, title, body, entity_type, entity_id)
    values(new.buyer_id, 'order_status', 'order', v_title,
      case when new.status = 'delivered' then 'คุณยืนยันว่าได้รับสินค้าแล้ว' else v_body end,
      'order', new.order_id);

    for v_seller_id in
      select distinct a.seller_id
      from public.order_allocations a
      join public.order_items i on i.order_item_id = a.order_item_id
      where i.order_id = new.order_id and a.seller_id <> new.buyer_id
    loop
      insert into public.notifications(user_id, type, category, title, body, entity_type, entity_id)
      values(v_seller_id, 'order_status', 'order', v_title, v_body, 'order', new.order_id);
    end loop;
  end if;
  return new;
end
$$;

create or replace function private.notify_approval()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target uuid;
  v_kind text;
  v_entity_id bigint;
begin
  if tg_op <> 'UPDATE' or old.approval_status is not distinct from new.approval_status
    or new.approval_status not in ('approved', 'rejected') then
    return new;
  end if;

  if tg_table_name = 'markets' then
    v_target := new.owner_id;
    v_kind := 'ตลาด';
    v_entity_id := new.market_id;
  else
    v_target := new.manager_id;
    v_kind := 'ร้านค้า';
    v_entity_id := new.store_id;
  end if;

  insert into public.notifications(user_id, type, category, title, body, entity_type, entity_id)
  values(v_target, 'approval', 'approval', 'ข้อความจากระบบ',
    'คำขอเปิด' || v_kind || 'ของคุณได้รับการ' ||
      case new.approval_status when 'approved' then 'อนุมัติ' else 'ปฏิเสธ' end || 'แล้ว',
    tg_table_name, v_entity_id);
  return new;
end
$$;

revoke execute on function private.notify_chat_recipient() from public, anon, authenticated;
revoke execute on function private.notify_new_order_allocation() from public, anon, authenticated;
revoke execute on function private.notify_order_status_change() from public, anon, authenticated;
revoke execute on function private.notify_approval() from public, anon, authenticated;
