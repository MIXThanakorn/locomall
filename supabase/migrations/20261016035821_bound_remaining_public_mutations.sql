-- RPC-level limits avoid charging internal inventory/finance triggers to the wrong actor.
CREATE OR REPLACE FUNCTION public.update_my_listing_stock(p_listing_id bigint, p_stock_quantity integer, p_status text DEFAULT 'active'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_stock_quantity<0 or p_status not in ('active','paused') then raise exception 'invalid stock/status'; end if;
  perform private.consume_business_limit('listing_stock',20,60);
  update public.seller_listings l set stock_quantity=p_stock_quantity,status=p_status,updated_at=now()
  where l.listing_id=p_listing_id and l.seller_id=auth.uid() and l.reserved_quantity<=p_stock_quantity;
  if not found then raise exception 'listing not found or stock below reserved quantity'; end if;
end $function$;

CREATE OR REPLACE FUNCTION public.save_purchase_review(p_order_id bigint, p_order_item_id bigint, p_stars integer, p_body text DEFAULT ''::text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare target public.orders; item public.order_items; saved bigint;
begin
  if auth.uid() is null or p_stars not between 1 and 5 or length(coalesce(p_body,''))>1000 then
    raise exception 'invalid review'; end if;
  perform private.consume_business_limit('purchase_review',10,60);
  select * into target from public.orders where order_id=p_order_id and buyer_id=auth.uid() and status='delivered';
  if not found then raise exception 'review requires a delivered order owned by you'; end if;
  if p_order_item_id is null then
    insert into public.purchase_reviews(buyer_id,order_id,market_id,stars,body)
    values(auth.uid(),p_order_id,target.market_id,p_stars,btrim(coalesce(p_body,'')))
    on conflict (order_id) where market_id is not null do update
      set stars=excluded.stars,body=excluded.body,updated_at=now()
      where public.purchase_reviews.buyer_id=auth.uid() and public.purchase_reviews.hidden_at is null
    returning review_id into saved;
  else
    select * into item from public.order_items where order_item_id=p_order_item_id and order_id=p_order_id;
    if not found then raise exception 'order item not purchased'; end if;
    insert into public.purchase_reviews(buyer_id,order_id,order_item_id,store_id,stars,body)
    values(auth.uid(),p_order_id,p_order_item_id,item.store_id,p_stars,btrim(coalesce(p_body,'')))
    on conflict (order_item_id) where store_id is not null do update
      set stars=excluded.stars,body=excluded.body,updated_at=now()
      where public.purchase_reviews.buyer_id=auth.uid() and public.purchase_reviews.hidden_at is null
    returning review_id into saved;
  end if;
  if saved is null then raise exception 'hidden reviews cannot be edited'; end if;
  return saved;
end $function$;

CREATE OR REPLACE FUNCTION public.register_my_push_device(p_expo_push_token text, p_platform text, p_device_name text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_platform not in ('android','ios') then raise exception 'invalid platform'; end if;
  if length(p_expo_push_token) > 220 or
     p_expo_push_token !~ '^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$'
  then raise exception 'invalid Expo push token'; end if;

  if p_expo_push_token is null or p_platform is null then raise exception 'invalid Expo push token'; end if;
  perform private.consume_business_limit('push_registration',10,60);
  if (select count(*) from public.user_push_devices where user_id=auth.uid() and enabled)>=10
    and not exists(select 1 from public.user_push_devices where user_id=auth.uid() and expo_push_token=p_expo_push_token and enabled)
    then raise exception 'too many push devices'; end if;
  insert into public.user_push_devices(user_id,expo_push_token,platform,device_name)
  values(auth.uid(),p_expo_push_token,p_platform,nullif(left(btrim(p_device_name),120),''))
  on conflict(expo_push_token) do update set
    user_id=excluded.user_id,
    platform=excluded.platform,
    device_name=excluded.device_name,
    enabled=true,
    last_seen_at=now(),
    last_error=null,
    updated_at=now();
end
$function$;

CREATE OR REPLACE FUNCTION public.get_or_create_chat_room(p_store_id bigint)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare rid bigint;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not exists(select 1 from public.stores s join public.markets m on m.market_id=s.market_id
    where s.store_id=p_store_id and s.approval_status='approved' and m.approval_status='approved') then
    raise exception 'store unavailable';
  end if;
  select room_id into rid from public.chat_rooms where store_id=p_store_id and buyer_id=auth.uid();
  if rid is not null then return rid; end if;
  insert into public.chat_rooms(store_id,buyer_id) values(p_store_id,auth.uid())
  on conflict(buyer_id,store_id) do nothing returning room_id into rid;
  if rid is null then select room_id into rid from public.chat_rooms where store_id=p_store_id and buyer_id=auth.uid(); end if;
  return rid;
end $function$;
notify pgrst,'reload schema';
