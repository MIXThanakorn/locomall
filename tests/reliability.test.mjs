import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { createSecureSessionStorage } from "../src/lib/secureSessionStorage.ts";
import { createRefreshQueue } from "../src/lib/refreshQueue.ts";
import { mergeChatMessages } from "../src/lib/chatHistory.ts";

const memory = () => {
  const values = new Map();
  return { values, getItem: async (key) => values.get(key) ?? null, setItem: async (key, value) => { values.set(key, value); }, removeItem: async (key) => { values.delete(key); } };
};
test("secure session migration chunks Unicode safely and deletes plaintext only after commit", async () => {
  const secure = memory(); const legacy = memory(); let n = 0;
  const storage = createSecureSessionStorage(secure, legacy, () => `id-${++n}`);
  const session = JSON.stringify({ token: "😀ก".repeat(4000) });
  legacy.values.set("sb-test", session);
  assert.equal(await storage.getItem("sb-test"), session);
  assert.equal(legacy.values.has("sb-test"), false);
  assert.ok([...secure.values.values()].every((value) => Buffer.byteLength(value) <= 1200));
  await Promise.all([storage.setItem("sb-test", "first"), storage.setItem("sb-test", "second")]);
  assert.equal(await storage.getItem("sb-test"), "second");
  await storage.removeItem("sb-test");
  assert.equal(await storage.getItem("sb-test"), null);
  assert.equal(secure.values.size, 0);
});
test("failed secure migration retains legacy and never silently reads plaintext", async () => {
  const legacy = memory(); legacy.values.set("sb-test", "token");
  const secure = memory(); secure.setItem = async () => { throw new Error("locked"); };
  const storage = createSecureSessionStorage(secure, legacy, () => "id-1");
  await assert.rejects(storage.getItem("sb-test"), /locked/);
  assert.equal(legacy.values.get("sb-test"), "token");
});
test("realtime bursts are serialized, catch up once and stop on blur", async () => {
  let calls = 0; let concurrent = 0; let max = 0; let release;
  const queue = createRefreshQueue(async () => { calls++; concurrent++; max = Math.max(max, concurrent); await new Promise((resolve) => { release = resolve; }); concurrent--; });
  const first = queue.run();
  await queue.run(); await queue.run(); release();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(calls, 2); assert.equal(max, 1);
  queue.stop(); release(); await first; await queue.run(); assert.equal(calls, 2);
});
test("message merging deduplicates and preserves microsecond ordering", () => {
  const m = (id, at) => ({ message_id: id, created_at: `2026-10-13T01:00:00.${at}+00:00`, sender_id: "a", message: "test" });
  assert.deepEqual(mergeChatMessages([m(9,"123457")], [m(9,"123457"),m(10,"123456")]).map((r) => r.message_id), [10,9]);
});

test("COD requests replay once, reject changed payload, isolate users and roll back failed stock allocation; chat pages enforce participants", async () => {
  const db = new PGlite();
  const buyer = "00000000-0000-0000-0000-000000000001";
  const seller = "00000000-0000-0000-0000-000000000002";
  const other = "00000000-0000-0000-0000-000000000003";
  const request = "00000000-0000-0000-0000-000000000010";
  try {
    await db.exec(`create role anon; create role authenticated; create schema private; create schema auth;
      grant usage on schema private,auth to authenticated;
      create table auth.users(id uuid primary key); insert into auth.users values('${buyer}'),('${seller}'),('${other}');
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
      create table test_stock(stock int); insert into test_stock values(2);
      create table test_orders(id bigint generated always as identity primary key);
      create function public.create_cod_order(bigint,bigint,jsonb,text,double precision,double precision) returns bigint language plpgsql as $$
      declare v_id bigint; begin
        update public.test_stock set stock=stock-1;
        if (select stock from public.test_stock)<0 then raise exception 'Insufficient stock'; end if;
        insert into public.test_orders default values returning id into v_id; return v_id;
      end $$;
      create table stores(store_id bigint primary key,manager_id uuid);
      create table chat_rooms(room_id bigint primary key,buyer_id uuid,store_id bigint);
      create table chat_messages(message_id bigint primary key,room_id bigint,sender_id uuid,message text,created_at timestamptz);
      insert into stores values(1,'${seller}'); insert into chat_rooms values(1,'${buyer}',1);
      insert into chat_messages select i,1,'${buyer}','message '||i,'2026-10-13T00:00:00Z'::timestamptz from generate_series(1,90)i;`);
    await db.exec(readFileSync(new URL("../supabase/migrations/20261013080347_reliability_order_chat.sql", import.meta.url), "utf8"));
    await db.exec(`set role authenticated; set test.uid='${buyer}'`);
    const call = (id = request, market = 1) => db.query(`select public.create_cod_order_once('${id}',${market},null,'[]') id`);
    const first = (await call()).rows[0].id;
    assert.equal((await call()).rows[0].id, first);
    await assert.rejects(call(request,2), /different order/);
    await assert.rejects(db.query("select * from private.cod_order_requests"), /permission denied/);
    const latest = (await db.query("select * from public.get_chat_messages_page(1,41)")).rows;
    assert.equal(latest[0].message_id,90); assert.equal(latest.length,41);
    const older = (await db.query("select * from public.get_chat_messages_page(1,41,'2026-10-13T00:00:00Z',51)")).rows;
    assert.equal(older[0].message_id,50);
    const newer = (await db.query("select * from public.get_chat_messages_page(1,41,'2026-10-13T00:00:00Z',50,true)")).rows;
    assert.equal(newer[0].message_id,51); assert.equal(newer.at(-1).message_id,90);
    await assert.rejects(db.query("select * from public.get_chat_messages_page(1,500)"), /Invalid page size/);
    await db.exec(`set test.uid='${other}'`);
    await assert.rejects(db.query("select * from public.get_chat_messages_page(1)"), /Chat access denied/);
    assert.notEqual((await call()).rows[0].id,first);
    await assert.rejects(call("00000000-0000-0000-0000-000000000011"), /Insufficient stock/);
    await db.exec("reset role");
    assert.equal((await db.query("select stock from test_stock")).rows[0].stock,0);
    assert.equal((await db.query("select count(*)::int n from private.cod_order_requests")).rows[0].n,2);
    await db.exec("set role anon");
    await assert.rejects(call(), /permission denied/);
  } finally { await db.close(); }
});
