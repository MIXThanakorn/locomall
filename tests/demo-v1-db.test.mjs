import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

// In-memory PostgreSQL harness for the new migration. The existing PostGIS
// Commerce Core is represented by a minimal order/stock stub here; full
// cross-migration and device tests still require the Supabase test project.
const base = `
create role authenticated; create role anon;
create schema auth; create schema private;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('test.uid',true),'')::uuid $$;
create function private.is_admin() returns boolean language sql stable as $$
  select current_setting('test.admin',true)='yes' $$;
create table public.profiles(user_id uuid primary key);
create table public.markets(market_id bigint primary key,owner_id uuid,name text,description text,image_url text,approval_status text);
create table public.stores(store_id bigint primary key,market_id bigint references public.markets,manager_id uuid,
  name text,description text,image_url text,product_name text,approval_status text,unit_price numeric(12,2));
create table public.seller_listings(listing_id bigint primary key,store_id bigint references public.stores,seller_id uuid,
  stock_quantity integer,reserved_quantity integer,status text);
create table public.orders(order_id bigint generated always as identity primary key,buyer_id uuid references public.profiles,
  market_id bigint references public.markets,total_amount numeric(12,2),status text default 'awaiting_preparation',
  payment_status text default 'cod_pending' constraint orders_payment_status_check
    check(payment_status in ('cod_pending','collected','failed')));
create table public.order_items(order_item_id bigint generated always as identity primary key,
  order_id bigint references public.orders,store_id bigint references public.stores,quantity integer,unit_price numeric(12,2));
create table public.order_allocations(allocation_id bigint generated always as identity primary key,
  order_item_id bigint references public.order_items,listing_id bigint references public.seller_listings,
  seller_id uuid,quantity integer);
create table public.admin_audit_logs(audit_id bigint generated always as identity primary key,actor_id uuid,
  action text,entity_type text,entity_id bigint,metadata jsonb);
create table public.notifications(notification_id bigint generated always as identity primary key,
  user_id uuid,type text,category text,title text,body text,entity_type text,entity_id bigint);
create function public.create_cod_order(p_market_id bigint,p_address_id bigint,p_items jsonb,
  p_fulfillment_method text default 'delivery',p_lat double precision default null,p_lng double precision default null)
returns bigint language plpgsql security definer set search_path='' as $$
declare q integer; sid bigint; price numeric; oid bigint; iid bigint; lid bigint; seller uuid;
begin
  q=(p_items->0->>'quantity')::integer; sid=(p_items->0->>'store_id')::bigint;
  select unit_price into price from public.stores where store_id=sid and market_id=p_market_id and approval_status='approved';
  if price is null or q<=0 then raise exception 'invalid item'; end if;
  update public.seller_listings set reserved_quantity=reserved_quantity+q
    where store_id=sid and status='active' and stock_quantity-reserved_quantity>=q
    returning listing_id,seller_id into lid,seller;
  if lid is null then raise exception 'insufficient stock'; end if;
  insert into public.orders(buyer_id,market_id,total_amount) values(auth.uid(),p_market_id,q*price)
    returning order_id into oid;
  insert into public.order_items(order_id,store_id,quantity,unit_price)
    values(oid,sid,q,price) returning order_item_id into iid;
  insert into public.order_allocations(order_item_id,listing_id,seller_id,quantity)
    values(iid,lid,seller,q);
  return oid;
end $$;
`;
const buyer = "00000000-0000-4000-8000-000000000001";
const seller = "00000000-0000-4000-8000-000000000002";
const admin = "00000000-0000-4000-8000-000000000003";
const topup = "10000000-0000-4000-8000-000000000001";
const orderRequest = "20000000-0000-4000-8000-000000000001";

