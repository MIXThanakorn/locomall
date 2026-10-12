import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { mergeCatalogReviews, parseCatalogReviewPage, parseReviewRoute, reviewDateLabel } from "../src/lib/catalogReviews.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const migration = read("supabase/migrations/20261012042505_catalog_review_details_pagination.sql");
const base = read("tests/demo-v1-db.test.mjs").match(/const base = `([\s\S]*?)`;/)[1];
const buyer = "00000000-0000-4000-8000-000000000001";
const seller = "00000000-0000-4000-8000-000000000002";

test("public review pages mask identities, summarize all scores, filter and paginate tied timestamps", async () => {
  const db = new PGlite();
  try {
    await db.exec(base);
    await db.exec(`alter table public.profiles add column display_name text,add column username text,add column full_name text;
      alter table public.order_items add column product_name text;
      grant usage on schema private to anon,authenticated;`);
    await db.exec(read("supabase/migrations/20261004061208_demo_wallet_reviews_social_v1.sql"));
    await db.exec(migration);
    await db.exec(`insert into public.profiles(user_id,display_name) values('${buyer}','Buyer Private Name'),('${seller}',null);
      insert into public.markets(market_id,owner_id,name,approval_status) values(1,'${seller}','Market','approved');
      insert into public.stores(store_id,market_id,manager_id,name,product_name,approval_status,unit_price)
        values(1,1,'${seller}','Store','Current product','approved',30);
      insert into public.orders(buyer_id,market_id,total_amount,status) select '${buyer}',1,30,'delivered' from generate_series(1,8);
      insert into public.order_items(order_id,store_id,quantity,unit_price,product_name)
        select order_id,1,1,30,'Purchased product' from public.orders;
      set test.uid='${buyer}'; set test.admin='no';`);
    for (let id = 1; id <= 8; id++) {
      await db.query("select public.save_purchase_review($1,$1,$2,$3)", [id, id <= 4 ? 5 : id - 4, id === 1 ? "" : `Review ${id}`]);
    }
    await db.exec(`update public.purchase_reviews set created_at='2026-10-12 04:00:00.123456+00';
      update public.purchase_reviews set hidden_at=now() where order_id=8;
      insert into public.orders(buyer_id,market_id,total_amount,status) values
        ('${buyer}',1,30,'awaiting_preparation'),('${buyer}',1,30,'delivered');
      insert into public.order_items(order_id,store_id,quantity,unit_price,product_name) values
        (9,1,1,30,'Not delivered'),(10,1,1,30,'Wrong buyer');
      insert into public.purchase_reviews(buyer_id,order_id,order_item_id,store_id,stars,body) values
        ('${buyer}',9,9,1,5,'not verified'),('${seller}',10,10,1,5,'wrong owner');
      set test.uid=''; set role anon;`);
    const fetch = async (stars = null, limit = 3, cursor = null, target = "store") => parseCatalogReviewPage(
      (await db.query("select public.get_catalog_review_page($1,1,$2,$3,$4::timestamptz,$5::bigint) data",
        [target, stars, limit, cursor?.created_at ?? null, cursor?.review_id ?? null])).rows[0].data);
    const first = await fetch();
    assert.equal(first.total, 7);
    assert.equal(first.average, 3.71);
    assert.deepEqual(first.counts, { 1: 1, 2: 1, 3: 1, 4: 0, 5: 4 });
    assert.equal(first.items.length, 3);
    assert.ok(first.next_cursor.created_at.includes("123456"));
    assert.deepEqual(first.items.map((r) => r.review_id), [7, 6, 5]);
    for (const item of first.items) {
      assert.equal(item.reviewer_name, "B***");
      assert.equal(item.product_name, "Purchased product");
      assert.equal(item.verified_purchase, true);
      assert.deepEqual(Object.keys(item).sort(), ["review_id", "stars", "body", "created_at", "reviewer_name", "verified_purchase", "product_name"].sort());
    }
    const second = await fetch(null, 3, first.next_cursor);
    const third = await fetch(null, 3, second.next_cursor);
    assert.equal(third.next_cursor, null);
    assert.deepEqual([...first.items, ...second.items, ...third.items].map((r) => r.review_id), [7, 6, 5, 4, 3, 2, 1]);
    const five = await fetch(5);
    assert.equal(five.filtered_count, 4);
    assert.ok(five.items.every((r) => r.stars === 5));
    assert.equal((await fetch(5, 3, five.next_cursor)).items.length, 1);
    assert.equal((await fetch(4)).items.length, 0);
    assert.equal((await fetch(null, 3, null, "market")).total, 0);
    await assert.rejects(db.query("select * from public.purchase_reviews"), /permission denied/);
    await assert.rejects(db.query("select public.get_catalog_review_page('store',1,6)"), /invalid review page/);
    await assert.rejects(db.query("select public.get_catalog_review_page('store',1,null,21)"), /invalid review page/);
    await assert.rejects(db.query("select public.get_catalog_review_page('store',1,null,3,now(),null)"), /invalid review page/);
    await db.exec(`reset role; update public.stores set approval_status='suspended' where store_id=1; set role anon;`);
    assert.equal((await fetch()).available, false);
    assert.equal((await fetch()).total, 0);
    await db.exec(`reset role; update public.stores set approval_status='approved' where store_id=1;
      update public.markets set approval_status='suspended' where market_id=1; set role authenticated;`);
    assert.equal((await fetch()).available, false);
    await db.exec(`reset role; update public.markets set approval_status='approved' where market_id=1;
      set test.uid='${buyer}'; select public.save_purchase_review(1,null,5,'Market review');
      set test.uid='${seller}'; set role authenticated;`);
    assert.equal((await fetch(null, 3, null, "market")).items[0].product_name, null);
    assert.equal((await fetch()).total, 7);
    // The deliberately invalid legacy fixture belongs to this seller; public DTO
    // still excludes it and never uses a client-provided verified flag.
    assert.equal((await db.query("select count(*)::int n from public.purchase_reviews")).rows[0].n, 1);
    await db.exec("reset role");
    const privileges = (await db.query(`select p.prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname='get_catalog_review_page'`)).rows[0];
    assert.equal(privileges.prosecdef, false);
  } finally { await db.close(); }
});

