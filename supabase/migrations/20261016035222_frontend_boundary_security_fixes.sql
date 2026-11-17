-- Historical orders intentionally keep NULL: the current address is not proof
-- of the address at checkout. Never silently backfill history from mutable data.
alter table public.orders add column delivery_address_snapshot jsonb;
create function private.snapshot_delivery_address() returns trigger
language plpgsql security definer set search_path='' as $$
declare a public.user_addresses; location jsonb;
begin
  if tg_op='UPDATE' then
    if new.delivery_address_snapshot is distinct from old.delivery_address_snapshot then
      raise exception 'delivery address snapshot is immutable';
    end if;
    return new;
  end if;
  new.delivery_address_snapshot:=null;
  if new.fulfillment_method='delivery' then
    select * into a from public.user_addresses where address_id=new.address_id and user_id=new.buyer_id for share;
    if not found then raise exception 'invalid address'; end if;
    select jsonb_build_object('subdistrict',s.name_th,'district',d.name_th,'province',p.name_th)
      into location from public.thai_subdistricts s join public.thai_districts d on d.code=s.district_code
      join public.thai_provinces p on p.code=d.province_code where s.code=a.subdistrict_code;
    new.delivery_address_snapshot:=jsonb_build_object('recipient_name',a.recipient_name,'phone',a.phone,
      'address_line',a.address_line,'subdistrict_code',a.subdistrict_code,'postal_code',a.postal_code,'location',location);
  end if;
  return new;
end $$;
revoke all on function private.snapshot_delivery_address() from public,anon,authenticated;
create trigger orders_snapshot_delivery_address before insert or update of delivery_address_snapshot on public.orders
  for each row execute function private.snapshot_delivery_address();

-- Enforce limits at the DB boundary, not just maxLength on UI controls.
create function private.guard_profile_and_commerce_input() returns trigger
language plpgsql security definer set search_path='' as $$
declare doc jsonb:=to_jsonb(new); field text; max_length integer;
begin
  foreach field in array array['name','product_name','hub_address','description','recipient_name','phone','address_line','display_name','bio','image_url','user_img_url'] loop
    if doc ? field then
      max_length:=case field when 'description' then 1500 when 'hub_address' then 500 when 'address_line' then 500
        when 'bio' then 500 when 'image_url' then 2048 when 'user_img_url' then 2048 when 'phone' then 20 else 120 end;
      if length(doc->>field)>max_length then raise exception 'input too long: % (max %)',field,max_length; end if;
    end if;
  end loop;
  if tg_table_name='user_addresses' and coalesce(doc->>'phone','') !~ '^0[0-9]{9}$' then raise exception 'invalid address phone'; end if;
  if auth.uid() is not null then
    -- Same-user mutations serialize the count check and cannot evade quotas via UPDATE.
    perform private.consume_business_limit('mutate_'||tg_table_name,30,60);
    if tg_table_name='user_addresses' and tg_op='INSERT'
      and (select count(*) from public.user_addresses where user_id=auth.uid())>=20 then raise exception 'too many addresses'; end if;
    if tg_table_name='chat_rooms' and tg_op='INSERT'
      and (select count(*) from public.chat_rooms where buyer_id=auth.uid())>=200 then raise exception 'too many chat rooms'; end if;
  end if;
  return new;
end $$;
revoke all on function private.guard_profile_and_commerce_input() from public,anon,authenticated;
create trigger bounded_market_input before insert or update on public.markets for each row execute function private.guard_profile_and_commerce_input();
create trigger bounded_store_input before insert or update on public.stores for each row execute function private.guard_profile_and_commerce_input();
create trigger bounded_address_input before insert or update on public.user_addresses for each row execute function private.guard_profile_and_commerce_input();
create trigger bounded_chat_rooms before insert on public.chat_rooms for each row execute function private.guard_profile_and_commerce_input();
create trigger bounded_profile_input before insert or update on public.profiles for each row execute function private.guard_profile_and_commerce_input();

