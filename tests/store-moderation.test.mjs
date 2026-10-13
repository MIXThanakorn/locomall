import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { translateDatabaseError } from "../src/lib/databaseError.ts";
import { auditActionLabel } from "../src/lib/displayText.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const migration = read("supabase/migrations/20261012040048_admin_store_suspension.sql");
const admin = "00000000-0000-4000-8000-000000000001";
const manager = "00000000-0000-4000-8000-000000000002";
const owner = "00000000-0000-4000-8000-000000000003";
const buyer = "00000000-0000-4000-8000-000000000004";
const coSeller = "00000000-0000-4000-8000-000000000005";
const uid = async (db, id) => db.query("select set_config('test.uid',$1,false)", [id]);

test("moderation is admin-only, atomic, idempotent and preserves checkout/fulfillment data", async () => {
  const db = new PGlite();
  try {
    // Reuse the minimal commerce fixture; replace its order stub with the
    // actual COD RPC. PostGIS is represented only by a domain for delivery tests.
    const fixture = read("tests/demo-v1-db.test.mjs").match(/const base = `([\s\S]*?)`;/)[1];
    await db.exec(fixture);
    await db.exec(`create schema extensions; create domain extensions.geography as text;
      grant usage on schema public,private,auth to anon,authenticated;
      create table public.platform_roles(user_id uuid,role text);
      create or replace function private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
        select auth.uid() is not null and exists(select 1 from public.platform_roles where user_id=auth.uid() and role='platform_admin') $$;
      alter table public.stores add column updated_at timestamptz not null default now(), add column approval_note text, add column unit text default 'ชิ้น';
      alter table public.markets add column geography extensions.geography, add column hub_address text, add column subdistrict_code text;
      alter table public.orders add column address_id bigint,add column fulfillment_method text,add column pickup_distance_km numeric,add column updated_at timestamptz default now();
      alter table public.order_items add column product_name text,add column unit text,add column total_amount numeric;
      alter table public.seller_listings add column updated_at timestamptz default now(),add column last_allocated_at timestamptz;
      alter table public.order_allocations add column updated_at timestamptz default now(),add column status text default 'awaiting_preparation',add constraint item_listing_unique unique(order_item_id,listing_id);
      create table public.allocation_status_events(allocation_id bigint,from_status text,to_status text,actor_id uuid,unique(allocation_id,to_status));
      create table public.approval_events(event_id bigint generated always as identity primary key,entity_type text,entity_id bigint,
        action text constraint approval_events_action_check check(action in ('submitted','approved','rejected','suspended')),actor_id uuid,note text);
      create table public.user_addresses(address_id bigint,user_id uuid);
      create table public.user_locations(user_id uuid,subdistrict_code text,geography extensions.geography);
      create table public.carts(buyer_id uuid);
      grant select on public.stores to authenticated;
    `);
    await db.exec(read("supabase/migrations/20261004061208_demo_wallet_reviews_social_v1.sql"));
    const realCod = read("supabase/migrations/20260926025356_market_store_management_and_pickup.sql")
      .match(/create function public\.create_cod_order\([\s\S]*?\n\$\$;/)[0].replace("create function", "create or replace function");
    await db.exec(realCod);
    await db.exec(read("supabase/migrations/20260926075917_prevent_self_purchase_and_accept_orders.sql")
      .match(/create or replace function public\.accept_allocation\([\s\S]*?\n\$\$;/)[0]);
    await db.exec(`revoke execute on function public.create_cod_order(bigint,bigint,jsonb,text,double precision,double precision) from public,anon;
      grant execute on function public.create_cod_order(bigint,bigint,jsonb,text,double precision,double precision) to authenticated;`);
    await db.exec(migration);
    await db.exec("create trigger store_approval_notification after update of approval_status on public.stores for each row execute function private.notify_approval()");
    await db.exec(`insert into public.profiles values('${admin}'),('${manager}'),('${owner}'),('${buyer}'),('${coSeller}');
      insert into public.platform_roles values('${admin}','platform_admin');
      insert into public.markets(market_id,owner_id,name,approval_status) values(1,'${owner}','Market','approved');
      insert into public.stores(store_id,market_id,manager_id,name,product_name,approval_status,unit_price)
        values(1,1,'${manager}','Store','Product','approved',30),(2,1,'${manager}','Pending','Other','pending',20);
      insert into public.seller_listings(listing_id,store_id,seller_id,stock_quantity,reserved_quantity,status)
        values(1,1,'${manager}',10,0,'active'),(2,1,'${coSeller}',10,0,'paused');
      insert into public.user_addresses values(1,'${buyer}');
      insert into public.demo_accounts(user_id,wallet_balance) values('${buyer}',100);
      insert into public.user_catalog_links(user_id,kind,target_type,target_id) values('${buyer}','follow','market',1);`);
    const version = async (id = 1) => (await db.query("select updated_at::text as v from public.stores where store_id=$1", [id])).rows[0].v;
    const moderate = async (suspend, v, reason = "ทดสอบเหตุผล", id = 1) => db.query("select public.set_store_suspension($1,$2,$3,$4::timestamptz) as changed", [id,suspend,reason,v]);
    const initial = await version();
    await db.exec(`create table auth.users(id uuid primary key);
      insert into auth.users select user_id from public.profiles;
      create table public.chat_rooms(room_id bigint primary key,buyer_id uuid,store_id bigint);
      create table public.chat_messages(message_id bigint primary key,room_id bigint,sender_id uuid,message text,created_at timestamptz);`);
    await db.exec(read("supabase/migrations/20261013080347_reliability_order_chat.sql"));
    await db.exec("set role anon");
    await assert.rejects(moderate(true,initial), /permission denied/);
    await db.exec("reset role; set role authenticated");
    for (const id of ["",manager,owner,buyer,coSeller]) {
      await uid(db,id);
      await assert.rejects(moderate(true,initial), /forbidden/);
      await assert.rejects(db.query("select private.set_store_suspension(1,true,'bypass',$1::timestamptz)",[initial]), /forbidden/);
      await assert.rejects(db.query("update public.stores set approval_status='suspended' where store_id=1"), /permission denied/);
    }
    await uid(db,buyer);
    const checkout = () => db.query("select public.create_cod_order_once('20000000-0000-4000-8000-000000000099',1,1,'[{\"store_id\":1,\"quantity\":2}]'::jsonb) as id");
    const order = (await checkout()).rows[0].id;
    assert.equal((await checkout()).rows[0].id,order);
    await db.exec("reset role");
    const before = (await db.query("select * from public.seller_listings order by listing_id")).rows;
    assert.equal(before[0].reserved_quantity,2);
    assert.equal((await db.query("select count(*)::int n from public.orders")).rows[0].n,1);
    const allocation = (await db.query("select a.allocation_id from public.order_allocations a join public.order_items i on i.order_item_id=a.order_item_id where i.order_id=$1",[order])).rows[0].allocation_id;
    await db.exec("set role authenticated");
    await uid(db,admin);
    await assert.rejects(moderate(true,initial," "), /reason required/);
    await assert.rejects(moderate(true,initial,"x".repeat(501)), /reason required/);
    await assert.rejects(moderate(true,initial,"test",2), /state changed|invalid store moderation state/);
    assert.equal((await moderate(true,initial)).rows[0].changed,true);
    assert.equal((await moderate(true,initial)).rows[0].changed,false);
    await assert.rejects(moderate(false,initial), /state changed/);
    await db.exec("reset role");
    assert.deepEqual((await db.query("select * from public.seller_listings order by listing_id")).rows,before);
    assert.equal((await db.query("select count(*)::int n from public.approval_events")).rows[0].n,1);
    assert.equal((await db.query("select count(*)::int n from public.admin_audit_logs where action='suspend_store'")).rows[0].n,1);
    const targets = (await db.query("select user_id,body from public.notifications where type='store_moderation' order by user_id")).rows;
    assert.deepEqual(targets.map((row) => row.user_id),[manager,owner,coSeller].sort());
    assert.ok(targets.every((row) => row.body.includes("ทดสอบเหตุผล")));
    assert.equal((await db.query("select count(*)::int n from public.notifications where type='approval'")).rows[0].n,0);
    await assert.rejects(db.query("insert into public.seller_listings(listing_id,store_id,seller_id) values(3,1,$1)",[buyer]), /store unavailable/);
    await db.exec("set role authenticated");
    await uid(db,buyer);
    await assert.rejects(db.query("select public.create_cod_order(1,1,'[{\"store_id\":1,\"quantity\":1}]'::jsonb)"), /invalid store/);
    await assert.rejects(db.query("select public.create_demo_wallet_order('10000000-0000-4000-8000-000000000001',1,1,'[{\"store_id\":1,\"quantity\":1}]'::jsonb)"), /invalid store/);
    await db.exec("reset role");
    assert.equal((await db.query("select count(*)::int n from public.orders")).rows[0].n,1);
    assert.equal(Number((await db.query("select wallet_balance from public.demo_accounts where user_id=$1",[buyer])).rows[0].wallet_balance),100);
    assert.equal((await db.query("select count(*)::int n from public.demo_order_requests")).rows[0].n,0);
    await uid(db,manager);
    await db.exec("set role authenticated");
    await db.query("select public.accept_allocation($1)",[allocation]);
    await db.exec("reset role");
    assert.equal((await db.query("select status from public.orders where order_id=$1",[order])).rows[0].status,"preparing");
    const suspended = await version();
    await db.exec("update public.markets set approval_status='suspended' where market_id=1; set role authenticated");
    await uid(db,admin);
    await assert.rejects(moderate(false,suspended), /market unavailable/);
    await db.exec("reset role; update public.markets set approval_status='approved' where market_id=1; set role authenticated");
    assert.equal((await moderate(false,suspended,"แก้ไขแล้ว")).rows[0].changed,true);
    assert.equal((await moderate(false,suspended,"แก้ไขแล้ว")).rows[0].changed,false);
    await db.exec("reset role");
    assert.equal((await db.query("select count(*)::int n from public.notifications where type='follow_new_store'")).rows[0].n,0);
    assert.deepEqual((await db.query("select action from public.approval_events order by event_id")).rows.map((row) => row.action),["suspended","restored"]);
    assert.equal((await db.query("select status from public.seller_listings where listing_id=2")).rows[0].status,"paused");
    await db.exec("set role authenticated");
    await uid(db,buyer);
    await db.query("select public.create_cod_order(1,1,'[{\"store_id\":1,\"quantity\":1}]'::jsonb)");
  } finally { await db.close(); }
});

test("moderation UI and messages explain the action and record the reason", () => {
  const screen = read("app/admin/stores.tsx");
  assert.match(screen,/set_store_suspension/);
  assert.match(screen,/p_expected_updated_at: store.updated_at/);
  assert.match(screen,/maxLength=\{500\}/);
  assert.match(screen,/useRealtimeRefresh/);
  assert.match(screen,/RefreshControl/);
  assert.match(screen,/Alert.alert\(suspend/);
  assert.match(read("app/admin/index.tsx"),/\/admin\/stores/);
  assert.match(read("app/admin/audit.tsx"),/item.metadata\?\.note/);
  assert.match(translateDatabaseError({message:"store moderation state changed"}),/รีเฟรช/);
  assert.match(translateDatabaseError({message:"invalid store"}),/ถูกระงับ/);
  assert.equal(auditActionLabel("restore_store"),"คืนสิทธิ์การเปิดขายร้านค้า");
  assert.match(migration,/security invoker/);
  assert.match(migration,/old.approval_status='pending'/);
});
