-- V1 academic demo only. None of these balances or QR references represent real money.
alter table public.orders add column payment_method text not null default 'cod'
  check (payment_method in ('cod','demo_wallet'));
alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check
  check (payment_status in ('cod_pending','collected','failed','demo_paid','demo_refunded'));

create table public.demo_accounts (
  user_id uuid primary key references public.profiles(user_id) on delete restrict,
  wallet_balance numeric(12,2) not null default 0 check (wallet_balance >= 0),
  seller_pending numeric(12,2) not null default 0 check (seller_pending >= 0),
  seller_settled numeric(12,2) not null default 0 check (seller_settled >= 0),
  updated_at timestamptz not null default now()
);
create table public.demo_topup_requests (
  request_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete restrict,
  amount numeric(12,2) not null check (amount between 1 and 10000),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  decided_by uuid references public.profiles(user_id), decision_note text,
  created_at timestamptz not null default now(), decided_at timestamptz
);
create index demo_topups_user_created on public.demo_topup_requests(user_id,created_at desc);
create table public.demo_order_requests (
  user_id uuid not null references public.profiles(user_id) on delete restrict,
  request_id uuid not null,
  payload jsonb not null,
  order_id bigint unique references public.orders(order_id) on delete restrict,
  primary key (user_id,request_id)
);
create table public.demo_ledger (
  entry_id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(user_id) on delete restrict,
  entry_type text not null check (entry_type in ('topup','purchase','refund','seller_sale','seller_settlement')),
  wallet_delta numeric(12,2) not null default 0,
  seller_delta numeric(12,2) not null default 0,
  order_id bigint references public.orders(order_id) on delete restrict,
  topup_request_id uuid references public.demo_topup_requests(request_id) on delete restrict,
  settlement_id uuid,
  created_at timestamptz not null default now(),
  check (wallet_delta <> 0 or seller_delta <> 0),
  check (
    (entry_type='topup' and wallet_delta>0 and seller_delta=0 and topup_request_id is not null and order_id is null and settlement_id is null)
    or (entry_type='purchase' and wallet_delta<0 and seller_delta=0 and order_id is not null and topup_request_id is null and settlement_id is null)
    or (entry_type='refund' and wallet_delta>0 and seller_delta=0 and order_id is not null and topup_request_id is null and settlement_id is null)
    or (entry_type='seller_sale' and wallet_delta=0 and seller_delta>0 and order_id is not null and topup_request_id is null and settlement_id is null)
    or (entry_type='seller_settlement' and wallet_delta=0 and seller_delta<0 and settlement_id is not null and order_id is null and topup_request_id is null)
  )
);
create unique index demo_ledger_one_order_event on public.demo_ledger(user_id,entry_type,order_id)
  where order_id is not null;
create unique index demo_ledger_one_topup on public.demo_ledger(topup_request_id)
  where topup_request_id is not null;
create unique index demo_ledger_one_settlement on public.demo_ledger(settlement_id)
  where settlement_id is not null;
