-- Admin access is role-based for V1. Email confirmation and MFA are not part
-- of the authorization decision; platform_roles remains server-controlled.
create or replace function private.is_admin(p_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user is not null
    and p_user = (select auth.uid())
    and exists (
      select 1
      from public.platform_roles
      where user_id = p_user and role = 'platform_admin'
    )
$$;
revoke all on function private.is_admin(uuid) from public, anon;
grant execute on function private.is_admin(uuid) to authenticated, service_role;

-- The previous Storage policies referenced an unqualified `name` inside a
-- subquery. PostgreSQL resolved it to markets.name/stores.name instead of the
-- object path, so valid owner uploads failed with an RLS violation.
drop policy if exists "Anyone can upload an avatar." on storage.objects;
drop policy if exists "Anyone can update their own avatar." on storage.objects;
drop policy if exists "Anyone can delete their own avatar." on storage.objects;
drop policy if exists locomall_upload_own on storage.objects;
drop policy if exists locomall_select_own on storage.objects;
drop policy if exists locomall_update_own on storage.objects;
drop policy if exists locomall_delete_own on storage.objects;

create policy locomall_upload_own on storage.objects for insert to authenticated
with check (
  (bucket_id = 'avatars' and (storage.foldername(storage.objects.name))[1] = (select auth.uid())::text)
  or (bucket_id = 'market-images' and exists (
    select 1 from public.markets m
    where m.market_id::text = (storage.foldername(storage.objects.name))[1]
      and m.owner_id = (select auth.uid())
  ))
  or (bucket_id = 'store-images' and exists (
    select 1 from public.stores s
    where s.store_id::text = (storage.foldername(storage.objects.name))[1]
      and s.manager_id = (select auth.uid())
  ))
);

create policy locomall_select_own on storage.objects for select to authenticated
using (
  (bucket_id = 'avatars' and (storage.foldername(storage.objects.name))[1] = (select auth.uid())::text)
  or (bucket_id = 'market-images' and exists (
    select 1 from public.markets m
    where m.market_id::text = (storage.foldername(storage.objects.name))[1]
      and m.owner_id = (select auth.uid())
  ))
  or (bucket_id = 'store-images' and exists (
    select 1 from public.stores s
    where s.store_id::text = (storage.foldername(storage.objects.name))[1]
      and s.manager_id = (select auth.uid())
  ))
);

create policy locomall_update_own on storage.objects for update to authenticated
using (
  (bucket_id = 'avatars' and (storage.foldername(storage.objects.name))[1] = (select auth.uid())::text)
  or (bucket_id = 'market-images' and exists (select 1 from public.markets m where m.market_id::text = (storage.foldername(storage.objects.name))[1] and m.owner_id = (select auth.uid())))
  or (bucket_id = 'store-images' and exists (select 1 from public.stores s where s.store_id::text = (storage.foldername(storage.objects.name))[1] and s.manager_id = (select auth.uid())))
)
with check (
  (bucket_id = 'avatars' and (storage.foldername(storage.objects.name))[1] = (select auth.uid())::text)
  or (bucket_id = 'market-images' and exists (select 1 from public.markets m where m.market_id::text = (storage.foldername(storage.objects.name))[1] and m.owner_id = (select auth.uid())))
  or (bucket_id = 'store-images' and exists (select 1 from public.stores s where s.store_id::text = (storage.foldername(storage.objects.name))[1] and s.manager_id = (select auth.uid())))
);

create policy locomall_delete_own on storage.objects for delete to authenticated
using (
  (bucket_id = 'avatars' and (storage.foldername(storage.objects.name))[1] = (select auth.uid())::text)
  or (bucket_id = 'market-images' and exists (select 1 from public.markets m where m.market_id::text = (storage.foldername(storage.objects.name))[1] and m.owner_id = (select auth.uid())))
  or (bucket_id = 'store-images' and exists (select 1 from public.stores s where s.store_id::text = (storage.foldername(storage.objects.name))[1] and s.manager_id = (select auth.uid())))
);

-- Request RPCs are idempotent. A retry updates the caller's pending request
-- and returns the same id instead of creating a duplicate after a later step
-- (such as image upload) failed.
create or replace function public.apply_for_market(
  p_name text,
  p_description text,
  p_subdistrict_code text,
  p_hub_address text,
  p_image_url text default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  loc public.user_locations;
  mid bigint;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if nullif(btrim(p_name), '') is null or nullif(btrim(p_hub_address), '') is null then raise exception 'name and hub address are required'; end if;
  select * into loc from public.user_locations where user_id = auth.uid() and subdistrict_code = p_subdistrict_code;
  if not found then raise exception 'market must be in your primary subdistrict'; end if;

  select market_id into mid
  from public.markets
  where owner_id = auth.uid() and approval_status = 'pending'
  order by created_at desc
  limit 1
  for update;

  if mid is null then
    insert into public.markets(owner_id,name,description,image_url,province_code,district_code,subdistrict_code,geography,hub_address)
    values(auth.uid(),btrim(p_name),btrim(coalesce(p_description,'')),p_image_url,loc.province_code,loc.district_code,loc.subdistrict_code,loc.geography,btrim(p_hub_address))
    returning market_id into mid;
    insert into public.approval_events(entity_type,entity_id,action,actor_id) values('market',mid,'submitted',auth.uid());
  else
    update public.markets
    set name=btrim(p_name),description=btrim(coalesce(p_description,'')),hub_address=btrim(p_hub_address),
        province_code=loc.province_code,district_code=loc.district_code,subdistrict_code=loc.subdistrict_code,
        geography=loc.geography,image_url=coalesce(p_image_url,image_url),updated_at=now()
    where market_id=mid;
  end if;
  return mid;
end $$;

create or replace function public.apply_to_open_store(
  p_market_id bigint,
  p_name text,
  p_product_name text,
  p_description text,
  p_unit text,
  p_unit_price numeric,
  p_image_url text default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.markets;
  sid bigint;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if nullif(btrim(p_name),'') is null or nullif(btrim(p_product_name),'') is null or nullif(btrim(p_unit),'') is null or p_unit_price <= 0 then raise exception 'invalid store details'; end if;
  select * into m from public.markets where market_id=p_market_id and approval_status='approved';
  if not found then raise exception 'market unavailable'; end if;
  if not exists(select 1 from public.user_locations where user_id=auth.uid() and subdistrict_code=m.subdistrict_code) then raise exception 'seller must be in the same subdistrict'; end if;

  select store_id into sid
  from public.stores
  where market_id=p_market_id and manager_id=auth.uid() and approval_status='pending' and lower(product_name)=lower(btrim(p_product_name))
  limit 1
  for update;

  if sid is null then
    insert into public.stores(market_id,manager_id,name,product_name,description,unit,unit_price,image_url)
    values(p_market_id,auth.uid(),btrim(p_name),btrim(p_product_name),btrim(coalesce(p_description,'')),btrim(p_unit),p_unit_price,p_image_url)
    returning store_id into sid;
    insert into public.approval_events(entity_type,entity_id,action,actor_id) values('store',sid,'submitted',auth.uid());
  else
    update public.stores
    set name=btrim(p_name),description=btrim(coalesce(p_description,'')),unit=btrim(p_unit),unit_price=p_unit_price,
        image_url=coalesce(p_image_url,image_url),updated_at=now()
    where store_id=sid;
  end if;
  return sid;
end $$;

create or replace function public.apply_to_sell_in_store(p_store_id bigint,p_note text default null)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  aid bigint;
  sd text;
  existing_status text;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select m.subdistrict_code into sd from public.stores s join public.markets m on m.market_id=s.market_id where s.store_id=p_store_id and s.approval_status='approved';
  if not found then raise exception 'store unavailable'; end if;
  if not exists(select 1 from public.user_locations where user_id=auth.uid() and subdistrict_code=sd) then raise exception 'seller must be in the same subdistrict'; end if;

  select application_id,status into aid,existing_status
  from public.store_seller_applications
  where store_id=p_store_id and applicant_id=auth.uid()
  for update;

  if aid is null then
    insert into public.store_seller_applications(store_id,applicant_id,note) values(p_store_id,auth.uid(),p_note) returning application_id into aid;
  elsif existing_status='rejected' then
    update public.store_seller_applications set status='pending',note=p_note,reviewed_by=null,reviewed_at=null,review_note=null where application_id=aid;
  else
    return aid;
  end if;
  insert into public.approval_events(entity_type,entity_id,action,actor_id) values('seller',aid,'submitted',auth.uid());
  return aid;
end $$;

-- Do not notify applicants that a freshly inserted request is merely pending.
create or replace function private.notify_approval()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare target uuid; label text;
begin
  if tg_op <> 'UPDATE' then return new; end if;
  if tg_table_name='markets' then target=new.owner_id; label=new.name;
  else target=new.manager_id; label=new.name; end if;
  if old.approval_status is distinct from new.approval_status then
    insert into public.notifications(user_id,type,title,body,entity_type,entity_id)
    values(target,'approval','ผลการตรวจสอบ '||label,case new.approval_status when 'approved' then 'คำขอได้รับการอนุมัติแล้ว' when 'rejected' then 'คำขอไม่ผ่านการอนุมัติ' else 'สถานะถูกเปลี่ยนเป็น '||new.approval_status end,tg_table_name,(case when tg_table_name='markets' then to_jsonb(new)->>'market_id' else to_jsonb(new)->>'store_id' end)::bigint);
  end if;
  return new;
end $$;

revoke execute on function public.apply_for_market(text,text,text,text,text) from public,anon;
revoke execute on function public.apply_to_open_store(bigint,text,text,text,text,numeric,text) from public,anon;
revoke execute on function public.apply_to_sell_in_store(bigint,text) from public,anon;
grant execute on function public.apply_for_market(text,text,text,text,text) to authenticated;
grant execute on function public.apply_to_open_store(bigint,text,text,text,text,numeric,text) to authenticated;
grant execute on function public.apply_to_sell_in_store(bigint,text) to authenticated;
