create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  insert into public.profiles(user_id,full_name,display_name,username,phone_num,age,gender,user_img_url)
  values(new.id,coalesce(new.raw_user_meta_data->>'full_name','ผู้ใช้ Locomall'),coalesce(new.raw_user_meta_data->>'full_name','ผู้ใช้ Locomall'),
    nullif(new.raw_user_meta_data->>'username',''),nullif(new.raw_user_meta_data->>'phone_num',''),
    nullif(new.raw_user_meta_data->>'age','')::integer,nullif(new.raw_user_meta_data->>'gender',''),nullif(new.raw_user_meta_data->>'avatar_url',''))
  on conflict(user_id) do nothing;
  return new;
end $$;
revoke execute on function public.handle_new_user() from public,anon,authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.upsert_cart_item(p_store_id bigint,p_quantity integer)
returns void language plpgsql security definer set search_path='' as $$
declare uid uuid=auth.uid(); mid bigint; cid bigint; current_market bigint; begin
  if uid is null or p_quantity<=0 then raise exception 'invalid cart item'; end if;
  select market_id into mid from public.stores where store_id=p_store_id and approval_status='approved';
  if not found then raise exception 'store unavailable'; end if;
  insert into public.carts(buyer_id,market_id) values(uid,mid) on conflict(buyer_id) do nothing;
  select cart_id,market_id into cid,current_market from public.carts where buyer_id=uid for update;
  if current_market is distinct from mid and exists(select 1 from public.cart_items where cart_id=cid) then raise exception 'cart may contain one market only'; end if;
  update public.carts set market_id=mid,updated_at=now() where cart_id=cid;
  insert into public.cart_items(cart_id,store_id,quantity) values(cid,p_store_id,p_quantity)
  on conflict(cart_id,store_id) do update set quantity=excluded.quantity;
end $$;

create or replace function public.remove_cart_item(p_store_id bigint)
returns void language plpgsql security invoker set search_path='' as $$ begin
  delete from public.cart_items where store_id=p_store_id and cart_id=(select cart_id from public.carts where buyer_id=auth.uid());
end
$$;

create or replace function private.notify_approval() returns trigger
language plpgsql security definer set search_path='' as $$
declare target uuid; label text; begin
 if tg_table_name='markets' then target=new.owner_id; label=new.name;
 else target=new.manager_id; label=new.name; end if;
 if old.approval_status is distinct from new.approval_status then
  insert into public.notifications(user_id,type,title,body,entity_type,entity_id)
  values(target,'approval','ผลการตรวจสอบ '||label,case new.approval_status when 'approved' then 'คำขอได้รับการอนุมัติแล้ว' when 'rejected' then 'คำขอไม่ผ่านการอนุมัติ' else 'สถานะถูกเปลี่ยนเป็น '||new.approval_status end,tg_table_name,(case when tg_table_name='markets' then to_jsonb(new)->>'market_id' else to_jsonb(new)->>'store_id' end)::bigint);
 end if; return new;
end $$;
drop trigger if exists market_approval_notification on public.markets;
create trigger market_approval_notification after update of approval_status on public.markets for each row execute function private.notify_approval();
drop trigger if exists store_approval_notification on public.stores;
create trigger store_approval_notification after update of approval_status on public.stores for each row execute function private.notify_approval();

revoke execute on all functions in schema public from public,anon,authenticated;
grant execute on function public.complete_location_onboarding(text,text,text,double precision,double precision,boolean) to authenticated;
grant execute on function public.discover_nearby(text,text,integer) to anon,authenticated;
grant execute on function public.apply_for_market(text,text,text,text,text) to authenticated;
grant execute on function public.review_market(bigint,boolean,text) to authenticated;
grant execute on function public.apply_to_open_store(bigint,text,text,text,text,numeric,text) to authenticated;
grant execute on function public.review_store(bigint,boolean,text) to authenticated;
grant execute on function public.apply_to_sell_in_store(bigint,text) to authenticated;
grant execute on function public.review_store_seller(bigint,boolean,text) to authenticated;
grant execute on function public.update_my_listing_stock(bigint,integer,text) to authenticated;
grant execute on function public.upsert_cart_item(bigint,integer) to authenticated;
grant execute on function public.remove_cart_item(bigint) to authenticated;
grant execute on function public.create_cod_order(bigint,bigint,jsonb) to authenticated;
grant execute on function public.mark_allocation_ready(bigint) to authenticated;
grant execute on function public.record_allocation_collected(bigint) to authenticated;
grant execute on function public.record_allocation_at_hub(bigint) to authenticated;
grant execute on function public.consolidate_order(bigint) to authenticated;
grant execute on function public.ship_order(bigint,text,text) to authenticated;
grant execute on function public.confirm_delivery(bigint) to authenticated;
grant execute on function public.cancel_order(bigint,text,boolean) to authenticated;