create index demo_ledger_user_created on public.demo_ledger(user_id,created_at desc);
create table public.demo_settlements (
  settlement_id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(user_id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  evidence_note text not null check (length(btrim(evidence_note)) between 3 and 1000),
  recorded_by uuid not null references public.profiles(user_id),
  created_at timestamptz not null default now()
);
alter table public.demo_ledger add constraint demo_ledger_settlement_fk
  foreign key (settlement_id) references public.demo_settlements(settlement_id) on delete restrict;

-- Tables are read-only from the Data API. All mutations go through authenticated RPCs.
alter table public.demo_accounts enable row level security;
alter table public.demo_topup_requests enable row level security;
alter table public.demo_order_requests enable row level security;
alter table public.demo_ledger enable row level security;
alter table public.demo_settlements enable row level security;
create policy demo_account_read on public.demo_accounts for select to authenticated
  using (user_id=(select auth.uid()) or (select private.is_admin()));
create policy demo_topup_read on public.demo_topup_requests for select to authenticated
  using (user_id=(select auth.uid()) or (select private.is_admin()));
create policy demo_order_request_read on public.demo_order_requests for select to authenticated
  using (user_id=(select auth.uid()));
create policy demo_ledger_read on public.demo_ledger for select to authenticated
  using (user_id=(select auth.uid()) or (select private.is_admin()));
create policy demo_settlement_read on public.demo_settlements for select to authenticated
  using (seller_id=(select auth.uid()) or (select private.is_admin()));
revoke all on public.demo_accounts,public.demo_topup_requests,public.demo_order_requests,
  public.demo_ledger,public.demo_settlements from public,anon,authenticated;
grant select on public.demo_accounts,public.demo_topup_requests,public.demo_order_requests,
  public.demo_ledger,public.demo_settlements to authenticated;

create or replace function private.deny_demo_ledger_mutation()
returns trigger language plpgsql set search_path='' as $$
begin
  raise exception 'demo ledger is append-only';
end $$;
create trigger demo_ledger_immutable before update or delete on public.demo_ledger
for each row execute function private.deny_demo_ledger_mutation();
revoke execute on function private.deny_demo_ledger_mutation() from public,anon,authenticated;

create or replace function public.request_demo_topup(p_request_id uuid,p_amount numeric)
returns uuid language plpgsql security definer set search_path='' as $$
declare existing public.demo_topup_requests;
begin
  if auth.uid() is null or p_request_id is null or p_amount is null or p_amount < 1 or p_amount > 10000
    or p_amount <> round(p_amount,2) then raise exception 'invalid demo top-up'; end if;
  insert into public.demo_topup_requests(request_id,user_id,amount)
  values(p_request_id,auth.uid(),p_amount) on conflict (request_id) do nothing;
  select * into existing from public.demo_topup_requests where request_id=p_request_id;
  if existing.user_id <> auth.uid() or existing.amount <> p_amount then
    raise exception 'request id was already used for different data';
  end if;
  return p_request_id;
end $$;

create or replace function public.decide_demo_topup(p_request_id uuid,p_approve boolean,p_note text default null)
returns void language plpgsql security definer set search_path='' as $$
declare request_row public.demo_topup_requests;
begin
  if auth.uid() is null or not (select private.is_admin()) then raise exception 'forbidden'; end if;
  select * into request_row from public.demo_topup_requests where request_id=p_request_id for update;
  if not found then raise exception 'request not found'; end if;
  if request_row.status <> 'pending' then
    if request_row.status=(case when p_approve then 'approved' else 'rejected' end) then return; end if;
    raise exception 'request already decided';
  end if;
  if not p_approve and nullif(btrim(p_note),'') is null then raise exception 'rejection reason required'; end if;
  update public.demo_topup_requests set status=case when p_approve then 'approved' else 'rejected' end,
    decided_by=auth.uid(),decision_note=nullif(btrim(p_note),''),decided_at=now()
    where request_id=p_request_id;
  if p_approve then
    insert into public.demo_accounts(user_id) values(request_row.user_id) on conflict do nothing;
    update public.demo_accounts set wallet_balance=wallet_balance+request_row.amount,updated_at=now()
      where user_id=request_row.user_id;
    insert into public.demo_ledger(user_id,entry_type,wallet_delta,topup_request_id)
      values(request_row.user_id,'topup',request_row.amount,p_request_id);
  end if;
  insert into public.admin_audit_logs(actor_id,action,entity_type,metadata)
  values(auth.uid(),'decide_demo_topup','demo_topup',jsonb_build_object('request_id',p_request_id,'approved',p_approve,'note',p_note));
end $$;

create or replace function public.create_demo_wallet_order(
  p_request_id uuid,p_market_id bigint,p_address_id bigint,p_items jsonb,
  p_fulfillment_method text default 'delivery',p_lat double precision default null,p_lng double precision default null
)
returns bigint language plpgsql security definer set search_path='' as $$
declare v_order_id bigint; payload jsonb; prior public.demo_order_requests; charge numeric;
begin
  if auth.uid() is null or p_request_id is null then raise exception 'authentication required'; end if;
  -- Precise runtime GPS is used for pickup eligibility only, never persisted.
  payload=jsonb_build_object('market',p_market_id,'address',p_address_id,'items',p_items,
    'fulfillment',p_fulfillment_method);
  insert into public.demo_order_requests(user_id,request_id,payload)
    values(auth.uid(),p_request_id,payload) on conflict do nothing;
  select * into prior from public.demo_order_requests
    where user_id=auth.uid() and request_id=p_request_id for update;
  if prior.payload <> payload then raise exception 'request id was already used for different data'; end if;
  if prior.order_id is not null then return prior.order_id; end if;
  v_order_id=public.create_cod_order(p_market_id,p_address_id,p_items,p_fulfillment_method,p_lat,p_lng);
  select total_amount into charge from public.orders where public.orders.order_id=v_order_id;
  insert into public.demo_accounts(user_id) values(auth.uid()) on conflict do nothing;
  update public.demo_accounts set wallet_balance=wallet_balance-charge,updated_at=now()
    where user_id=auth.uid() and wallet_balance>=charge;
  if not found then raise exception 'insufficient demo balance'; end if;
  update public.orders set payment_method='demo_wallet',payment_status='demo_paid'
    where public.orders.order_id=v_order_id;
  insert into public.demo_ledger(user_id,entry_type,wallet_delta,order_id)
    values(auth.uid(),'purchase',-charge,v_order_id);
  update public.demo_order_requests set order_id=v_order_id
    where user_id=auth.uid() and request_id=p_request_id;
  return v_order_id;
end $$;

-- Existing delivery/cancellation RPCs remain the only transition authority.
-- Their stock changes and these financial postings share the same transaction.
create or replace function private.demo_payment_status_on_transition()
returns trigger language plpgsql set search_path='' as $$
begin
  if new.payment_method='demo_wallet' and old.status is distinct from new.status then
    if new.status='delivered' then new.payment_status='demo_paid'; end if;
    if new.status='cancelled' then new.payment_status='demo_refunded'; end if;
  end if;
  return new;
end $$;
create trigger orders_demo_payment_status before update of status on public.orders
for each row execute function private.demo_payment_status_on_transition();

create or replace function private.post_demo_order_finance()
returns trigger language plpgsql security definer set search_path='' as $$
declare sale record;
begin
  if old.status is not distinct from new.status then return new; end if;
  if new.status='cancelled' and new.payment_method='demo_wallet' then
    insert into public.demo_accounts(user_id) values(new.buyer_id) on conflict do nothing;
    update public.demo_accounts set wallet_balance=wallet_balance+new.total_amount,updated_at=now()
      where user_id=new.buyer_id;
    insert into public.demo_ledger(user_id,entry_type,wallet_delta,order_id)
      values(new.buyer_id,'refund',new.total_amount,new.order_id);
  elsif new.status='delivered' then
    for sale in
      select a.seller_id,sum(a.quantity*i.unit_price)::numeric(12,2) amount
      from public.order_allocations a join public.order_items i on i.order_item_id=a.order_item_id
      where i.order_id=new.order_id group by a.seller_id order by a.seller_id
    loop
      insert into public.demo_accounts(user_id) values(sale.seller_id) on conflict do nothing;
      update public.demo_accounts set seller_pending=seller_pending+sale.amount,updated_at=now()
        where user_id=sale.seller_id;
      insert into public.demo_ledger(user_id,entry_type,seller_delta,order_id)
        values(sale.seller_id,'seller_sale',sale.amount,new.order_id);
    end loop;
  end if;
  return new;
end $$;
create trigger orders_post_demo_finance after update of status on public.orders
for each row execute function private.post_demo_order_finance();
revoke execute on function private.demo_payment_status_on_transition(),private.post_demo_order_finance()
  from public,anon,authenticated;

create or replace function public.record_demo_settlement(p_request_id uuid,p_seller_id uuid,p_evidence_note text)
returns uuid language plpgsql security definer set search_path='' as $$
declare pending numeric(12,2); existing_seller uuid;
begin
  if auth.uid() is null or not (select private.is_admin()) then raise exception 'forbidden'; end if;
  if p_request_id is null or p_seller_id is null then raise exception 'request and seller required'; end if;
  if length(btrim(coalesce(p_evidence_note,''))) not between 3 and 1000 then raise exception 'evidence note required'; end if;
  select seller_pending into pending from public.demo_accounts where user_id=p_seller_id for update;
  select seller_id into existing_seller from public.demo_settlements where settlement_id=p_request_id;
  if existing_seller is not null then
    if existing_seller<>p_seller_id then raise exception 'request id was already used for another seller'; end if;
    return p_request_id;
  end if;
  if pending is null or pending<=0 then raise exception 'no pending demo settlement'; end if;
  update public.demo_accounts set seller_pending=0,seller_settled=seller_settled+pending,updated_at=now()
    where user_id=p_seller_id;
  insert into public.demo_settlements(settlement_id,seller_id,amount,evidence_note,recorded_by)
    values(p_request_id,p_seller_id,pending,btrim(p_evidence_note),auth.uid());
  insert into public.demo_ledger(user_id,entry_type,seller_delta,settlement_id)
    values(p_seller_id,'seller_settlement',-pending,p_request_id);
  insert into public.admin_audit_logs(actor_id,action,entity_type,metadata)
    values(auth.uid(),'record_demo_settlement','demo_settlement',jsonb_build_object('settlement_id',p_request_id,'seller_id',p_seller_id,'amount',pending));
  return p_request_id;
end $$;

-- A financial ledger must never lose its order link through the old admin delete RPC.
create or replace function private.prevent_financial_order_delete()
returns trigger language plpgsql set search_path='' as $$
begin
  if exists(select 1 from public.demo_ledger where order_id=old.order_id) then
    raise exception 'order has demo financial history; retain the audit record';
  end if;
  return old;
end $$;
create trigger orders_keep_financial_history before delete on public.orders
for each row execute function private.prevent_financial_order_delete();
revoke execute on function private.prevent_financial_order_delete() from public,anon,authenticated;

revoke execute on function public.request_demo_topup(uuid,numeric),public.decide_demo_topup(uuid,boolean,text),
  public.create_demo_wallet_order(uuid,bigint,bigint,jsonb,text,double precision,double precision),
  public.record_demo_settlement(uuid,uuid,text) from public,anon;
grant execute on function public.request_demo_topup(uuid,numeric),public.decide_demo_topup(uuid,boolean,text),
  public.create_demo_wallet_order(uuid,bigint,bigint,jsonb,text,double precision,double precision),
  public.record_demo_settlement(uuid,uuid,text) to authenticated;

-- Verified-order reviews. Store reviews belong to purchased order items, not
-- individual sellers because an item can be fulfilled by several sellers.
alter table public.markets add column rating_average numeric(3,2) not null default 0,
  add column rating_count integer not null default 0;
alter table public.stores add column rating_average numeric(3,2) not null default 0,
  add column rating_count integer not null default 0;
create table public.purchase_reviews (
  review_id bigint generated always as identity primary key,
  buyer_id uuid not null references public.profiles(user_id) on delete restrict,
  order_id bigint not null references public.orders(order_id) on delete restrict,
  order_item_id bigint references public.order_items(order_item_id) on delete restrict,
  market_id bigint references public.markets(market_id) on delete restrict,
  store_id bigint references public.stores(store_id) on delete restrict,
  stars integer not null check (stars between 1 and 5),
  body text not null default '' check (length(body)<=1000),
  hidden_at timestamptz,hidden_by uuid references public.profiles(user_id),hide_reason text,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  check ((market_id is not null and store_id is null and order_item_id is null)
    or (market_id is null and store_id is not null and order_item_id is not null))
);
create unique index purchase_reviews_market_once on public.purchase_reviews(order_id)
  where market_id is not null;
create unique index purchase_reviews_store_item_once on public.purchase_reviews(order_item_id)
  where store_id is not null;
create index purchase_reviews_market_visible on public.purchase_reviews(market_id,created_at desc)
  where hidden_at is null;
create index purchase_reviews_store_visible on public.purchase_reviews(store_id,created_at desc)
  where hidden_at is null;
alter table public.purchase_reviews enable row level security;
create policy purchase_reviews_read on public.purchase_reviews for select to authenticated
  using (buyer_id=(select auth.uid()) or (select private.is_admin()));
revoke all on public.purchase_reviews from public,anon,authenticated;
grant select on public.purchase_reviews to authenticated;

-- Public-facing review DTO deliberately excludes buyer IDs and order IDs.
create or replace function public.get_catalog_reviews(p_target_type text,p_target_id bigint)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if p_target_type='market' then
    if not exists(select 1 from public.markets where market_id=p_target_id and approval_status='approved') then return '[]'::jsonb; end if;
    select coalesce(jsonb_agg(jsonb_build_object('review_id',r.review_id,'stars',r.stars,
      'body',r.body,'created_at',r.created_at) order by r.created_at desc),'[]'::jsonb)
      into result from (select * from public.purchase_reviews where market_id=p_target_id
        and hidden_at is null order by created_at desc limit 5) r;
  elsif p_target_type='store' then
    if not exists(select 1 from public.stores s join public.markets m on m.market_id=s.market_id
      where s.store_id=p_target_id and s.approval_status='approved' and m.approval_status='approved') then return '[]'::jsonb; end if;
    select coalesce(jsonb_agg(jsonb_build_object('review_id',r.review_id,'stars',r.stars,
      'body',r.body,'created_at',r.created_at) order by r.created_at desc),'[]'::jsonb)
      into result from (select * from public.purchase_reviews where store_id=p_target_id
        and hidden_at is null order by created_at desc limit 5) r;
  else
    return '[]'::jsonb;
  end if;
  return result;
end $$;
revoke execute on function public.get_catalog_reviews(text,bigint) from public;
grant execute on function public.get_catalog_reviews(text,bigint) to anon,authenticated;

create or replace function private.refresh_purchase_rating()
returns trigger language plpgsql security definer set search_path='' as $$
declare target_market bigint; target_store bigint;
begin
  if tg_op='DELETE' then
    target_market=old.market_id; target_store=old.store_id;
  else
    target_market=new.market_id; target_store=new.store_id;
  end if;
  if target_market is not null then
    update public.markets set rating_count=(select count(*) from public.purchase_reviews
        where market_id=target_market and hidden_at is null),
      rating_average=coalesce((select round(avg(stars),2) from public.purchase_reviews
        where market_id=target_market and hidden_at is null),0)
    where market_id=target_market;
  else
    update public.stores set rating_count=(select count(*) from public.purchase_reviews
        where store_id=target_store and hidden_at is null),
      rating_average=coalesce((select round(avg(stars),2) from public.purchase_reviews
        where store_id=target_store and hidden_at is null),0)
    where store_id=target_store;
  end if;
  return null;
end $$;
create trigger refresh_purchase_rating after insert or update or delete on public.purchase_reviews
for each row execute function private.refresh_purchase_rating();
revoke execute on function private.refresh_purchase_rating() from public,anon,authenticated;

create or replace function public.save_purchase_review(
  p_order_id bigint,p_order_item_id bigint,p_stars integer,p_body text default ''
)
returns bigint language plpgsql security definer set search_path='' as $$
declare target public.orders; item public.order_items; saved bigint;
begin
  if auth.uid() is null or p_stars not between 1 and 5 or length(coalesce(p_body,''))>1000 then
    raise exception 'invalid review'; end if;
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
end $$;

create or replace function public.moderate_purchase_review(p_review_id bigint,p_hide boolean,p_reason text default null)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not (select private.is_admin()) then raise exception 'forbidden'; end if;
  if p_hide and nullif(btrim(p_reason),'') is null then raise exception 'moderation reason required'; end if;
  update public.purchase_reviews set hidden_at=case when p_hide then now() else null end,
    hidden_by=case when p_hide then auth.uid() else null end,
    hide_reason=case when p_hide then btrim(p_reason) else null end,updated_at=now()
    where review_id=p_review_id;
  if not found then raise exception 'review not found'; end if;
  insert into public.admin_audit_logs(actor_id,action,entity_type,entity_id,metadata)
    values(auth.uid(),'moderate_review','review',p_review_id,
      jsonb_build_object('hidden',p_hide,'reason',p_reason));
end $$;
revoke execute on function public.save_purchase_review(bigint,bigint,integer,text),
  public.moderate_purchase_review(bigint,boolean,text) from public,anon;
grant execute on function public.save_purchase_review(bigint,bigint,integer,text),
  public.moderate_purchase_review(bigint,boolean,text) to authenticated;

-- A saved item has no side effects. Following is explicit opt-in to a limited
-- number of useful catalog events (approval and out-of-stock -> available).
create table public.user_catalog_links (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  kind text not null check (kind in ('favorite','follow')),
  target_type text not null check (target_type in ('market','store')),
  target_id bigint not null,
  created_at timestamptz not null default now(),
  primary key (user_id,kind,target_type,target_id)
);
create index user_catalog_links_target on public.user_catalog_links(kind,target_type,target_id);
alter table public.user_catalog_links enable row level security;
create policy catalog_links_self_read on public.user_catalog_links for select to authenticated
  using (user_id=(select auth.uid()));
revoke all on public.user_catalog_links from public,anon,authenticated;
grant select on public.user_catalog_links to authenticated;

create or replace function public.set_catalog_link(
  p_kind text,p_target_type text,p_target_id bigint,p_enabled boolean
)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_kind not in ('favorite','follow') or p_target_type not in ('market','store')
    or p_target_id is null or p_enabled is null then raise exception 'invalid catalog link'; end if;
  if p_enabled then
    if p_target_type='market' and not exists(select 1 from public.markets
      where market_id=p_target_id and approval_status='approved') then raise exception 'market unavailable'; end if;
    if p_target_type='store' and not exists(select 1 from public.stores s join public.markets m
      on m.market_id=s.market_id where s.store_id=p_target_id and s.approval_status='approved'
      and m.approval_status='approved') then raise exception 'store unavailable'; end if;
    insert into public.user_catalog_links(user_id,kind,target_type,target_id)
      values(auth.uid(),p_kind,p_target_type,p_target_id) on conflict do nothing;
  else
    delete from public.user_catalog_links where user_id=auth.uid() and kind=p_kind
      and target_type=p_target_type and target_id=p_target_id;
  end if;
end $$;
revoke execute on function public.set_catalog_link(text,text,bigint,boolean) from public,anon;
grant execute on function public.set_catalog_link(text,text,bigint,boolean) to authenticated;

create or replace function private.notify_followed_market_new_store()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if old.approval_status <> 'approved' and new.approval_status='approved'
    and exists(select 1 from public.markets where market_id=new.market_id and approval_status='approved') then
    insert into public.notifications(user_id,type,category,title,body,entity_type,entity_id)
    select l.user_id,'follow_new_store','system','ร้านใหม่ในตลาดที่ติดตาม',
      new.name||' เปิดขายในตลาดที่คุณติดตามแล้ว','store',new.store_id
    from public.user_catalog_links l where l.kind='follow' and l.target_type='market'
      and l.target_id=new.market_id and l.user_id<>new.manager_id;
  end if;
  return new;
end $$;
create trigger followed_market_new_store after update of approval_status on public.stores
for each row execute function private.notify_followed_market_new_store();

create or replace function private.notify_followed_store_restock()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if (old.stock_quantity-old.reserved_quantity<=0 or old.status<>'active')
    and new.stock_quantity-new.reserved_quantity>0 and new.status='active'
    and exists(select 1 from public.stores s join public.markets m on m.market_id=s.market_id
      where s.store_id=new.store_id and s.approval_status='approved' and m.approval_status='approved')
    and not exists(select 1 from public.seller_listings other_listing where other_listing.store_id=new.store_id
      and other_listing.listing_id<>new.listing_id and other_listing.status='active'
      and other_listing.stock_quantity>other_listing.reserved_quantity)
  then
    insert into public.notifications(user_id,type,category,title,body,entity_type,entity_id)
    select l.user_id,'follow_restock','system','สินค้ากลับมาพร้อมขาย',
      s.name||' มีสินค้าพร้อมขายอีกครั้ง','store',new.store_id
    from public.user_catalog_links l join public.stores s on s.store_id=new.store_id
    where l.kind='follow' and l.target_type='store' and l.target_id=new.store_id
      and l.user_id<>new.seller_id;
  end if;
  return new;
end $$;
create trigger followed_store_restock after update of stock_quantity,reserved_quantity,status on public.seller_listings
for each row execute function private.notify_followed_store_restock();
revoke execute on function private.notify_followed_market_new_store(),
  private.notify_followed_store_restock() from public,anon,authenticated;

-- Card metrics expose only approved catalog data and aggregate delivered units.
create index if not exists order_items_store_id_idx on public.order_items(store_id);
create index if not exists orders_market_delivered_idx on public.orders(market_id,order_id)
  where status='delivered';
create or replace function public.get_catalog_card_metrics(p_market_ids bigint[],p_store_ids bigint[])
returns table(entity_type text,entity_id bigint,min_price numeric,rating_average numeric,rating_count integer,sold_quantity bigint)
language plpgsql stable security definer set search_path='' as $$
begin
  if cardinality(coalesce(p_market_ids,'{}'::bigint[]))>100 or cardinality(coalesce(p_store_ids,'{}'::bigint[]))>100
    then raise exception 'too many catalog ids'; end if;
  return query
  select 'market'::text,m.market_id,
    (select min(s.unit_price) from public.stores s where s.market_id=m.market_id and s.approval_status='approved'),
    m.rating_average,m.rating_count,
    (select coalesce(sum(i.quantity),0)::bigint from public.orders o
      join public.order_items i on i.order_id=o.order_id
      where o.market_id=m.market_id and o.status='delivered')
  from public.markets m where m.market_id=any(coalesce(p_market_ids,'{}'::bigint[])) and m.approval_status='approved'
  union all
  select 'store'::text,s.store_id,s.unit_price,s.rating_average,s.rating_count,
    (select coalesce(sum(i.quantity),0)::bigint from public.order_items i
      join public.orders o on o.order_id=i.order_id
      where i.store_id=s.store_id and o.status='delivered')
  from public.stores s join public.markets m on m.market_id=s.market_id
  where s.store_id=any(coalesce(p_store_ids,'{}'::bigint[])) and s.approval_status='approved' and m.approval_status='approved';
end $$;
revoke execute on function public.get_catalog_card_metrics(bigint[],bigint[]) from public;
grant execute on function public.get_catalog_card_metrics(bigint[],bigint[]) to anon,authenticated;

-- Follow updates are news, not approval tasks, even though their target is a store.
create or replace function private.set_notification_category()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if new.type like 'follow_%' then
    new.category='system';
  elsif new.category is null or new.category='system' then
    new.category := case
      when new.type like 'approval%' or new.entity_type in ('market','store','seller') then 'approval'
      when new.type like 'order%' or new.entity_type='order' then 'order'
      when new.type like 'chat%' or new.entity_type='chat' then 'chat'
      else 'system'
    end;
  end if;
  return new;
end $$;