test("demo migration executes and protects wallet, refunds, reviews and settlement", async () => {
  const db = new PGlite();
  try {
    await db.exec(base);
    await db.exec(readFileSync(new URL("../supabase/migrations/20261004061208_demo_wallet_reviews_social_v1.sql", import.meta.url), "utf8"));
    await db.exec(readFileSync(new URL("../supabase/migrations/20261007024139_scope_order_notifications_and_demo_seller_hold.sql", import.meta.url), "utf8"));
    await db.exec(`insert into public.profiles values('${buyer}'),('${seller}'),('${admin}');
      insert into public.markets values(1,'${seller}','Market','','','approved');
      insert into public.stores values(1,1,'${seller}','Store','','','Product','approved',30);
      insert into public.seller_listings values(1,1,'${seller}',5,0,'active');
      set test.uid='${buyer}'; set test.admin='no';`);
    await db.query("select public.request_demo_topup($1::uuid,100)", [topup]);
    await db.query("select public.request_demo_topup($1::uuid,100)", [topup]);
    assert.equal((await db.query("select count(*)::int n from public.demo_topup_requests")).rows[0].n, 1);
    await assert.rejects(db.query("select public.decide_demo_topup($1::uuid,true)", [topup]), /forbidden/);
    await db.exec(`set test.uid='${admin}'; set test.admin='yes';`);
    await db.query("select public.decide_demo_topup($1::uuid,true)", [topup]);
    await db.query("select public.decide_demo_topup($1::uuid,true)", [topup]);
    assert.equal((await db.query("select count(*)::int n from public.demo_ledger where entry_type='topup'")).rows[0].n, 1);
    await db.exec(`set test.uid='${buyer}'; set test.admin='no';`);
    const args = [orderRequest, 1, null, JSON.stringify([{ store_id: 1, quantity: 2 }])];
    const first = (await db.query("select public.create_demo_wallet_order($1::uuid,$2::bigint,$3::bigint,$4::jsonb)", args)).rows[0].create_demo_wallet_order;
    const again = (await db.query("select public.create_demo_wallet_order($1::uuid,$2::bigint,$3::bigint,$4::jsonb)", args)).rows[0].create_demo_wallet_order;
    assert.equal(first, again);
    assert.equal(Number((await db.query(`select wallet_balance from public.demo_accounts where user_id='${buyer}'`)).rows[0].wallet_balance), 40);
    await db.exec(`set test.uid='${seller}';`);
    assert.equal(Number((await db.query("select public.get_my_demo_seller_held() amount")).rows[0].amount), 60);
    await db.exec(`set test.uid='${buyer}';`);
    assert.equal((await db.query("select reserved_quantity from public.seller_listings where listing_id=1")).rows[0].reserved_quantity, 2);
    await assert.rejects(db.query("select public.create_demo_wallet_order($1::uuid,1,null,$2::jsonb)",
      ["20000000-0000-4000-8000-000000000002", JSON.stringify([{ store_id: 1, quantity: 2 }])]), /insufficient demo balance/);
    assert.equal((await db.query("select count(*)::int n from public.orders")).rows[0].n, 1);
    assert.equal((await db.query("select reserved_quantity from public.seller_listings where listing_id=1")).rows[0].reserved_quantity, 2);
    await assert.rejects(db.query("select public.save_purchase_review($1,null,5,'too early')", [first]), /delivered/);
    await db.query("update public.orders set status='cancelled',payment_status='failed' where order_id=$1", [first]);
    await db.query("update public.orders set status='cancelled' where order_id=$1", [first]);
    assert.equal(Number((await db.query(`select wallet_balance from public.demo_accounts where user_id='${buyer}'`)).rows[0].wallet_balance), 100);
    await db.exec(`set test.uid='${seller}';`);
    assert.equal(Number((await db.query("select public.get_my_demo_seller_held() amount")).rows[0].amount), 0);
    await db.exec(`set test.uid='${buyer}';`);
    assert.equal((await db.query("select count(*)::int n from public.demo_ledger where entry_type='refund'")).rows[0].n, 1);
    const second = (await db.query("select public.create_demo_wallet_order($1::uuid,1,null,$2::jsonb)",
      ["20000000-0000-4000-8000-000000000003", JSON.stringify([{ store_id: 1, quantity: 1 }])])).rows[0].create_demo_wallet_order;
    await db.exec(`set test.uid='${seller}';`);
    assert.equal(Number((await db.query("select public.get_my_demo_seller_held() amount")).rows[0].amount), 30);
    await db.exec(`set test.uid='${buyer}';`);
    await db.query("update public.orders set status='delivered',payment_status='collected' where order_id=$1", [second]);
    await db.exec(`set test.uid='${seller}';`);
    assert.equal(Number((await db.query("select public.get_my_demo_seller_held() amount")).rows[0].amount), 0);
    await db.exec(`set test.uid='${buyer}';`);
    assert.equal((await db.query("select payment_status from public.orders where order_id=$1", [second])).rows[0].payment_status, "demo_paid");
    assert.equal(Number((await db.query(`select seller_pending from public.demo_accounts where user_id='${seller}'`)).rows[0].seller_pending), 30);
    const codOrder = (await db.query("select public.create_cod_order(1,null,$1::jsonb) order_id",
      [JSON.stringify([{ store_id: 1, quantity: 1 }])])).rows[0].order_id;
    await db.query("update public.orders set status='delivered',payment_status='collected' where order_id=$1", [codOrder]);
    assert.equal(Number((await db.query(`select seller_pending from public.demo_accounts where user_id='${seller}'`)).rows[0].seller_pending), 30);
    assert.equal((await db.query("select count(*)::int n from public.demo_ledger where entry_type='seller_sale'")).rows[0].n, 1);
    const item = (await db.query("select order_item_id from public.order_items where order_id=$1", [second])).rows[0].order_item_id;
    await db.query("select public.save_purchase_review($1,null,5,'good')", [second]);
    await db.query("select public.save_purchase_review($1,null,4,'edited')", [second]);
    await db.query("select public.save_purchase_review($1,$2,5,'store')", [second, item]);
    await db.query("select public.save_purchase_review($1,$2,4,'edited store')", [second, item]);
    assert.equal((await db.query("select count(*)::int n from purchase_reviews where order_item_id=$1", [item])).rows[0].n, 1);
    assert.equal((await db.query("select body from purchase_reviews where order_item_id=$1", [item])).rows[0].body, "edited store");
    assert.equal((await db.query("select rating_count from public.markets where market_id=1")).rows[0].rating_count, 1);
    assert.equal((await db.query("select rating_count from public.stores where store_id=1")).rows[0].rating_count, 1);
    const review = (await db.query("select review_id from public.purchase_reviews where market_id=1")).rows[0].review_id;
    await db.exec(`set test.uid='${admin}'; set test.admin='yes';`);
    await db.query("select public.moderate_purchase_review($1,true,'inappropriate')", [review]);
    assert.equal((await db.query("select rating_count from public.markets where market_id=1")).rows[0].rating_count, 0);
    const settlementRequest = "30000000-0000-4000-8000-000000000001";
    await db.query("select public.record_demo_settlement($1::uuid,$2::uuid,'demo receipt')", [settlementRequest,seller]);
    await db.query("select public.record_demo_settlement($1::uuid,$2::uuid,'demo receipt')", [settlementRequest,seller]);
    assert.equal(Number((await db.query(`select seller_pending from public.demo_accounts where user_id='${seller}'`)).rows[0].seller_pending), 0);
    assert.equal((await db.query("select count(*)::int n from public.demo_ledger where entry_type='seller_settlement'")).rows[0].n, 1);
    await assert.rejects(db.query("update public.demo_ledger set wallet_delta=999"), /append-only/);
    await db.exec(`set test.uid='${buyer}'; set test.admin='no';`);
    await db.query("select public.set_catalog_link('favorite','market',1,true)");
    await db.query("select public.set_catalog_link('favorite','market',1,true)");
    await db.query("select public.set_catalog_link('follow','market',1,true)");
    assert.equal((await db.query("select count(*)::int n from public.user_catalog_links where kind='favorite'")).rows[0].n, 1);
    await db.exec(`insert into public.stores values(2,1,'${seller}','New Store','','','Second','pending',20);
      update public.stores set approval_status='approved' where store_id=2;`);
    assert.equal((await db.query("select count(*)::int n from public.notifications where type='follow_new_store'")).rows[0].n, 1);
    const metric = (await db.query("select * from public.get_catalog_card_metrics(array[1]::bigint[],array[1]::bigint[])")).rows;
    assert.equal(Number(metric.find((row) => row.entity_type === "market").min_price), 20);
    assert.equal(Number(metric.find((row) => row.entity_type === "store").sold_quantity), 2);
    const publicReviews = (await db.query("select public.get_catalog_reviews('store',1) value")).rows[0].value;
    assert.equal(publicReviews.length, 1);
    assert.equal("buyer_id" in publicReviews[0], false);
    assert.equal("order_id" in publicReviews[0], false);
    await db.exec(`set test.uid='${buyer}'; set test.admin='no'; set role authenticated;`);
    assert.equal((await db.query("select count(*)::int n from public.demo_accounts")).rows[0].n, 1);
    await assert.rejects(db.query("update public.demo_accounts set wallet_balance=999"), /permission denied/);
    await assert.rejects(db.query("insert into public.demo_ledger(user_id,entry_type,wallet_delta,topup_request_id) values($1,'topup',1,$2)", [buyer,topup]), /permission denied/);
    await db.exec(`reset role; set test.uid='${seller}'; set role authenticated;`);
    assert.equal((await db.query("select count(*)::int n from public.demo_accounts")).rows[0].n, 1);
    assert.equal((await db.query("select count(*)::int n from public.user_catalog_links")).rows[0].n, 0);
    await assert.rejects(db.query("select public.save_purchase_review($1,null,5,'not my order')", [second]), /owned by you/);
    await db.exec("reset role");
  } finally { await db.close(); }
});

