-- No orders are expired/cancelled by this migration.
-- Serialize state transitions on the same parent row used by receipt/cancellation.
create or replace function private.consolidate_order(p_order_id bigint)
returns void language plpgsql security definer set search_path='' as $$
declare o public.orders;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into o from public.orders where order_id=p_order_id for update;
  if not found or (private.market_owner(o.market_id) or private.is_admin()) is not true then raise exception 'forbidden'; end if;
  if o.fulfillment_method<>'delivery' then raise exception 'invalid order transition'; end if;
  if o.status in ('consolidated','shipped','delivered') then return; end if;
  if o.status<>'at_hub' then raise exception 'invalid order transition'; end if;
  if not exists(select 1 from public.order_items where order_id=p_order_id)
    or exists(select 1 from public.order_items i left join public.order_allocations a on a.order_item_id=i.order_item_id
      where i.order_id=p_order_id and (a.allocation_id is null or a.status<>'at_hub' or a.stock_deducted_at is null))
    then raise exception 'all allocations must be at hub'; end if;
  update public.orders set status='consolidated',updated_at=now() where order_id=p_order_id and status='at_hub';
end $$;

create or replace function private.ship_order(p_order_id bigint,p_tracking_number text,p_courier_name text)
returns void language plpgsql security definer set search_path='' as $$
declare o public.orders; tracking text:=nullif(btrim(p_tracking_number),''); courier text:=nullif(btrim(p_courier_name),'');
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if tracking is null or length(tracking)>120 or length(coalesce(courier,''))>120 then raise exception 'invalid tracking details'; end if;
  select * into o from public.orders where order_id=p_order_id for update;
  if not found or (private.market_owner(o.market_id) or private.is_admin()) is not true then raise exception 'forbidden'; end if;
  if o.fulfillment_method<>'delivery' then raise exception 'invalid order transition'; end if;
  if o.status in ('shipped','delivered') then
    if o.tracking_number=tracking and nullif(btrim(o.courier_name),'') is not distinct from courier then return; end if;
    raise exception 'order shipping details already recorded';
  end if;
  if o.status<>'consolidated' then raise exception 'invalid order transition'; end if;
  update public.orders set status='shipped',tracking_number=tracking,courier_name=courier,
    shipped_at=now(),updated_at=now() where order_id=p_order_id and status='consolidated';
end $$;

create or replace function public.consolidate_order(p_order_id bigint)
returns void language sql security invoker set search_path='' as $$
  select private.consolidate_order(p_order_id)
$$;
create or replace function public.ship_order(p_order_id bigint,p_tracking_number text,p_courier_name text)
returns void language sql security invoker set search_path='' as $$
  select private.ship_order(p_order_id,p_tracking_number,p_courier_name)
$$;
revoke all on function private.consolidate_order(bigint),private.ship_order(bigint,text,text),
  public.consolidate_order(bigint),public.ship_order(bigint,text,text) from public,anon,authenticated;
grant execute on function private.consolidate_order(bigint),private.ship_order(bigint,text,text),
  public.consolidate_order(bigint),public.ship_order(bigint,text,text) to authenticated;

-- Sellers get operational order metadata through a minimal, owner-scoped DTO.
-- Whole orders remain available to buyer, market owner and admin only.
create or replace function private.can_access_order(p_order_id bigint)
returns boolean language sql stable security definer set search_path='' as $$
  select (select auth.uid()) is not null and exists(select 1 from public.orders o where o.order_id=p_order_id
    and (o.buyer_id=(select auth.uid()) or private.market_owner(o.market_id) or private.is_admin()))
$$;
create or replace function private.can_access_order_item(p_order_item_id bigint)
returns boolean language sql stable security definer set search_path='' as $$
  select (select auth.uid()) is not null and exists(select 1 from public.order_items i where i.order_item_id=p_order_item_id
    and private.can_access_order(i.order_id))
$$;
drop policy if exists order_items_participants on public.order_items;
create policy order_items_participants on public.order_items for select to authenticated
  using((select private.can_access_order_item(order_item_id)));
revoke all on function private.can_access_order(bigint),private.can_access_order_item(bigint) from public,anon;
grant execute on function private.can_access_order(bigint),private.can_access_order_item(bigint) to authenticated,service_role;

create or replace function private.get_my_seller_allocations(p_allocation_id bigint default null)
returns jsonb language sql stable security definer set search_path='' as $$
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
      and (p_allocation_id is null or a.allocation_id=p_allocation_id)
  ) x
