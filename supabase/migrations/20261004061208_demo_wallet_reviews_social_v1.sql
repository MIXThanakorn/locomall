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
  check (wallet_delta <> 0 or seller_delta <> 0)
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
  if request_row.status <> 'pending' then raise exception 'request already decided'; end if;
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
declare order_id bigint; payload jsonb; prior public.demo_order_requests; charge numeric;
begin
  if auth.uid() is null or p_request_id is null then raise exception 'authentication required'; end if;
  payload=jsonb_build_object('market',p_market_id,'address',p_address_id,'items',p_items,
    'fulfillment',p_fulfillment_method,'lat',p_lat,'lng',p_lng);
  insert into public.demo_order_requests(user_id,request_id,payload)
    values(auth.uid(),p_request_id,payload) on conflict do nothing;
  select * into prior from public.demo_order_requests
    where user_id=auth.uid() and request_id=p_request_id for update;
  if prior.payload <> payload then raise exception 'request id was already used for different data'; end if;
  if prior.order_id is not null then return prior.order_id; end if;
  order_id=public.create_cod_order(p_market_id,p_address_id,p_items,p_fulfillment_method,p_lat,p_lng);
  select total_amount into charge from public.orders where public.orders.order_id=create_demo_wallet_order.order_id;
  insert into public.demo_accounts(user_id) values(auth.uid()) on conflict do nothing;
  update public.demo_accounts set wallet_balance=wallet_balance-charge,updated_at=now()
    where user_id=auth.uid() and wallet_balance>=charge;
  if not found then raise exception 'insufficient demo balance'; end if;
  update public.orders set payment_method='demo_wallet',payment_status='demo_paid'
    where public.orders.order_id=create_demo_wallet_order.order_id;
  insert into public.demo_ledger(user_id,entry_type,wallet_delta,order_id)
    values(auth.uid(),'purchase',-charge,order_id);
  update public.demo_order_requests set order_id=create_demo_wallet_order.order_id
    where user_id=auth.uid() and request_id=p_request_id;
  return order_id;
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

create or replace function public.record_demo_settlement(p_seller_id uuid,p_evidence_note text)
returns uuid language plpgsql security definer set search_path='' as $$
declare pending numeric(12,2); settlement uuid;
begin
  if auth.uid() is null or not (select private.is_admin()) then raise exception 'forbidden'; end if;
  if length(btrim(coalesce(p_evidence_note,''))) not between 3 and 1000 then raise exception 'evidence note required'; end if;
  select seller_pending into pending from public.demo_accounts where user_id=p_seller_id for update;
  if pending is null or pending<=0 then raise exception 'no pending demo settlement'; end if;
  update public.demo_accounts set seller_pending=0,seller_settled=seller_settled+pending,updated_at=now()
    where user_id=p_seller_id;
  insert into public.demo_settlements(seller_id,amount,evidence_note,recorded_by)
    values(p_seller_id,pending,btrim(p_evidence_note),auth.uid()) returning settlement_id into settlement;
  insert into public.demo_ledger(user_id,entry_type,seller_delta,settlement_id)
    values(p_seller_id,'seller_settlement',-pending,settlement);
  insert into public.admin_audit_logs(actor_id,action,entity_type,metadata)
    values(auth.uid(),'record_demo_settlement','demo_settlement',jsonb_build_object('settlement_id',settlement,'seller_id',p_seller_id,'amount',pending));
  return settlement;
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
  public.record_demo_settlement(uuid,text) from public,anon;
grant execute on function public.request_demo_topup(uuid,numeric),public.decide_demo_topup(uuid,boolean,text),
  public.create_demo_wallet_order(uuid,bigint,bigint,jsonb,text,double precision,double precision),
  public.record_demo_settlement(uuid,text) to authenticated;