test("order notices reach only the buyer, seller, or market owner at their requested milestones", async () => {
  const db = new PGlite();
  const secondSeller = "00000000-0000-4000-8000-000000000004";
  try {
    await db.exec(base);
    await db.exec(`alter table public.orders add column order_number text default 'LM-20261007-12345678';
      alter table public.order_items add column product_name text default 'Demo product';
      alter table public.order_allocations add column status text default 'awaiting_preparation';`);
    await db.exec(readFileSync(new URL("../supabase/migrations/20261004061208_demo_wallet_reviews_social_v1.sql", import.meta.url), "utf8"));
    await db.exec(readFileSync(new URL("../supabase/migrations/20261007024139_scope_order_notifications_and_demo_seller_hold.sql", import.meta.url), "utf8"));
    await db.exec(`create trigger test_order_notice after update of status on public.orders
        for each row execute function private.notify_order_status_change();
      create trigger test_allocation_notice after update of status on public.order_allocations
        for each row execute function private.notify_allocation_ready();
      insert into public.profiles values ('${buyer}'),('${seller}'),('${secondSeller}');
      insert into public.markets(market_id,owner_id,name,approval_status) values(1,'${seller}','Test market','approved');
      insert into public.stores(store_id,market_id,manager_id,name,product_name,approval_status,unit_price)
        values(1,1,'${seller}','Test store','Demo product','approved',30);
      insert into public.seller_listings values(1,1,'${seller}',5,0,'active'),
        (2,1,'${secondSeller}',5,0,'active');
      insert into public.orders(buyer_id,market_id,total_amount) values('${buyer}',1,60);
      insert into public.order_items(order_id,store_id,quantity,unit_price) values(1,1,2,30);
      insert into public.order_allocations(order_item_id,listing_id,seller_id,quantity)
        values(1,1,'${seller}',1),(1,2,'${secondSeller}',1);`);
    await db.exec(`set test.uid='${seller}';
      update public.orders set status='preparing' where order_id=1;
      update public.order_allocations set status='ready_for_pickup' where allocation_id=1;`);
    assert.equal((await db.query(`select count(*)::int n from public.notifications where user_id='${buyer}'`)).rows[0].n, 2);
    assert.equal((await db.query(`select count(*)::int n from public.notifications where user_id='${seller}'`)).rows[0].n, 0);
    await db.exec(`set test.uid='${secondSeller}';
      update public.order_allocations set status='ready_for_pickup' where allocation_id=2;`);
    assert.equal((await db.query(`select count(*)::int n from public.notifications where user_id='${buyer}'`)).rows[0].n, 3);
    await db.exec(`set test.uid='${seller}';
      update public.order_allocations set status='at_hub' where allocation_id=1;`);
    assert.equal((await db.query(`select count(*)::int n from public.notifications where user_id='${seller}'`)).rows[0].n, 0);
    await db.exec(`update public.order_allocations set status='at_hub' where allocation_id=2;
      update public.orders set status='at_hub' where order_id=1;
      update public.orders set status='consolidated' where order_id=1;
      update public.orders set status='shipped' where order_id=1;`);
    assert.equal((await db.query(`select count(*)::int n from public.notifications where user_id='${seller}' and type='order_all_at_hub'`)).rows[0].n, 1);
    assert.equal((await db.query(`select count(*)::int n from public.notifications where user_id='${buyer}'`)).rows[0].n, 3);
    await db.exec(`set test.uid='${buyer}'; update public.orders set status='delivered' where order_id=1;`);
    assert.equal((await db.query(`select count(*)::int n from public.notifications where user_id='${buyer}'`)).rows[0].n, 3);
    assert.equal((await db.query(`select count(*)::int n from public.notifications where user_id='${seller}' and body='ผู้ซื้อยืนยันรับสินค้าแล้ว'`)).rows[0].n, 1);
    assert.equal((await db.query(`select count(*)::int n from public.notifications where user_id='${secondSeller}' and body='ผู้ซื้อยืนยันรับสินค้าแล้ว'`)).rows[0].n, 1);
  } finally { await db.close(); }
});
