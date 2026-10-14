import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { notificationPath } from "../src/lib/notificationRoute.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const migration = read("supabase/migrations/20261014121901_apk_account_notifications_checkout.sql");
const owner = "00000000-0000-4000-8000-000000000001";
const seller = "00000000-0000-4000-8000-000000000002";
const buyer = "00000000-0000-4000-8000-000000000003";
const admin = "00000000-0000-4000-8000-000000000004";
const other = "00000000-0000-4000-8000-000000000005";

test("notification destinations handle legacy plural types, role-specific details and invalid IDs", () => {
  assert.equal(notificationPath({ entity_type: "stores", entity_id: 12, category: "approval" }), "/store/manage/edit?storeId=12");
  assert.equal(notificationPath({ entity_type: "store_request", entity_id: 12 }), "/market/manage/request/12");
  assert.equal(notificationPath({ entity_type: "seller_request", entity_id: 8 }), "/market/manage?applicationId=8");
  assert.equal(notificationPath({ entity_type: "allocation", entity_id: 9 }), "/seller/allocations/9");
  assert.equal(notificationPath({ entity_type: "order_hub_ready", entity_id: 9 }), "/market/manage/logistics?orderId=9");
  assert.equal(notificationPath({ entity_type: "chat", entity_id: "../../admin" }), "/(tabs)/notification");
  assert.equal(notificationPath({ entity_type: "order", entity_id: -1 }), "/(tabs)/notification");
});

