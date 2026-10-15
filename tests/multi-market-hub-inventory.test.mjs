import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { groupCartByMarket, canBuyerCancel } from "../src/lib/cartMarkets.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const migration = read("supabase/migrations/20261015044841_multi_market_cart_hub_inventory.sql");
const buyer = "00000000-0000-4000-8000-000000000001";
const seller = "00000000-0000-4000-8000-000000000002";
const seller2 = "00000000-0000-4000-8000-000000000003";
const owner = "00000000-0000-4000-8000-000000000004";
const outsider = "00000000-0000-4000-8000-000000000005";
const admin = "00000000-0000-4000-8000-000000000006";

test("basket groups markets and partial first-seller handoff closes cancellation", () => {
  const row = (market, quantity) => ({ quantity, stores: { market_id: market, unit_price: 30, markets: { name: `M${market}` } } });
  const groups = groupCartByMarket([row(1,2),row(2,1),row(1,3)]);
  assert.deepEqual(groups.map((g) => [g.marketId,g.quantity,g.total]), [[1,5,150],[2,1,30]]);
  assert.equal(groupCartByMarket([{ quantity: 1, stores: null }],1)[0].marketId,0);
  const order = (statuses) => ({ status: "preparing", order_items: [{ order_allocations: statuses.map((status) => ({ status })) }] });
  assert.equal(canBuyerCancel(order(["ready_for_pickup","preparing"])), true);
  assert.equal(canBuyerCancel(order(["collected","preparing"])), false);
  assert.equal(canBuyerCancel(order(["at_hub","preparing"])), false);
  assert.equal(canBuyerCancel({ ...order([]), status: "shipped" }), false);
});

