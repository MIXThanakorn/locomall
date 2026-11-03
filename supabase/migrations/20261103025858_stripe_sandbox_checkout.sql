-- Sandbox only. No real balances, transfers or seller payouts.
begin;
grant usage on schema private to service_role;
alter table public.orders drop constraint orders_payment_method_check;
alter table public.orders add constraint orders_payment_method_check check(payment_method in ('cod','demo_wallet','stripe_test'));
alter table public.orders drop constraint orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check check(payment_status in
 ('cod_pending','collected','failed','demo_paid','demo_refunded','stripe_pending','stripe_paid','stripe_refund_pending','stripe_refunded'));
create table private.stripe_payments (
 order_id bigint primary key references public.orders on delete restrict,
 buyer_id uuid not null references public.profiles(user_id), request_id uuid not null,
 payload jsonb not null, amount bigint not null check(amount>0), currency text not null default 'thb' check(currency='thb'),
 session_id text unique, checkout_url text, payment_intent text, refund_id text,
 status text not null default 'creating' check(status in ('creating','open','processing','paid','cancelled','expired','refund_pending','refunded','review')),
 expires_at timestamptz not null default (now()+interval '1 hour'),
 next_check_at timestamptz not null default now(), created_at timestamptz not null default now(),
 unique(buyer_id,request_id)
);
alter table private.stripe_payments enable row level security;
revoke all on private.stripe_payments from public,anon,authenticated;
create index stripe_payments_due on private.stripe_payments(next_check_at) where status not in ('paid','refunded','expired','review');

-- The marker is transaction-local and only set by a service-only RPC.
create function private.initialize_stripe_order() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if current_setting('locomall.stripe_order',true)='yes' then
   new.payment_method:='stripe_test'; new.payment_status:='stripe_pending';
 end if;
 return new;
end $$;
create trigger aa_initialize_stripe_order before insert on public.orders for each row execute function private.initialize_stripe_order();

-- Preserve the existing COD/demo notification implementation; gate only pending Stripe.
do $$ declare definition text; begin
 select pg_get_functiondef('private.notify_new_order_allocation()'::regprocedure) into definition;
 definition:=regexp_replace(definition,'\mbegin\M',
  'begin if exists(select 1 from public.orders o join public.order_items i on i.order_id=o.order_id where i.order_item_id=new.order_item_id and o.payment_method=''stripe_test'' and o.payment_status<>''stripe_paid'') then return new; end if;', 'i');
 execute definition;
end $$;

create function private.guard_stripe_allocation() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status is distinct from old.status and new.status<>'cancelled' and exists(
   select 1 from public.orders o join public.order_items i on i.order_id=o.order_id
   where i.order_item_id=new.order_item_id and o.payment_method='stripe_test' and o.payment_status<>'stripe_paid'
 ) then raise exception 'payment must succeed before seller work'; end if;
 return new;
end $$;
create trigger aa_guard_stripe_allocation before update on public.order_allocations for each row execute function private.guard_stripe_allocation();

create function private.stripe_order_transition() returns trigger language plpgsql security definer set search_path='' as $$
declare p private.stripe_payments;
begin
 if new.payment_method<>'stripe_test' then return new; end if;
 select * into p from private.stripe_payments where order_id=new.order_id for update;
 if new.status='cancelled' then
   new.payment_status:=case when p.status='refunded' then 'stripe_refunded' when p.status in ('paid','refund_pending') then 'stripe_refund_pending' else 'failed' end;
   update private.stripe_payments set status=case when status='refunded' then status when status in ('paid','refund_pending') then 'refund_pending' else 'cancelled' end,next_check_at=now() where order_id=new.order_id;
 elsif new.status='delivered' then new.payment_status:='stripe_paid';
 elsif new.status is distinct from old.status and new.payment_status<>'stripe_paid' then raise exception 'payment must succeed before fulfillment';
 end if;
 return new;
end $$;
create trigger orders_stripe_transition before update of status on public.orders for each row execute function private.stripe_order_transition();

