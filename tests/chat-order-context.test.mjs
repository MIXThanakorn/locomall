import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { chatOrderDetailPath, shortChatOrderNumber } from "../src/lib/chatOrderContext.ts";

const buyer = "00000000-0000-0000-0000-000000000001";
const manager = "00000000-0000-0000-0000-000000000002";
const other = "00000000-0000-0000-0000-000000000003";
test("chat order cards do not link a non-allocated store manager to private buyer order details", () => {
  assert.equal(chatOrderDetailPath({ viewer_is_buyer: true, order_id: 10, allocation_id: null }), "/order/10");
  assert.equal(chatOrderDetailPath({ viewer_is_buyer: false, order_id: 10, allocation_id: 42 }), "/seller/allocations/42");
  assert.equal(chatOrderDetailPath({ viewer_is_buyer: false, order_id: 10, allocation_id: null }), null);
  assert.equal(shortChatOrderNumber("LM-20261013-12345678"), "#12345678");
});

test("chat context RPC scopes buyer and store on the server, limits results and excludes personal information", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role authenticated; create role anon; create schema private; create schema auth;
      grant usage on schema auth to authenticated;
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
      create table public.stores(store_id bigint primary key,manager_id uuid);
      create table public.chat_rooms(room_id bigint primary key,buyer_id uuid,store_id bigint);
      create table public.orders(order_id bigint primary key,buyer_id uuid,order_number text,status text,created_at timestamptz,private_address text);
      create table public.order_items(order_item_id bigint primary key,order_id bigint,store_id bigint,product_name text,quantity integer,unit text,total_amount numeric);
      create table public.order_allocations(allocation_id bigint primary key,order_item_id bigint,seller_id uuid);
      alter table public.orders enable row level security;
      alter table public.order_items enable row level security;
      alter table public.chat_rooms enable row level security;
      alter table public.order_allocations enable row level security;
      alter table public.stores enable row level security;
      insert into public.stores values(1,'${manager}'),(2,'${other}');
      insert into public.chat_rooms values(1,'${buyer}',1),(2,'${other}',1),(3,'${buyer}',2);
      insert into public.orders select x,'${buyer}','LM-20261013-'||x,'preparing','2026-10-13'::timestamptz,'SECRET ADDRESS' from generate_series(1,5) x;
      insert into public.orders values(6,'${other}','LM-20261013-OTHER','preparing',now(),'OTHER ADDRESS');
      insert into public.order_items select x,x,1,'Product',2,'ชิ้น',80 from generate_series(1,6) x;
      insert into public.order_items values(99,5,2,'Different shop',1,'ชิ้น',999);
      insert into public.order_allocations values(42,5,'${manager}'),(43,4,'${other}');`);
    await db.exec(readFileSync(new URL("../supabase/migrations/20261013031446_chat_order_context.sql", import.meta.url), "utf8"));
    await db.exec(`set role authenticated; set test.uid='${buyer}';`);
    const own = (await db.query("select * from public.get_chat_order_context(1)")).rows;
    assert.equal(own.length, 3);
    assert.deepEqual(own.map((r) => r.order_id), [5,4,3]);
    assert.ok(own.every((r) => r.viewer_is_buyer && r.product_name === "Product"));
    assert.equal(JSON.stringify(own).includes("ADDRESS"), false);
    assert.deepEqual((await db.query("select * from public.get_chat_order_context(2)")).rows, []);
    assert.deepEqual((await db.query("select * from public.get_chat_order_context(999)")).rows, []);
    await assert.rejects(db.query("select * from public.orders"), /permission denied/);
    await db.exec(`set test.uid='${manager}';`);
    const managed = (await db.query("select * from public.get_chat_order_context(1)")).rows;
    assert.equal(managed[0].allocation_id, 42);
    assert.equal(managed[1].allocation_id, null);
    assert.ok(managed.every((r) => !r.viewer_is_buyer));
    await db.exec(`set test.uid='${other}';`);
    assert.deepEqual((await db.query("select * from public.get_chat_order_context(1)")).rows, []);
    await db.exec(`set test.uid='';`);
    assert.deepEqual((await db.query("select * from public.get_chat_order_context(1)")).rows, []);
    await db.exec("reset role; set role anon");
    await assert.rejects(db.query("select * from public.get_chat_order_context(1)"), /permission denied/);
  } finally { await db.close(); }
});
