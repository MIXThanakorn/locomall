-- Preserve legacy phone data, but require correction before reuse for checkout.
-- Updating only is_default must not block saving a different valid address.
create or replace function private.guard_profile_and_commerce_input() returns trigger
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
  if tg_table_name='user_addresses' and coalesce(doc->>'phone','') !~ '^0[0-9]{9}$'
    and (tg_op='INSERT' or (doc->'phone') is distinct from (to_jsonb(old)->'phone')) then raise exception 'invalid address phone'; end if;
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
  if coalesce(btrim(p_phone),'') !~ '^0[0-9]{9}$' then raise exception 'invalid address phone'; end if;
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
create or replace function private.snapshot_delivery_address() returns trigger
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
    if coalesce(a.phone,'') !~ '^0[0-9]{9}$' then raise exception 'invalid address phone'; end if;
    select jsonb_build_object('subdistrict',s.name_th,'district',d.name_th,'province',p.name_th)
      into location from public.thai_subdistricts s join public.thai_districts d on d.code=s.district_code
      join public.thai_provinces p on p.code=d.province_code where s.code=a.subdistrict_code;
    new.delivery_address_snapshot:=jsonb_build_object('recipient_name',a.recipient_name,'phone',a.phone,
      'address_line',a.address_line,'subdistrict_code',a.subdistrict_code,'postal_code',a.postal_code,'location',location);
  end if;
  return new;
end $$;
notify pgrst,'reload schema';