$$;
create or replace function public.get_my_seller_allocations(p_allocation_id bigint default null)
returns jsonb language sql stable security invoker set search_path='' as $$
  select private.get_my_seller_allocations(p_allocation_id)
$$;
revoke all on function private.get_my_seller_allocations(bigint),public.get_my_seller_allocations(bigint) from public,anon,authenticated;
grant execute on function private.get_my_seller_allocations(bigint),public.get_my_seller_allocations(bigint) to authenticated;

-- PostgreSQL NaN satisfies a positive numeric CHECK. Reject every non-finite
-- financial value at the table boundary, covering every current/future RPC.
do $$
declare pair text; parts text[]; constraint_name text;
begin
  foreach pair in array array['stores.unit_price','orders.total_amount','order_items.unit_price',
    'order_items.total_amount','demo_accounts.wallet_balance','demo_accounts.seller_pending',
    'demo_accounts.seller_settled','demo_topup_requests.amount','demo_ledger.wallet_delta',
    'demo_ledger.seller_delta','demo_settlements.amount']
  loop
    parts:=string_to_array(pair,'.'); constraint_name:=parts[1]||'_'||parts[2]||'_finite';
    execute format('alter table public.%I add constraint %I check (%I::text not in (''NaN'',''Infinity'',''-Infinity'')) not valid',
      parts[1],constraint_name,parts[2]);
    execute format('alter table public.%I validate constraint %I',parts[1],constraint_name);
  end loop;
end $$;

-- A bounded per-user counter avoids scanning chat history and serializes pending
-- order cap checks across concurrent requests. Rejected transactions roll back.
create table private.business_action_limits(
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  action text not null,window_started_at timestamptz not null,attempts integer not null check(attempts>0),
  primary key(user_id,action)
);
alter table private.business_action_limits enable row level security;
create policy deny_client_business_limits on private.business_action_limits to authenticated using(false) with check(false);
revoke all on private.business_action_limits from public,anon,authenticated;

create or replace function private.consume_business_limit(p_action text,p_limit integer,p_seconds integer)
returns void language plpgsql security definer set search_path='' as $$
declare used integer; ts timestamptz:=clock_timestamp();
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  insert into private.business_action_limits as existing(user_id,action,window_started_at,attempts)
    values(auth.uid(),p_action,ts,1)
    on conflict(user_id,action) do update
      set attempts=case when existing.window_started_at<=ts-make_interval(secs=>p_seconds) then 1 else existing.attempts+1 end,
          window_started_at=case when existing.window_started_at<=ts-make_interval(secs=>p_seconds) then ts else existing.window_started_at end
    returning attempts into used;
  if used>p_limit then raise exception 'action rate limit exceeded: %',p_action; end if;
end $$;
revoke all on function private.consume_business_limit(text,integer,integer) from public,anon,authenticated;

create or replace function private.guard_business_creation()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  -- Internal service operations do not impersonate a user; public RPCs still
  -- require auth.uid(), and direct client writes remain denied by grants/RLS.
  if auth.uid() is null then return new; end if;
  if not exists(select 1 from public.profiles where user_id=auth.uid() and phone_num ~ '^0[0-9]{9}$')
    then raise exception 'valid mobile contact required'; end if;
  if tg_table_name='orders' then
    perform private.consume_business_limit('orders',5,60);
    if (select count(*) from public.orders where buyer_id=auth.uid() and status not in ('delivered','cancelled'))>=10
      then raise exception 'too many pending orders'; end if;
  elsif tg_table_name='chat_messages' then
    perform private.consume_business_limit('chat',30,60);
    new.created_at:=clock_timestamp();
  elsif tg_table_name='demo_topup_requests' then
    if exists(select 1 from public.demo_topup_requests where request_id=new.request_id and user_id=auth.uid() and amount=new.amount) then return new; end if;
    perform private.consume_business_limit('topups',3,60);
    if (select count(*) from public.demo_topup_requests where user_id=auth.uid() and status='pending')>=3
      then raise exception 'too many pending topups'; end if;
  else
    perform private.consume_business_limit(tg_table_name,3,60);
  end if;
  return new;
end $$;
revoke all on function private.guard_business_creation() from public,anon,authenticated;
do $$
declare table_name text;
begin
  foreach table_name in array array['orders','chat_messages','demo_topup_requests','markets','stores','store_seller_applications'] loop
    execute format('create trigger guard_business_creation before insert on public.%I for each row execute function private.guard_business_creation()',table_name);
  end loop;
end $$;
notify pgrst,'reload schema';
