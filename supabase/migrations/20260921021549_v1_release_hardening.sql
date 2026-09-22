-- V1 release hardening: atomic cart increments, controlled catalog imagery,
-- and strict ownership-based Storage paths.

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values
  ('avatars','avatars',true,5242880,array['image/jpeg','image/png','image/webp']),
  ('market-images','market-images',true,5242880,array['image/jpeg','image/png','image/webp']),
  ('store-images','store-images',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set
  public=excluded.public,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists locomall_upload_own on storage.objects;
drop policy if exists locomall_update_own on storage.objects;
drop policy if exists locomall_delete_own on storage.objects;
drop policy if exists locomall_select_own on storage.objects;

create policy locomall_upload_own on storage.objects for insert to authenticated
with check (
  (bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text)
  or (bucket_id='market-images' and exists(
    select 1 from public.markets m
    where m.market_id::text=(storage.foldername(name))[1]
      and m.owner_id=(select auth.uid())
  ))
  or (bucket_id='store-images' and exists(
    select 1 from public.stores s
    where s.store_id::text=(storage.foldername(name))[1]
      and s.manager_id=(select auth.uid())
  ))
);

create policy locomall_select_own on storage.objects for select to authenticated
using (
  (bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text)
  or (bucket_id='market-images' and exists(
    select 1 from public.markets m
    where m.market_id::text=(storage.foldername(name))[1]
      and m.owner_id=(select auth.uid())
  ))
  or (bucket_id='store-images' and exists(
    select 1 from public.stores s
    where s.store_id::text=(storage.foldername(name))[1]
      and s.manager_id=(select auth.uid())
  ))
);

create policy locomall_update_own on storage.objects for update to authenticated
using (
  (bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text)
  or (bucket_id='market-images' and exists(select 1 from public.markets m where m.market_id::text=(storage.foldername(name))[1] and m.owner_id=(select auth.uid())))
  or (bucket_id='store-images' and exists(select 1 from public.stores s where s.store_id::text=(storage.foldername(name))[1] and s.manager_id=(select auth.uid())))
)
with check (
  (bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text)
  or (bucket_id='market-images' and exists(select 1 from public.markets m where m.market_id::text=(storage.foldername(name))[1] and m.owner_id=(select auth.uid())))
  or (bucket_id='store-images' and exists(select 1 from public.stores s where s.store_id::text=(storage.foldername(name))[1] and s.manager_id=(select auth.uid())))
);

create policy locomall_delete_own on storage.objects for delete to authenticated
using (
  (bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text)
  or (bucket_id='market-images' and exists(select 1 from public.markets m where m.market_id::text=(storage.foldername(name))[1] and m.owner_id=(select auth.uid())))
  or (bucket_id='store-images' and exists(select 1 from public.stores s where s.store_id::text=(storage.foldername(name))[1] and s.manager_id=(select auth.uid())))
);

create or replace function public.increment_cart_item(p_store_id bigint,p_increment integer default 1)
returns integer language plpgsql security definer set search_path='' as $$
declare
  uid uuid := auth.uid();
  mid bigint;
  cid bigint;
  current_market bigint;
  next_quantity integer;
  available integer;
begin
  if uid is null or p_increment <= 0 or p_increment > 999 then
    raise exception 'invalid cart increment';
  end if;

  select market_id into mid
  from public.stores
  where store_id=p_store_id and approval_status='approved';
  if not found then raise exception 'store unavailable'; end if;

  select coalesce(sum(stock_quantity-reserved_quantity),0)::integer into available
  from public.seller_listings
  where store_id=p_store_id and status='active';

  insert into public.carts(buyer_id,market_id) values(uid,mid)
  on conflict(buyer_id) do nothing;
  select cart_id,market_id into cid,current_market
  from public.carts where buyer_id=uid for update;

  if current_market is distinct from mid
     and exists(select 1 from public.cart_items where cart_id=cid) then
    raise exception 'cart may contain one market only';
  end if;

  update public.carts set market_id=mid,updated_at=now() where cart_id=cid;
  select coalesce(quantity,0)+p_increment into next_quantity
  from public.cart_items where cart_id=cid and store_id=p_store_id for update;
  if not found then next_quantity:=p_increment; end if;
  if next_quantity > available then raise exception 'requested quantity exceeds available stock'; end if;

  insert into public.cart_items(cart_id,store_id,quantity)
  values(cid,p_store_id,next_quantity)
  on conflict(cart_id,store_id) do update set quantity=excluded.quantity;
  return next_quantity;
end $$;

create or replace function public.set_market_image(p_market_id bigint,p_image_url text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null
     or not exists(select 1 from public.markets where market_id=p_market_id and owner_id=auth.uid())
     or p_image_url not like '%/market-images/'||p_market_id::text||'/%' then
    raise exception 'invalid market image';
  end if;
  update public.markets set image_url=p_image_url,updated_at=now() where market_id=p_market_id;
end $$;

create or replace function public.set_store_image(p_store_id bigint,p_image_url text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null
     or not exists(select 1 from public.stores where store_id=p_store_id and manager_id=auth.uid())
     or p_image_url not like '%/store-images/'||p_store_id::text||'/%' then
    raise exception 'invalid store image';
  end if;
  update public.stores set image_url=p_image_url,updated_at=now() where store_id=p_store_id;
end $$;

revoke execute on function public.increment_cart_item(bigint,integer) from public,anon;
revoke execute on function public.set_market_image(bigint,text) from public,anon;
revoke execute on function public.set_store_image(bigint,text) from public,anon;
grant execute on function public.increment_cart_item(bigint,integer) to authenticated;
grant execute on function public.set_market_image(bigint,text) to authenticated;
grant execute on function public.set_store_image(bigint,text) to authenticated;