test("switch handoff has a single auth-state owner and defers native navigation until committed", () => {
  const auth = read("src/context/AuthContext.tsx");
  const switching = auth.slice(auth.indexOf("const switchAccount ="), auth.indexOf("useEffect(() => {", auth.indexOf("const switchAccount =")));
  assert.doesNotMatch(switching, /setHasPhone\(null\)|setHasLocation\(null\)|setSession\(result/);
  assert.match(switching, /rememberAccount\(next\)/);
  assert.match(switching, /previous\.access_token/);
  const screen = read("app/(auth)/switch-account.tsx");
  assert.match(screen, /session\?\.user\.id !== selectedId/);
  assert.match(screen, /requestAnimationFrame/);
  assert.match(screen, /selecting\.current/);
  assert.match(read("app/(auth)/_layout.tsx"), /switch-account" options=\{\{ animation: "none"/);
  assert.match(read("app/_layout.tsx"), /name="\(auth\)" options=\{\{ animation: "none"/);
});

test("checkout reloads owner-scoped addresses on focus, preserving selection and cancelling stale loads", () => {
  const checkout = read("app/order/checkout.tsx");
  assert.match(checkout, /useFocusEffect\(useCallback\(\(\) => \{\s*if \(userId\) void loadCheckout\(\)/);
  assert.match(checkout, /eq\("user_id", userId!\)/);
  assert.match(checkout, /nextAddresses\.some/);
  assert.match(checkout, /counter\.current\+\+/);
});

test("request triggers, private seller contacts, owned deep links and read-only archive are isolated", async () => {
  const db = new PGlite();
  const setUid = (id) => db.query("select set_config('test.uid',$1,false)", [id]);
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth; create schema private;
      grant usage on schema public,auth,private to authenticated;
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
      create table platform_roles(user_id uuid,role text);
      create function private.is_admin() returns boolean language sql stable as $$ select exists(select 1 from public.platform_roles where user_id=auth.uid() and role='platform_admin') $$;
      create table profiles(user_id uuid primary key,username text,display_name text,full_name text,phone_num text);
      create table markets(market_id bigint primary key,owner_id uuid);
      create table stores(store_id bigint primary key,market_id bigint,manager_id uuid,name text,approval_status text);
      create table store_seller_applications(application_id bigint primary key,store_id bigint,applicant_id uuid,status text);
      create table notifications(notification_id bigint generated always as identity primary key,user_id uuid,type text,category text,title text,body text,entity_type text,entity_id bigint,read_at timestamptz);
      create table orders(order_id bigint primary key,market_id bigint,buyer_id uuid,status text);
      create table order_items(order_item_id bigint primary key,order_id bigint);
      create table order_allocations(allocation_id bigint primary key,order_item_id bigint,seller_id uuid);
      insert into profiles values('${owner}','owner','Owner','','0800000001'),('${seller}','seller','Seller','','0800000002'),('${buyer}','buyer','Buyer','','0800000003'),('${admin}','admin','Admin','','0800000004'),('${other}','other','Other','','0800000005');
      insert into platform_roles values('${admin}','platform_admin');
      insert into markets values(1,'${owner}'),(2,'${other}');`);
    await db.exec(migration);
    await setUid(seller);
    await db.exec(`insert into stores values(1,1,'${seller}','ร้านทดสอบ','pending');
      update stores set name='แก้ชื่อ' where store_id=1;
      insert into store_seller_applications values(1,1,'${buyer}','pending');`);
    assert.equal((await db.query("select count(*)::int n from notifications where user_id=$1", [owner])).rows[0].n, 2);
    assert.equal((await db.query("select count(*)::int n from notifications where user_id=$1", [seller])).rows[0].n, 0);
    await db.exec("update store_seller_applications set status='rejected' where application_id=1; update store_seller_applications set status='pending' where application_id=1");
    assert.equal((await db.query("select count(*)::int n from notifications where user_id=$1", [owner])).rows[0].n, 3);
    await setUid(owner);
    await db.exec(`insert into stores values(2,1,'${owner}','เจ้าของขายเอง','pending'); insert into store_seller_applications values(2,1,'${owner}','pending');`);
    assert.equal((await db.query("select count(*)::int n from notifications where user_id=$1", [admin])).rows[0].n, 2);
    await db.exec(`insert into orders values(1,1,'${buyer}','preparing'),(2,2,'${buyer}','preparing');
      insert into order_items values(1,1),(2,2);
      insert into order_allocations values(1,1,'${seller}'),(2,1,'${other}'),(3,2,'${seller}');
      insert into notifications(user_id,type,category,entity_type,entity_id,read_at) values
        ('${buyer}','order_status','order','order',1,now()),
        ('${seller}','order_new','order','order',1,null),
        ('${owner}','order_all_at_hub','order','order',1,null),
        ('${buyer}','chat_message','chat','chat',1,now());
      set role authenticated;`);
    await setUid(owner);
    assert.equal((await db.query("select * from public.get_market_seller_contacts()")).rows.length, 2);
    assert.equal((await db.query("select * from public.get_market_seller_contacts(2)")).rows.length, 0);
    assert.equal((await db.query("select * from public.get_market_application_contacts()")).rows.length, 2);
    await setUid(buyer);
    assert.equal((await db.query("select * from public.get_market_seller_contacts(1)")).rows.length, 0);
    assert.equal((await db.query("select * from public.get_market_application_contacts()")).rows.length, 0);
    // Test routing from known IDs read as the fixture owner, then return to auth.
    await db.exec("reset role");
    const rows = (await db.query("select notification_id,user_id,type from notifications where entity_type='order'")).rows;
    await db.exec("set role authenticated");
    const buyerRow = rows.find((row) => row.user_id===buyer);
    const sellerRow = rows.find((row) => row.user_id===seller);
    const hubRow = rows.find((row) => row.type==='order_all_at_hub');
    const target = (id) => db.query("select * from public.get_my_notification_target($1)",[id]);
    await setUid(seller);
    assert.equal((await target(sellerRow.notification_id)).rows[0].entity_type, "allocation");
    assert.equal((await target(buyerRow.notification_id)).rows.length, 0);
    await setUid(owner);
    assert.equal((await target(hubRow.notification_id)).rows[0].entity_type, "order_hub_ready");
    await setUid(buyer);
    assert.equal((await db.query("select public.dismiss_my_read_notifications() n")).rows[0].n, 1);
    assert.equal((await db.query("select public.dismiss_my_read_notifications() n")).rows[0].n, 0);
    await db.exec("reset role");
    assert.equal((await db.query("select count(*)::int n from notifications where category='chat' and dismissed_at is not null")).rows[0].n, 0);
    assert.equal((await db.query("select count(*)::int n from notifications where user_id<>$1 and dismissed_at is not null",[buyer])).rows[0].n, 0);
    await db.exec("set role anon");
    await assert.rejects(db.query("select public.dismiss_my_read_notifications()"), /permission denied/);
    await assert.rejects(db.query("select * from public.get_market_seller_contacts()"), /permission denied/);
    await db.exec("reset role; set role authenticated"); await setUid("");
    await assert.rejects(db.query("select public.dismiss_my_read_notifications()"), /authentication required/);
  } finally { await db.close(); }
});