-- Indexes cover FK joins; no unused index is dropped based on prototype traffic.
create index if not exists demo_ledger_order_idx on public.demo_ledger(order_id);
create index if not exists demo_settlements_recorder_idx on public.demo_settlements(recorded_by);
create index if not exists demo_settlements_seller_idx on public.demo_settlements(seller_id);
create index if not exists demo_topups_decider_idx on public.demo_topup_requests(decided_by);
create index if not exists purchase_reviews_buyer_idx on public.purchase_reviews(buyer_id);
create index if not exists purchase_reviews_moderator_idx on public.purchase_reviews(hidden_by);
CREATE OR REPLACE FUNCTION public.update_store(p_store_id bigint, p_name text, p_product_name text, p_description text, p_unit text, p_unit_price numeric, p_image_url text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if nullif(btrim(p_name),'') is null
     or nullif(btrim(p_product_name),'') is null
     or nullif(btrim(p_unit),'') is null
     or p_unit_price is null or p_unit_price <= 0 then
    raise exception 'invalid store details';
  end if;

  if exists(select 1 from public.stores s where s.store_id=p_store_id and (s.manager_id=auth.uid() or private.is_admin())
    and row(s.name,s.product_name,s.description,s.unit,s.unit_price,s.image_url) is not distinct from row(btrim(p_name),btrim(p_product_name),btrim(coalesce(p_description,'')),btrim(p_unit),p_unit_price,coalesce(p_image_url,s.image_url))) then return; end if;
  update public.stores s
  set name = btrim(p_name),
      product_name = btrim(p_product_name),
      description = btrim(coalesce(p_description,'')),
      unit = btrim(p_unit),
      unit_price = p_unit_price,
      image_url = coalesce(p_image_url,s.image_url),
      updated_at = now()
  where s.store_id = p_store_id
    and (s.manager_id = auth.uid() or (select private.is_admin()));

  if not found then raise exception 'forbidden or store unavailable'; end if;

  insert into public.admin_audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'update_store','store',p_store_id,jsonb_build_object('name',btrim(p_name),'unit_price',p_unit_price));
end
$function$;

CREATE OR REPLACE FUNCTION public.update_market(p_market_id bigint, p_name text, p_description text, p_hub_address text, p_image_url text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if nullif(btrim(p_name),'') is null or nullif(btrim(p_hub_address),'') is null then
    raise exception 'name and hub address are required';
  end if;

  if exists(select 1 from public.markets s where s.market_id=p_market_id and (s.owner_id=auth.uid() or private.is_admin())
    and row(s.name,s.description,s.hub_address,s.image_url) is not distinct from row(btrim(p_name),btrim(coalesce(p_description,'')),btrim(p_hub_address),coalesce(p_image_url,s.image_url))) then return; end if;
  update public.markets m
  set name = btrim(p_name),
      description = btrim(coalesce(p_description,'')),
      hub_address = btrim(p_hub_address),
      image_url = coalesce(p_image_url,m.image_url),
      updated_at = now()
  where m.market_id = p_market_id
    and (m.owner_id = auth.uid() or (select private.is_admin()));

  if not found then raise exception 'forbidden or market unavailable'; end if;

  insert into public.admin_audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'update_market','market',p_market_id,jsonb_build_object('name',btrim(p_name)));
end
$function$;

CREATE OR REPLACE FUNCTION public.save_my_address(p_address_id bigint, p_recipient_name text, p_phone text, p_address_line text, p_subdistrict_code text, p_is_default boolean DEFAULT false)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare aid bigint; postal text;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if nullif(btrim(p_recipient_name),'') is null or nullif(btrim(p_phone),'') is null or nullif(btrim(p_address_line),'') is null then
    raise exception 'address fields are required';
  end if;
  select postal_code into postal from public.thai_subdistricts where code=p_subdistrict_code;
  if not found then raise exception 'invalid subdistrict'; end if;
  if p_is_default then update public.user_addresses set is_default=false where user_id=auth.uid() and is_default=true and address_id is distinct from p_address_id; end if;
  if p_address_id is null then
    insert into public.user_addresses(user_id,recipient_name,phone,address_line,subdistrict_code,postal_code,is_default)
    values(auth.uid(),btrim(p_recipient_name),btrim(p_phone),btrim(p_address_line),p_subdistrict_code,postal,coalesce(p_is_default,false))
    returning address_id into aid;
  else
    update public.user_addresses set recipient_name=btrim(p_recipient_name),phone=btrim(p_phone),address_line=btrim(p_address_line),
      subdistrict_code=p_subdistrict_code,postal_code=postal,is_default=coalesce(p_is_default,false),updated_at=now()
    where address_id=p_address_id and user_id=auth.uid() returning address_id into aid;
    if aid is null then raise exception 'address not found'; end if;
  end if;
  return aid;