test("multi-market checkout, hub deductions, legacy orders, cancellation/refund and receipt remain atomic and scoped", async () => {
  const db = new PGlite();
  const uid = async (id, isAdmin = false) => {
    await db.query("select set_config('test.uid',$1,false),set_config('test.admin',$2,false)", [id,isAdmin ? "yes" : "no"]);
  };
  try {
    const base = read("tests/demo-v1-db.test.mjs").match(/const base = `([\s\S]*?)`;/)[1];
    await db.exec(base);
    await db.exec(`grant usage on schema public,private,auth to anon,authenticated;
      create schema extensions; create domain extensions.geography as text;
      alter table markets add column geography extensions.geography;
      alter table stores add column unit text default 'ชิ้น';
      alter table seller_listings add column fulfilled_quantity integer not null default 0,add column updated_at timestamptz default now(),add column last_allocated_at timestamptz,
        add check(stock_quantity>=0),add check(reserved_quantity>=0 and reserved_quantity<=stock_quantity);
      alter table orders add column address_id bigint,add column fulfillment_method text default 'delivery',add column pickup_distance_km numeric,
        add column updated_at timestamptz default now(),add column delivered_at timestamptz,add column pickup_ready_at timestamptz;
      alter table order_items add column product_name text,add column unit text,add column total_amount numeric;
      alter table order_allocations add column status text default 'awaiting_preparation',add column updated_at timestamptz default now(),add constraint item_listing_unique unique(order_item_id,listing_id);
      create table allocation_status_events(allocation_id bigint,from_status text,to_status text,actor_id uuid,unique(allocation_id,to_status));
      create table carts(cart_id bigint generated always as identity primary key,buyer_id uuid unique,market_id bigint references markets on delete cascade,updated_at timestamptz default now());
      create table cart_items(cart_item_id bigint generated always as identity primary key,cart_id bigint references carts on delete cascade,store_id bigint,quantity integer,unique(cart_id,store_id));
      create table user_addresses(address_id bigint,user_id uuid);
      create table user_locations(user_id uuid,geography extensions.geography);
      create function private.market_owner(mid bigint) returns boolean language sql stable as $$ select exists(select 1 from public.markets where market_id=mid and owner_id=auth.uid()) $$;
      insert into profiles values('${buyer}'),('${seller}'),('${seller2}'),('${owner}'),('${outsider}'),('${admin}');
      insert into markets(market_id,owner_id,name,approval_status) values(1,'${owner}','A','approved'),(2,'${owner}','B','approved');
      insert into stores(store_id,market_id,manager_id,name,product_name,approval_status,unit_price) values(1,1,'${seller}','Store A','A','approved',30),(2,2,'${seller2}','Store B','B','approved',20);
      insert into seller_listings(listing_id,store_id,seller_id,stock_quantity,reserved_quantity,status,fulfilled_quantity) values(1,1,'${seller}',10,2,'active',1),(2,1,'${seller2}',10,0,'active',0),(3,2,'${seller2}',10,0,'active',0);
      insert into user_addresses values(1,'${buyer}'),(2,'${outsider}');
      insert into orders(buyer_id,market_id,total_amount,status,fulfillment_method) values('${buyer}',1,60,'shipped','delivery'),('${buyer}',1,30,'delivered','delivery');
      insert into order_items(order_id,store_id,quantity,unit_price) values(1,1,2,30),(2,1,1,30);
      insert into order_allocations(order_item_id,listing_id,seller_id,quantity,status) values(1,1,'${seller}',2,'at_hub'),(2,1,'${seller}',1,'at_hub');`);
    await db.exec(read("supabase/migrations/20261004061208_demo_wallet_reviews_social_v1.sql"));
    await db.exec(read("supabase/migrations/20261007024139_scope_order_notifications_and_demo_seller_hold.sql"));
    // Real existing wrappers invoke the shared, newly locked transition helper.
    const core = read("supabase/migrations/20260920070832_commerce_core.sql");
    for (const name of ["record_allocation_collected","record_allocation_at_hub"]) {
      await db.exec(core.match(new RegExp(`create or replace function public\\.${name}\\([\\s\\S]*?\\$\\$;`))[0]);
    }
    await db.exec("update seller_listings set reserved_quantity=1 where listing_id=1; begin");
    await assert.rejects(db.exec(migration), /stock reservation mismatch during hub migration/);
    await db.exec("rollback");
    assert.equal((await db.query("select stock_quantity from seller_listings where listing_id=1")).rows[0].stock_quantity,10);
    assert.equal((await db.query("select count(*)::int n from information_schema.columns where table_name='order_allocations' and column_name='stock_deducted_at'")).rows[0].n,0);
    await db.exec("update seller_listings set reserved_quantity=2 where listing_id=1; begin"); await db.exec(migration); await db.exec("commit");
    const selfPurchase = read("supabase/migrations/20260926075917_prevent_self_purchase_and_accept_orders.sql");
    await db.exec(selfPurchase.slice(selfPurchase.indexOf("create or replace function private.reject_self_purchase"), selfPurchase.indexOf("create or replace function public.accept_allocation")));
    await db.exec("grant select on all tables in schema public to authenticated");
    const stocks = async () => (await db.query("select listing_id,stock_quantity,reserved_quantity,fulfilled_quantity from seller_listings order by listing_id")).rows;
    assert.deepEqual((await stocks())[0], { listing_id:1,stock_quantity:8,reserved_quantity:0,fulfilled_quantity:1 });
    assert.equal((await db.query("select count(*)::int n from order_allocations where stock_deducted_at is not null")).rows[0].n,2);
    await db.exec("set role authenticated"); await uid(buyer);
    await db.query("select public.confirm_delivery(1)"); await db.query("select public.confirm_delivery(1)");
    assert.equal((await stocks())[0].stock_quantity,8);
    assert.equal((await stocks())[0].fulfilled_quantity,3);
    const add = (store, q) => db.query("select public.increment_cart_item($1,$2)",[store,q]);
    await add(1,4); await add(2,2);
    await uid(seller); await assert.rejects(add(1,1), /cannot purchase from your own store/); await uid(buyer);
    assert.equal((await stocks())[0].reserved_quantity,0);
    const cartRows = async () => (await db.query("select store_id,quantity from cart_items order by store_id")).rows;
    assert.deepEqual(await cartRows(), [{store_id:1,quantity:4},{store_id:2,quantity:2}]);
    const order = async (market, store, q, address=1) => (await db.query("select public.create_cod_order($1,$2,$3::jsonb) id", [market,address,JSON.stringify([{store_id:store,quantity:q}])])).rows[0].id;
    const first = await order(1,1,4);
    assert.deepEqual(await cartRows(), [{store_id:2,quantity:2}]);
    assert.equal((await stocks())[0].stock_quantity,8);
    assert.equal((await stocks())[0].reserved_quantity,2);
    await db.query("select public.cancel_order($1)",[first]); await db.query("select public.cancel_order($1)",[first]);
    assert.equal((await stocks())[0].reserved_quantity,0);
    await assert.rejects(order(1,1,999), /insufficient stock/);
    assert.deepEqual(await cartRows(), [{store_id:2,quantity:2}]);
    await uid(outsider); await add(2,1);
    await assert.rejects(db.query("select public.cancel_order($1)",[first]), /forbidden/);
    await uid(buyer);
    await assert.rejects(db.query("select public.create_demo_wallet_order('10000000-0000-4000-8000-000000000010',1,1,'[{\"store_id\":1,\"quantity\":4}]')"), /insufficient demo balance/);
    assert.equal((await stocks())[0].reserved_quantity,0);
    await db.exec("reset role; insert into demo_accounts(user_id,wallet_balance) values('"+buyer+"',1000) on conflict(user_id) do update set wallet_balance=1000; set role authenticated");
    const paid = (await db.query("select public.create_demo_wallet_order('10000000-0000-4000-8000-000000000011',1,1,'[{\"store_id\":1,\"quantity\":4}]') id")).rows[0].id;
    const allocations = (await db.query("select a.* from order_allocations a join order_items i using(order_item_id) where i.order_id=$1 order by allocation_id",[paid])).rows;
    const ready = async (a) => { await uid(a.seller_id); await db.query("select public.accept_allocation($1)",[a.allocation_id]); await db.exec("reset role"); await db.query("select private.transition_allocation($1,'preparing','ready_for_pickup',auth.uid())",[a.allocation_id]); await db.exec("set role authenticated"); };
    await ready(allocations[0]); await uid(owner);
    await db.query("select public.record_allocation_collected($1)",[allocations[0].allocation_id]);
    await uid(buyer);
    await assert.rejects(db.query("select public.cancel_order($1)",[paid]), /closed after seller handoff/);
    await assert.rejects(db.query("select public.cancel_order($1,'spoof',true)",[paid]), /closed after seller handoff/);
    await uid(outsider); await assert.rejects(db.query("select public.record_allocation_at_hub($1)",[allocations[0].allocation_id]), /forbidden/);
    await uid(owner); await db.query("select public.record_allocation_at_hub($1)",[allocations[0].allocation_id]);
    const afterHub = await stocks();
    await db.query("select public.record_allocation_at_hub($1)",[allocations[0].allocation_id]);
    assert.deepEqual(await stocks(), afterHub);
    assert.equal(afterHub[0].stock_quantity,6); assert.equal(afterHub[0].reserved_quantity,0); assert.equal(afterHub[0].fulfilled_quantity,3);
    await ready(allocations[1]); await uid(owner);
    await db.query("select public.record_allocation_collected($1)",[allocations[1].allocation_id]);
    await db.query("select public.record_allocation_at_hub($1)",[allocations[1].allocation_id]);
    await db.exec("reset role"); await db.query("update orders set status='shipped' where order_id=$1",[paid]); await db.exec("set role authenticated");
    const beforeReceipt = await stocks(); await uid(buyer);
    await db.query("select public.confirm_delivery($1)",[paid]); await db.query("select public.confirm_delivery($1)",[paid]);
    const afterReceipt = await stocks();
    assert.deepEqual(afterReceipt.map((s) => [s.stock_quantity,s.reserved_quantity]),beforeReceipt.map((s) => [s.stock_quantity,s.reserved_quantity]));
    assert.equal(afterReceipt[0].fulfilled_quantity,beforeReceipt[0].fulfilled_quantity+2);
    await db.exec("reset role");
    assert.equal((await db.query("select count(*)::int n from demo_ledger where order_id=$1 and entry_type='seller_sale'",[paid])).rows[0].n,2);
    await db.exec("set role authenticated");
    await assert.rejects(db.query("select public.cancel_order($1)",[paid]), /too late to cancel|closed after seller handoff/);
    const balanceBefore = (await db.query("select wallet_balance from demo_accounts where user_id=$1",[buyer])).rows[0].wallet_balance;
    const overridden = (await db.query("select public.create_demo_wallet_order('10000000-0000-4000-8000-000000000012',1,1,'[{\"store_id\":1,\"quantity\":2}]') id")).rows[0].id;
    const partial = (await db.query("select a.* from order_allocations a join order_items i using(order_item_id) where i.order_id=$1 order by allocation_id",[overridden])).rows;
    await ready(partial[0]); await uid(owner);
    await db.query("select public.record_allocation_collected($1)",[partial[0].allocation_id]);
    await db.query("select public.record_allocation_at_hub($1)",[partial[0].allocation_id]);
    const beforeOverride = await stocks();
    await uid(admin,true);
    await assert.rejects(db.query("select public.cancel_order($1,null,true)",[overridden]), /cancellation reason required/);
    await db.query("select public.cancel_order($1,'manual physical return must be handled separately',true)",[overridden]);
    await db.query("select public.cancel_order($1,'repeat',true)",[overridden]);
    const afterOverride = await stocks();
    assert.deepEqual(afterOverride.map((s) => s.stock_quantity),beforeOverride.map((s) => s.stock_quantity));
    assert.ok(afterOverride.every((s) => s.reserved_quantity===0));
    await db.exec("reset role");
    assert.equal((await db.query("select count(*)::int n from demo_ledger where order_id=$1 and entry_type='refund'",[overridden])).rows[0].n,1);
    assert.equal((await db.query("select wallet_balance from demo_accounts where user_id=$1",[buyer])).rows[0].wallet_balance,balanceBefore);
    assert.equal((await db.query("select count(*)::int n from admin_audit_logs where entity_id=$1 and action='cancel_order'",[overridden])).rows[0].n,1);
    await db.exec("set role authenticated"); await uid(buyer);
    await order(2,2,2);
    assert.equal((await db.query("select count(*)::int n from cart_items ci join carts c using(cart_id) where c.buyer_id=$1",[buyer])).rows[0].n,0);
    assert.equal((await db.query("select quantity from cart_items ci join carts c using(cart_id) where c.buyer_id=$1",[outsider])).rows[0].quantity,1);
    await db.exec("reset role; set role anon");
    await assert.rejects(db.query("select public.increment_cart_item(1,1)"), /permission denied/);
    await assert.rejects(db.query("select public.confirm_delivery(1)"), /permission denied/);
    // Run the latest guards on top of real wallet/stock functions, not only
    // the isolated policy fixture. No live records are involved.
    await db.exec(`reset role; create role service_role;
      alter table profiles add column phone_num text default '0812345678';
      alter table markets add column hub_address text;
      alter table orders add column order_number text default 'TEST',add column created_at timestamptz default now(),
        add column tracking_number text,add column courier_name text,add column shipped_at timestamptz;
      alter table order_items add column product_image_url text;
      alter table order_allocations add column created_at timestamptz default now();
      create table chat_messages(room_id bigint,sender_id uuid,message text,created_at timestamptz default now());
      create table store_seller_applications(applicant_id uuid);
      create function private.store_manager(sid bigint) returns boolean language sql stable as $$
        select exists(select 1 from public.stores where store_id=sid and manager_id=auth.uid()) $$;`);
    await uid("");
    await db.exec(read("supabase/migrations/20261015120640_backend_consistency_security_hardening.sql"));
    await db.exec("set role authenticated"); await uid(buyer);
    const guardedBalanceBefore = (await db.query("select wallet_balance from demo_accounts where user_id=$1",[buyer])).rows[0].wallet_balance;
    const guarded = (await db.query("select public.create_demo_wallet_order('10000000-0000-4000-8000-000000000099',1,1,'[{\"store_id\":1,\"quantity\":1}]') id")).rows[0].id;
    await db.query("select public.cancel_order($1)",[guarded]);
    await db.query("select public.cancel_order($1)",[guarded]);
    assert.equal((await db.query("select wallet_balance from demo_accounts where user_id=$1",[buyer])).rows[0].wallet_balance,guardedBalanceBefore,"new guards preserve one-time refund and atomic stock checkout");
  } finally { await db.close(); }
});
