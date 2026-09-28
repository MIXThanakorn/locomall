create or replace function private.notify_new_order_allocation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id bigint;
  v_order_number text;
  v_product_name text;
begin
  select o.order_id,o.order_number,i.product_name
  into v_order_id,v_order_number,v_product_name
  from public.order_items i
  join public.orders o on o.order_id=i.order_id
  where i.order_item_id=new.order_item_id;

  if not exists (
    select 1 from public.notifications n
    where n.user_id=new.seller_id and n.type='order_new' and n.entity_type='order' and n.entity_id=v_order_id
  ) then
    insert into public.notifications(user_id,type,category,title,body,entity_type,entity_id)
    values(new.seller_id,'order_new','order','มีคำสั่งซื้อใหม่',
      'ออเดอร์ '||v_order_number||' มี '||v_product_name||' จำนวน '||new.quantity||' ชิ้นที่รอคุณรับงาน',
      'order',v_order_id);
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
begin
  if old.status is not distinct from new.status then return new; end if;
  select case new.status
    when 'preparing' then 'ผู้ขายกำลังเตรียมสินค้า'
    when 'at_hub' then 'สินค้ากำลังรวมที่จุดรวม'
    when 'consolidated' then case when new.fulfillment_method='pickup' then 'สินค้าพร้อมนัดรับแล้ว' else 'รวมสินค้าเรียบร้อยแล้ว' end
    when 'shipped' then 'จัดส่งสินค้าแล้ว'
    when 'cancelled' then 'คำสั่งซื้อถูกยกเลิก'
    else null end,
  case new.status
    when 'preparing' then 'ออเดอร์ '||new.order_number||' เริ่มเตรียมสินค้าแล้ว'
    when 'at_hub' then 'สินค้าของออเดอร์ '||new.order_number||' กำลังเข้าสู่จุดรวม'
    when 'consolidated' then case when new.fulfillment_method='pickup' then 'ออเดอร์ '||new.order_number||' พร้อมให้รับที่จุดรวมสินค้า' else 'ออเดอร์ '||new.order_number||' พร้อมจัดส่งเป็นพัสดุเดียว' end
    when 'shipped' then 'ออเดอร์ '||new.order_number||' อยู่ระหว่างจัดส่ง'||coalesce(' เลขติดตาม '||new.tracking_number,'')
    when 'cancelled' then 'ออเดอร์ '||new.order_number||' ถูกยกเลิกแล้ว'
    else null end
  into v_title,v_body;
  if v_title is not null then
    insert into public.notifications(user_id,type,category,title,body,entity_type,entity_id)
    values(new.buyer_id,'order_status','order',v_title,v_body,'order',new.order_id);
  end if;
  return new;
end
$$;

create or replace function private.notify_allocation_ready()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_order_id bigint;
  v_order_number text;
  v_product_name text;
begin
  if old.status is not distinct from new.status or new.status <> 'ready_for_pickup' then return new; end if;
  select m.owner_id,o.order_id,o.order_number,i.product_name
  into v_owner,v_order_id,v_order_number,v_product_name
  from public.order_items i
  join public.orders o on o.order_id=i.order_id
  join public.markets m on m.market_id=o.market_id
  where i.order_item_id=new.order_item_id;
  insert into public.notifications(user_id,type,category,title,body,entity_type,entity_id)
  values(v_owner,'order_allocation_ready','order','ผู้ขายเตรียมสินค้าเสร็จแล้ว',
    v_product_name||' ของออเดอร์ '||v_order_number||' พร้อมให้รับเข้าจุดรวม',
    'order',v_order_id);
  return new;
end
$$;

create or replace function private.notify_chat_recipient()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_buyer uuid;
  v_manager uuid;
  v_store_name text;
  v_target uuid;
begin
  select r.buyer_id,s.manager_id,s.name
  into v_buyer,v_manager,v_store_name
  from public.chat_rooms r join public.stores s on s.store_id=r.store_id
  where r.room_id=new.room_id;
  v_target := case when new.sender_id=v_buyer then v_manager else v_buyer end;
  if v_target is not null and v_target <> new.sender_id then
    insert into public.notifications(user_id,type,category,title,body,entity_type,entity_id)
    values(v_target,'chat_message','chat','ข้อความใหม่จาก '||v_store_name,
      left(replace(replace(new.message,chr(13),' '),chr(10),' '),140),'chat',new.room_id);
  end if;
  return new;
end
$$;

drop trigger if exists order_allocation_created_notification on public.order_allocations;
create trigger order_allocation_created_notification after insert on public.order_allocations
for each row execute function private.notify_new_order_allocation();

drop trigger if exists order_status_notification on public.orders;
create trigger order_status_notification after update of status on public.orders
for each row execute function private.notify_order_status_change();

drop trigger if exists allocation_ready_notification on public.order_allocations;
create trigger allocation_ready_notification after update of status on public.order_allocations
for each row execute function private.notify_allocation_ready();

drop trigger if exists chat_message_notification on public.chat_messages;
create trigger chat_message_notification after insert on public.chat_messages
for each row execute function private.notify_chat_recipient();

revoke execute on function private.notify_new_order_allocation() from public,anon,authenticated;
revoke execute on function private.notify_order_status_change() from public,anon,authenticated;
revoke execute on function private.notify_allocation_ready() from public,anon,authenticated;
revoke execute on function private.notify_chat_recipient() from public,anon,authenticated;