end $function$;

CREATE OR REPLACE FUNCTION private.get_my_seller_allocations_page(p_limit integer default 26,p_before_created_at timestamptz default null,p_before_id bigint default null)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce(jsonb_agg(x.dto order by x.created_at desc,x.allocation_id desc),'[]'::jsonb)
  from (
    select a.created_at,a.allocation_id,to_jsonb(a)||jsonb_build_object('order_items',jsonb_build_object(
      'product_name',i.product_name,'product_image_url',i.product_image_url,'unit',i.unit,'unit_price',i.unit_price,
      'stores',jsonb_build_object('name',s.name,'image_url',s.image_url,
        'markets',jsonb_build_object('name',m.name,'hub_address',m.hub_address)),
      'orders',jsonb_build_object('order_id',o.order_id,'order_number',o.order_number,'created_at',o.created_at,
        'fulfillment_method',o.fulfillment_method,'status',o.status))) as dto
    from public.order_allocations a join public.order_items i on i.order_item_id=a.order_item_id
    join public.orders o on o.order_id=i.order_id join public.stores s on s.store_id=i.store_id
    join public.markets m on m.market_id=o.market_id
    where (select auth.uid()) is not null and a.seller_id=(select auth.uid())
      and (p_before_created_at is null or (a.created_at,a.allocation_id)<(p_before_created_at,p_before_id))
    order by a.created_at desc,a.allocation_id desc limit least(greatest(coalesce(p_limit,26),1),51)
  ) x
$function$;

create function public.get_my_seller_allocations_page(p_limit integer default 26,p_before_created_at timestamptz default null,p_before_id bigint default null)
returns jsonb language sql stable security invoker set search_path='' as $$ select private.get_my_seller_allocations_page(p_limit,p_before_created_at,p_before_id) $$;
revoke all on function private.get_my_seller_allocations_page(integer,timestamptz,bigint),public.get_my_seller_allocations_page(integer,timestamptz,bigint) from public,anon,authenticated;
grant execute on function private.get_my_seller_allocations_page(integer,timestamptz,bigint),public.get_my_seller_allocations_page(integer,timestamptz,bigint) to authenticated;
CREATE OR REPLACE FUNCTION private.get_market_seller_contacts_page(p_order_ids bigint[])
 RETURNS TABLE(allocation_id bigint, order_id bigint, seller_name text, seller_username text, seller_phone text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if coalesce(cardinality(p_order_ids),0)>100 then raise exception 'too many order ids'; end if;
  return query select a.allocation_id,o.order_id,
    coalesce(nullif(p.display_name,''),nullif(p.full_name,''),nullif(p.username,''),'ผู้ขาย')::text,
    p.username::text,p.phone_num::text
    from public.order_allocations a join public.order_items i on i.order_item_id=a.order_item_id
    join public.orders o on o.order_id=i.order_id join public.markets m on m.market_id=o.market_id
    join public.profiles p on p.user_id=a.seller_id
    where (m.owner_id=auth.uid() or private.is_admin())
      and o.order_id=any(coalesce(p_order_ids,'{}'::bigint[]));
end $function$;
create function public.get_market_seller_contacts_page(p_order_ids bigint[])
returns table(allocation_id bigint,order_id bigint,seller_name text,seller_username text,seller_phone text)
language sql stable security invoker set search_path='' as $$select * from private.get_market_seller_contacts_page(p_order_ids)$$;
revoke all on function private.get_market_seller_contacts_page(bigint[]),public.get_market_seller_contacts_page(bigint[]) from public,anon,authenticated;
grant execute on function private.get_market_seller_contacts_page(bigint[]),public.get_market_seller_contacts_page(bigint[]) to authenticated;
notify pgrst,'reload schema';
