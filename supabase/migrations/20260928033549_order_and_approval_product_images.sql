-- Keep a historical image on each order item so order evidence does not change
-- when a store later replaces its catalog image.
alter table public.order_items
  add column if not exists product_image_url text;

update public.order_items oi
set product_image_url=s.image_url
from public.stores s
where s.store_id=oi.store_id
  and oi.product_image_url is null;

create or replace function private.snapshot_order_item_image()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
begin
  if new.product_image_url is null then
    select s.image_url into new.product_image_url
    from public.stores s
    where s.store_id=new.store_id;
  end if;
  return new;
end
$$;

drop trigger if exists snapshot_order_item_image on public.order_items;
create trigger snapshot_order_item_image
before insert on public.order_items
for each row execute function private.snapshot_order_item_image();

revoke all on function private.snapshot_order_item_image() from public,anon,authenticated;

-- A seller applicant submits a photo of their actual product. Existing pending
-- applications fall back to the store catalog image until they are resubmitted.
alter table public.store_seller_applications
  add column if not exists product_image_url text;

update public.store_seller_applications a
set product_image_url=s.image_url
from public.stores s
where s.store_id=a.store_id
  and a.product_image_url is null;

drop function if exists public.apply_to_sell_in_store(bigint,text);

create function public.apply_to_sell_in_store(
  p_store_id bigint,
  p_note text default null,
  p_product_image_url text default null
)
returns bigint
language plpgsql
security definer
set search_path=''
as $$
declare
  aid bigint;
  sd text;
  existing_status text;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if nullif(btrim(coalesce(p_product_image_url,'')),'') is null
     or position('/object/public/avatars/'||auth.uid()::text||'/' in p_product_image_url)=0 then
    raise exception 'valid product image required';
  end if;

  select m.subdistrict_code into sd
  from public.stores s
  join public.markets m on m.market_id=s.market_id
  where s.store_id=p_store_id and s.approval_status='approved';
  if not found then raise exception 'store unavailable'; end if;
  if not exists(
    select 1 from public.user_locations
    where user_id=auth.uid() and subdistrict_code=sd
  ) then raise exception 'seller must be in the same subdistrict'; end if;

  select application_id,status into aid,existing_status
  from public.store_seller_applications
  where store_id=p_store_id and applicant_id=auth.uid()
  for update;

  if aid is null then
    insert into public.store_seller_applications(store_id,applicant_id,note,product_image_url)
    values(p_store_id,auth.uid(),p_note,p_product_image_url)
    returning application_id into aid;
  elsif existing_status='rejected' then
    update public.store_seller_applications
    set status='pending',
        note=p_note,
        product_image_url=p_product_image_url,
        reviewed_by=null,
        reviewed_at=null,
        review_note=null
    where application_id=aid;
  else
    return aid;
  end if;

  insert into public.approval_events(entity_type,entity_id,action,actor_id)
  values('seller',aid,'submitted',auth.uid());
  return aid;
end
$$;

revoke execute on function public.apply_to_sell_in_store(bigint,text,text) from public,anon;
grant execute on function public.apply_to_sell_in_store(bigint,text,text) to authenticated;
