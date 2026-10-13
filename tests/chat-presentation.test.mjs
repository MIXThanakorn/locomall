import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { chatIsNearBottom, sameChatGroup } from "../src/lib/chatPresentation.ts";

test("chat groups only adjacent same-sender messages within five minutes", () => {
  const first = { sender_id: "buyer", created_at: "2026-10-13T01:00:00Z" };
  assert.equal(sameChatGroup(undefined, first), false);
  assert.equal(sameChatGroup(first, { ...first, created_at: "2026-10-13T01:04:59Z" }), true);
  assert.equal(sameChatGroup(first, { ...first, created_at: "2026-10-13T01:05:00Z" }), false);
  assert.equal(sameChatGroup(first, { ...first, sender_id: "seller" }), false);
  assert.equal(sameChatGroup(first, { ...first, created_at: "bad" }), false);
  assert.equal(sameChatGroup(first, { ...first, created_at: "2026-10-13T00:59:00Z" }), false);
});

test("chat follows keyboard layout only when near the bottom; only gestures change follow intent", () => {
  assert.equal(chatIsNearBottom(400, 600, 1000), true);
  assert.equal(chatIsNearBottom(0, 600, 1000), false);
  assert.equal(chatIsNearBottom(0, 600, 100), true);
  const source = readFileSync(new URL("../app/chat/[id].tsx", import.meta.url), "utf8");
  assert.match(source, /if \(!userScrolling.current\) return/);
  assert.match(source, /onScrollBeginDrag.*userScrolling.current = true/);
  assert.match(source, /onMomentumScrollEnd.*userScrolling.current = false/);
  assert.match(source, /onFocus=\{scrollToLatest\}/);
  assert.match(source, /ข้อความล่าสุด/);
  assert.match(source, /nearBottom.current = true;[\s\S]*await loadMessages/);
});

test("chat visual RPC returns only room partner avatar and public store image, not private profiles", async () => {
  const db = new PGlite();
  const buyer = "00000000-0000-0000-0000-000000000001";
  const seller = "00000000-0000-0000-0000-000000000002";
  const other = "00000000-0000-0000-0000-000000000003";
  try {
    await db.exec(`create role anon; create role authenticated; create schema private; create schema auth;
      grant usage on schema private,auth to authenticated;
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
      create table profiles(user_id uuid primary key,user_img_url text,private_phone text);
      create table stores(store_id bigint primary key,manager_id uuid,image_url text);
      create table chat_rooms(room_id bigint primary key,buyer_id uuid,store_id bigint);
      alter table profiles enable row level security;
      alter table stores enable row level security;
      alter table chat_rooms enable row level security;
      insert into profiles values('${buyer}','https://example.com/buyer.jpg','SECRET'),('${seller}','https://example.com/seller.jpg','SECRET');
      insert into stores values(1,'${seller}','https://example.com/product.jpg'),(2,'${other}',null);
      insert into chat_rooms values(1,'${buyer}',1),(2,'${other}',1),(3,'${buyer}',2);`);
    await db.exec(readFileSync(new URL("../supabase/migrations/20261013074904_chat_visual_context.sql", import.meta.url), "utf8"));
    await db.exec(`set role authenticated; set test.uid='${buyer}'`);
    const visuals = (await db.query("select * from public.get_my_chat_visuals(array[1,2,999]::bigint[])")).rows;
    assert.deepEqual(visuals, [{ room_id: 1, partner_image_url: "https://example.com/seller.jpg", product_image_url: "https://example.com/product.jpg" }]);
    assert.equal(JSON.stringify(visuals).includes("SECRET"), false);
    assert.equal((await db.query("select * from public.get_my_chat_visuals()")).rows.length, 2);
    assert.deepEqual((await db.query("select * from public.get_my_chat_visuals(array[3]::bigint[])")).rows, [{ room_id: 3, partner_image_url: null, product_image_url: null }]);
    await assert.rejects(db.query("select * from public.profiles"), /permission denied/);
    await db.exec(`set test.uid='${seller}'`);
    assert.equal((await db.query("select * from public.get_my_chat_visuals(array[1]::bigint[])")).rows[0].partner_image_url, "https://example.com/buyer.jpg");
    await db.exec(`set test.uid='${other}'`);
    assert.deepEqual((await db.query("select * from public.get_my_chat_visuals(array[1]::bigint[])")).rows, []);
    await db.exec("set test.uid=''");
    assert.deepEqual((await db.query("select * from public.get_my_chat_visuals()")).rows, []);
    await db.exec("reset role; set role anon");
    await assert.rejects(db.query("select * from public.get_my_chat_visuals()"), /permission denied/);
  } finally { await db.close(); }
});

test("market cards use store product image; missing and failed images have a resettable fallback", () => {
  const market = readFileSync(new URL("../app/market/[id].tsx", import.meta.url), "utf8");
  assert.match(market, /ContextImage uri=\{store.image_url\} name=\{store.product_name/);
  assert.doesNotMatch(market, /seller-evidence|product_image_url/);
  const image = readFileSync(new URL("../src/components/ContextImage.tsx", import.meta.url), "utf8");
  assert.match(image, /key=\{props.uri/);
  assert.match(image, /onError=\{\(\) => setFailed\(true\)\}/);
  assert.match(image, /Array.from\(name.trim\(\)\)/);
});
