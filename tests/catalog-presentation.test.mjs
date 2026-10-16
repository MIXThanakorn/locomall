import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { catalogColumns, catalogPrice, filterMarketStores } from "../src/lib/catalogPresentation.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("catalog columns respond to container width and accessibility font size", () => {
  assert.equal(catalogColumns(272), 1);
  assert.equal(catalogColumns(339), 1);
  assert.equal(catalogColumns(340), 2);
  assert.equal(catalogColumns(700, 1.3), 1);
  assert.equal(catalogColumns(700, 1.2), 2);
});

test("catalog prices preserve sale units and distinguish market minimum prices", () => {
  assert.equal(catalogPrice(40, "ชิ้น"), "฿40 / ชิ้น");
  assert.equal(catalogPrice(80, "500 กรัม"), "฿80 / 500 กรัม");
  assert.equal(catalogPrice(40, null, true), "เริ่มต้น ฿40");
  assert.equal(catalogPrice(null), "ยังไม่มีราคา");
  assert.equal(catalogPrice(NaN), "ยังไม่มีราคา");
  assert.equal(catalogPrice(0, "ชุด"), "฿0 / ชุด");
});

test("market search combines product/shop names with ready-stock filter without mutating catalog", () => {
  const stores = [{ name: "ร้าน A", product_name: "กล้วย", available_stock: 3 }, { name: "ร้าน B", product_name: "ข้าว", available_stock: 0 }];
  assert.deepEqual(filterMarketStores(stores, " กล้วย ", false), [stores[0]]);
  assert.deepEqual(filterMarketStores(stores, "ร้าน b", false), [stores[1]]);
  assert.deepEqual(filterMarketStores(stores, "ข้าว", true), []);
  assert.deepEqual(filterMarketStores(stores, "", true), [stores[0]]);
  assert.equal(stores.length, 2);
});

test("shopping controls precede full reviews while each screen loads its reviews once", () => {
  const store = read("app/store/[id].tsx");
  const market = read("app/market/[id].tsx");
  const actions = read("src/components/CatalogActions.tsx");
  assert.equal((store.match(/<CatalogActions/g) ?? []).length, 1);
  assert.equal((market.match(/<CatalogActions/g) ?? []).length, 1);
  assert.ok(actions.indexOf("{children}") < actions.indexOf("รีวิวล่าสุด"));
  assert.ok(store.indexOf("styles.quantityBox") < store.indexOf("</CatalogActions>"));
  assert.ok(market.indexOf("visibleStores.map") < market.indexOf("</CatalogActions>"));
  assert.match(store, /paddingBottom: Math.max\(16, insets.bottom \+ 8\)/);
  assert.match(read("src/components/CommerceCard.tsx"), /ContextImage/);
  assert.match(read("src/components/CommerceCard.tsx"), /height: "auto", aspectRatio: 4 \/ 3/);
  assert.match(read("src/components/CommerceCard.tsx"), /หน่วยสั่งซื้อ/);
  assert.match(read("src/hooks/useCommerce.ts"), /const discoveryReady = deviceLocationReady \|\| !session/);
  assert.match(read("src/hooks/useCommerce.ts"), /if \(!discoveryReady \|\| !enabled\) return/);
});

test("product card RPC retains the bounded public boundary for anonymous clients", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated;
      create function public.get_catalog_card_metrics(bigint[],bigint[])
      returns table(entity_type text,entity_id bigint,min_price numeric,rating_average numeric,rating_count integer,sold_quantity bigint)
      language plpgsql as $$ begin
        if cardinality($1)>100 or cardinality($2)>100 then raise exception 'too many catalog ids'; end if;
        return query select 'store'::text,1::bigint,40::numeric,5::numeric,1,2::bigint where 1=any($2);
      end $$;
      create function public.get_store_catalog(bigint) returns jsonb language sql as $$
        select '{"product_name":"กล้วย","unit":"500 กรัม","markets":{"name":"ตลาด"}}'::jsonb where $1=1 $$;`);
    await db.exec(read("supabase/migrations/20261016041604_catalog_card_product_details.sql"));
    await db.exec("set role anon");
    const { rows } = await db.query("select * from public.get_catalog_card_details('{}',array[1]::bigint[])");
    assert.equal(rows[0].product_name, "กล้วย");
    assert.equal(rows[0].unit, "500 กรัม");
    assert.equal(rows[0].market_name, "ตลาด");
    assert.deepEqual((await db.query("select * from public.get_catalog_card_details('{}',array[99]::bigint[])")).rows, []);
    await assert.rejects(db.query("select * from public.get_catalog_card_details('{}',array_fill(1::bigint,array[101]))"), /too many catalog ids/);
  } finally { await db.close(); }
});