test("review DTO validates malformed values, preserves cursor precision and deduplicates appended pages", () => {
  assert.equal(parseReviewRoute("store", "3")?.targetId, 3);
  for (const id of ["", "0", "-1", "1.5", "9007199254740993", ["1"]]) assert.equal(parseReviewRoute("store", id), null);
  assert.equal(parseReviewRoute("user", "1"), null);
  assert.throws(() => parseCatalogReviewPage([]));
  const minimal = { available: true, target_name: "Store", average: 0, total: 0, filtered_count: 0,
    counts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, items: [], next_cursor: null };
  assert.equal(parseCatalogReviewPage(minimal).total, 0);
  assert.throws(() => parseCatalogReviewPage({ ...minimal, average: 6 }));
  assert.throws(() => parseCatalogReviewPage({ ...minimal, total: 0.5 }));
  assert.deepEqual(mergeCatalogReviews([{ review_id: 1 }], [{ review_id: 1 }, { review_id: 2 }]).map((r) => r.review_id), [1, 2]);
  assert.ok(reviewDateLabel("2026-10-12T01:00:00Z").includes("12"));
  assert.equal(reviewDateLabel("bad date"), "");
  const preview = read("src/components/CatalogActions.tsx");
  assert.match(preview, /useCatalogReviews\(targetType, targetId, null, 3\)/);
  assert.match(preview, /\/catalog\/reviews/);
  assert.doesNotMatch(preview, /select\("rating_average,rating_count"\)/);
  assert.match(read("app/catalog/reviews.tsx"), /CatalogReviewFilters/);
  assert.match(read("src/hooks/useCatalogReviews.ts"), /generation.current !== version/);
});
