import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

test("sale units stay immutable after approval and new phone values are validated", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create schema private;
      create table public.profiles (user_id uuid primary key, phone_num text);
      create table public.stores (store_id bigint primary key, unit text not null, approval_status text not null);
      create table public.seller_listings (store_id bigint);
      create table public.cart_items (store_id bigint);
      create table public.order_items (store_id bigint);
      create index order_items_store_id_idx on public.order_items(store_id);
      create index order_items_store_idx on public.order_items(store_id);
      insert into public.profiles values ('00000000-0000-0000-0000-000000000001', 'invalid-old');
      insert into public.stores values (3,'กก.','approved');
    `);
    const migration = readFileSync(new URL("../supabase/migrations/20261007032858_protect_sale_units_and_phone_format.sql", import.meta.url), "utf8");
    await db.exec(migration);
    await db.exec("insert into public.stores values (1,'ชิ้น','pending'),(2,'500 กรัม','approved')");
    await assert.rejects(db.exec("insert into public.stores values (4,'0 กิโลกรัม','pending')"), /invalid sale unit/);
    await assert.rejects(db.exec("insert into public.stores values (4,'กก.','pending')"), /invalid sale unit/);
    await db.exec("update public.stores set unit='0.5 กิโลกรัม' where store_id=1");
    await db.exec("update public.stores set unit='กก.' where store_id=3");
    await assert.rejects(db.exec("update public.stores set unit='1 กิโลกรัม' where store_id=2"), /sale unit cannot change/);
    await db.exec("insert into public.seller_listings values (1)");
    await assert.rejects(db.exec("update public.stores set unit='ชิ้น' where store_id=1"), /sale unit cannot change/);
    await db.exec("insert into public.profiles values ('00000000-0000-0000-0000-000000000002',null)");
    await assert.rejects(db.exec("insert into public.profiles values ('00000000-0000-0000-0000-000000000003','1234567890')"), /profiles_phone_num_format_check/);
    await db.exec("update public.profiles set phone_num='0812345678' where user_id='00000000-0000-0000-0000-000000000001'");
    const indexes = await db.query("select indexname from pg_indexes where schemaname='public' and tablename='order_items'");
    assert.deepEqual(indexes.rows.map((row) => row.indexname), ["order_items_store_idx"]);
  } finally {
    await db.close();
  }
});