create function private.begin_stripe_order(p_user uuid,p_request uuid,p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare p private.stripe_payments; oid bigint; total bigint;
begin
 if p_user is null or p_request is null or jsonb_typeof(p_payload)<>'object' then raise exception 'invalid request'; end if;
 -- Serialize retries without holding a database transaction across network calls.
 perform pg_advisory_xact_lock(hashtextextended(p_user::text||p_request::text,0));
 select * into p from private.stripe_payments where buyer_id=p_user and request_id=p_request;
 if found then
   if p.payload<>p_payload then raise exception 'request ID payload mismatch'; end if;
   return to_jsonb(p);
 end if;
 perform set_config('request.jwt.claim.sub',p_user::text,true);
 perform set_config('locomall.stripe_order','yes',true);
 oid:=public.create_cod_order((p_payload->>'marketId')::bigint,(p_payload->>'addressId')::bigint,p_payload->'items',
   p_payload->>'fulfillment',(p_payload->>'latitude')::double precision,(p_payload->>'longitude')::double precision);
 perform set_config('locomall.stripe_order','',true);
 select (total_amount*100)::bigint into total from public.orders where order_id=oid;
 if total is null or total<1000 or total>50000000 then raise exception 'Stripe test amount must be 10 to 500000 THB'; end if;
 insert into private.stripe_payments(order_id,buyer_id,request_id,payload,amount) values(oid,p_user,p_request,p_payload,total) returning * into p;
 return to_jsonb(p);
end $$;
create function public.begin_stripe_order(p_user uuid,p_request uuid,p_payload jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.begin_stripe_order(p_user,p_request,p_payload) $$;

create function private.stripe_context(p_user uuid,p_order bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare p private.stripe_payments;
begin
 select * into p from private.stripe_payments where order_id=p_order and buyer_id=p_user;
 if not found then raise exception 'payment not found'; end if;
 return to_jsonb(p);
end $$;
create function public.stripe_context(p_user uuid,p_order bigint) returns jsonb language sql security invoker set search_path='' as $$ select private.stripe_context(p_user,p_order) $$;

-- Only trusted backend code may supply provider state after fetching Stripe directly.
create function private.sync_stripe_payment(p_order bigint,p_session text,p_url text,p_amount bigint,p_currency text,p_state text,p_intent text default null,p_refund text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare p private.stripe_payments; o public.orders;
begin
 select * into o from public.orders where order_id=p_order for update;
 select * into p from private.stripe_payments where order_id=p_order for update;
 if not found or o.payment_method<>'stripe_test' or p_amount is null or p_amount<>p.amount or p_currency is null or p_currency<>'thb' or p_session is null or p_session not like 'cs_test_%'
   or (p.session_id is not null and p.session_id<>p_session) then raise exception 'payment verification mismatch'; end if;
 if p_state not in ('open','processing','paid','expired','refunded') then raise exception 'invalid provider state'; end if;
 if p_refund is not null and p_refund not like 're_%' then raise exception 'invalid refund'; end if;
 update private.stripe_payments set session_id=p_session,checkout_url=coalesce(p_url,checkout_url),payment_intent=coalesce(p_intent,payment_intent),refund_id=coalesce(p_refund,refund_id),next_check_at=now()+interval '1 minute' where order_id=p_order;
 if p.status='refunded' then return to_jsonb(p); end if;
 if p_state='refunded' then
   if p_refund is null or p_refund not like 're_%' or o.status<>'cancelled' then raise exception 'invalid refund'; end if;
   update private.stripe_payments set status='refunded',refund_id=p_refund where order_id=p_order;
   update public.orders set payment_status='stripe_refunded',updated_at=now() where order_id=p_order;
 elsif p_state='paid' then
   if p_intent is null or p_intent not like 'pi_%' then raise exception 'missing payment intent'; end if;
   if o.status='cancelled' then
     update private.stripe_payments set status='refund_pending' where order_id=p_order;
     update public.orders set payment_status='stripe_refund_pending',updated_at=now() where order_id=p_order;
   elsif p.status<>'paid' then
     update private.stripe_payments set status='paid' where order_id=p_order;
     update public.orders set payment_status='stripe_paid',updated_at=now() where order_id=p_order;
     insert into public.notifications(user_id,type,category,title,body,entity_type,entity_id)
       select distinct a.seller_id,'order_new','order','ออเดอร์ใหม่','ชำระเงินทดสอบแล้ว เปิดดูรายการสินค้าที่ต้องเตรียม','order',p_order
       from public.order_allocations a join public.order_items i on i.order_item_id=a.order_item_id where i.order_id=p_order;
   end if;
 elsif p_state='expired' and p.status not in ('paid','refund_pending') then
   if o.status<>'cancelled' then
     perform set_config('request.jwt.claim.sub',p.buyer_id::text,true);
     perform private.cancel_order(p_order,'Stripe test checkout expired',false);
   end if;
   update private.stripe_payments set status='expired' where order_id=p_order;
 elsif p.status not in ('paid','refund_pending','cancelled','expired') then
   update private.stripe_payments set status=p_state where order_id=p_order;
 end if;
 select * into p from private.stripe_payments where order_id=p_order;
 return to_jsonb(p);
end $$;
create function public.sync_stripe_payment(p_order bigint,p_session text,p_url text,p_amount bigint,p_currency text,p_state text,p_intent text default null,p_refund text default null)
returns jsonb language sql security invoker set search_path='' as $$ select private.sync_stripe_payment(p_order,p_session,p_url,p_amount,p_currency,p_state,p_intent,p_refund) $$;

create function private.stripe_due_payments() returns jsonb language sql security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(p)),'[]'::jsonb) from (select * from private.stripe_payments
 where status not in ('paid','refunded','expired','review') and next_check_at<=now() order by next_check_at limit 10) p
$$;
create function public.stripe_due_payments() returns jsonb language sql security invoker set search_path='' as $$ select private.stripe_due_payments() $$;
do $$ declare f record; begin
 for f in select p.oid::regprocedure sig,n.nspname ns,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname in ('public','private') and p.proname in ('begin_stripe_order','stripe_context','sync_stripe_payment','stripe_due_payments') loop
 execute format('revoke all on function %s from public,anon,authenticated',f.sig);
 execute format('grant execute on function %s to service_role',f.sig);
 end loop;
end $$;
revoke all on function private.initialize_stripe_order(),private.guard_stripe_allocation(),private.stripe_order_transition() from public,anon,authenticated;
-- Seller queues do not display unpaid provisional allocations.
do $$ declare definition text; begin
 select pg_get_functiondef('private.get_my_seller_allocations(bigint)'::regprocedure) into definition;
 definition:=replace(definition,'and a.seller_id=(select auth.uid())','and (o.payment_method<>''stripe_test'' or o.payment_status=''stripe_paid'') and a.seller_id=(select auth.uid())');
 execute definition;
end $$;
-- Worker wakeups contain a dedicated token, never the Stripe key or service-role key.
create function private.wake_stripe_worker() returns void language plpgsql security definer set search_path='' as $$
declare endpoint text; token text;
begin
 if not exists(select 1 from private.stripe_payments where status not in ('paid','refunded','expired','review') and next_check_at<=now()) then return; end if;
 select decrypted_secret into endpoint from vault.decrypted_secrets where name='locomall_stripe_worker_url';
 select decrypted_secret into token from vault.decrypted_secrets where name='locomall_stripe_worker_token';
 if endpoint is null or token is null then return; end if;
 perform net.http_post(url:=endpoint,headers:=jsonb_build_object('Content-Type','application/json','x-worker-token',token),body:='{}'::jsonb,timeout_milliseconds:=5000);
end $$;
revoke all on function private.wake_stripe_worker() from public,anon,authenticated;
-- Cron installation is separate so the SQL contract can be exercised without network extensions.
notify pgrst,'reload schema';
commit;
