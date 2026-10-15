import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { CATALOG_SORT_OPTIONS } from "../src/lib/catalogSort.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const migration = read("supabase/migrations/20261015054324_home_stock_price_rating_filters.sql");
const user = "00000000-0000-4000-8000-000000000001";
const id = (row) => `${row.entity_type}:${row.entity_id}`;

test("stock and sorting compose before keyset pagination; absent prices/ratings stay last", async () => {
  const db = new PGlite();
  try {
    // Geometry stand-ins test SQL semantics; live smoke test uses real PostGIS.
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth; create schema private; create schema extensions;
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('test.uid',true),'')::uuid $$;
      create domain extensions.geography as text;
      create function extensions.st_makepoint(double precision,double precision) returns text language sql as $$ select $1::text $$;
      create function extensions.st_setsrid(text,integer) returns text language sql as $$ select $1 $$;
      create function extensions.st_distance(extensions.geography,extensions.geography) returns double precision language sql as $$
        select abs($1::double precision-$2::double precision)*1000 $$;
      create table public.user_locations(user_id uuid primary key,subdistrict_code text,geography extensions.geography);
      create table public.markets(market_id bigint primary key,name text,description text,image_url text,
        geography extensions.geography,approval_status text,subdistrict_code text,rating_average numeric,rating_count integer);
      create table public.stores(store_id bigint primary key,market_id bigint,name text,description text,image_url text,
        product_name text,approval_status text,unit_price numeric,rating_average numeric,rating_count integer);
      create table public.seller_listings(store_id bigint,stock_quantity integer,reserved_quantity integer,status text);
      grant usage on schema public,private,auth,extensions to anon,authenticated;
      insert into public.user_locations values('${user}','A','0');
      insert into public.markets values
        (1,'Origin','','','0','approved','A',4,3),
        (2,'Near other area','','','9.999','approved','B',5,1),
        (3,'Far','','','50','approved','A',0,0),
        (4,'Unknown distance','','',null,'approved','A',0,0),
        (5,'Pending','','','0','pending','A',5,1),
        (6,'No price','','','0','approved','A',0,0),
        (7,'Ties','','','9.999','approved','A',4,5),
        (8,'Boundary','','','10','approved','A',5,2),
        (9,'Rounded outside','','','10.001','approved','A',0,0);
      insert into public.stores values
        (1,1,'Stocked','','','Banana','approved',100,5,1),
        (2,2,'Fully reserved','','','Banana','approved',20,4,1),
        (3,1,'Suspended','','','Banana','suspended',1,5,1),
        (4,5,'Pending parent','','','Banana','approved',1,5,1),
        (5,1,'Paused stock','','','Banana','approved',50,0,0),
        (6,7,'Tied','','','Banana','approved',100,5,1),
        (7,2,'Free','','','Banana','approved',0,3,1),
        (8,3,'Far store','','','Banana','approved',50,4,1),
        (9,4,'Unknown distance','','','Banana','approved',200,5,1),
        (10,8,'Boundary','','','Banana','approved',100,5,1),
        (11,9,'Rounded outside','','','Banana','approved',100,5,1);
      insert into public.seller_listings values
        (1,10,3,'active'),(1,50,0,'paused'),(2,5,5,'active'),(3,100,0,'active'),
        (4,100,0,'active'),(5,20,0,'paused'),(6,1,0,'active'),(7,1,0,'active'),
        (8,3,0,'active'),(9,5,0,'active'),(10,2,0,'active'),(11,2,0,'active');
      insert into public.stores select n,7,'Paged '||n,'','','Banana','approved',100,5,1 from generate_series(20,50) n;
      insert into public.seller_listings select n,2,0,'active' from generate_series(20,50) n;
    `);
    await db.exec(read("supabase/migrations/20261003021710_show_all_catalog_and_chat_partner.sql").split("-- Profiles are private")[0]);
    await db.exec(migration);
    await db.exec("set role anon");
    const get = async (args = "") => (await db.query(`select * from public.discover_filtered_catalog_page(p_limit=>100${args ? ","+args : ""})`)).rows;
    const all = await get("p_lat=>0,p_lng=>0");
    const old = (await db.query("select * from public.discover_catalog_page(p_lat=>0,p_lng=>0,p_limit=>100)")).rows;
    assert.deepEqual(all.map(id), old.map(id), "distance default matches installed client behavior");
    assert.equal(all.find((row) => id(row) === "market:1").unit_price, "50", "suspended cheap store excluded");
    assert.equal(Number(all.find((row) => id(row) === "market:1").available_stock), 7, "only active approved available stock counts");
    const stocked = await get("p_lat=>0,p_lng=>0,p_in_stock_only=>true");
    assert.ok(stocked.length > 25);
    assert.ok(stocked.every((row) => Number(row.available_stock)>0));
    for (const missing of ["store:2","store:5","store:3","store:4","market:5","market:6"]) {
      assert.ok(!stocked.some((row) => id(row) === missing), missing);
    }
    for (const sort of CATALOG_SORT_OPTIONS.map((option) => option.value)) {
      const ordered = await get(`p_lat=>0,p_lng=>0,p_sort=>'${sort}'`);
      const expected = [...all].sort((a,b) => {
        const missing = (row) => sort.startsWith("price") ? row.unit_price == null : sort === "rating" ? row.rating_count === 0 : false;
        const value = (row) => sort === "price_asc" ? Number(row.unit_price ?? 0) : sort === "price_desc" ? -Number(row.unit_price ?? 0) : sort === "rating" && row.rating_count>0 ? -Number(row.rating_average) : 0;
        return Number(missing(a))-Number(missing(b)) || value(a)-value(b)
          || Number(a.distance_km ?? 1e9)-Number(b.distance_km ?? 1e9)
          || a.entity_type.localeCompare(b.entity_type) || Number(a.entity_id)-Number(b.entity_id);
      });
      assert.deepEqual(ordered.map(id), expected.map(id), sort);
      const pages = [];
      let cursor;
      do {
        const page = (await db.query(`select * from public.discover_filtered_catalog_page(
          p_lat=>0,p_lng=>0,p_sort=>$1,p_limit=>7,p_after_missing=>$2,p_after_value=>$3,
          p_after_distance_km=>$4,p_after_entity_type=>$5,p_after_entity_id=>$6)`,
          [sort,cursor?.cursor_missing ?? null,cursor?.cursor_value ?? null,
            cursor?.distance_km ?? null,cursor?.entity_type ?? null,cursor?.entity_id ?? null])).rows;
        pages.push(...page);
        cursor=page.length===7 ? page.at(-1) : null;
      } while(cursor);
      assert.deepEqual(pages.map(id), ordered.map(id), `${sort}: ties, missing values and unknown distances paginate without loss`);
    }
    const cheap = await get("p_sort=>'price_asc',p_kind=>'store'");
    assert.equal(cheap[0].unit_price,"0", "free is not missing");
    const high = await get("p_sort=>'price_desc'");
    assert.equal(high.at(-1).unit_price,null, "missing price stays last descending");
    const rated = await get("p_sort=>'rating'");
    assert.equal(rated.at(-1).rating_count,0);
    assert.ok((await get("p_sort=>'price_asc'")).length>0, "price works without origin");
    assert.equal((await get("p_nearby_only=>true,p_sort=>'price_asc'")).length,0, "nearby requires origin");
    const nearby = await get("p_lat=>0,p_lng=>0,p_nearby_only=>true,p_in_stock_only=>true,p_kind=>'store',p_query=>'Banana',p_sort=>'rating'");
    assert.ok(nearby.length>25);
    assert.ok(nearby.every((row) => row.entity_type==="store" && Number(row.available_stock)>0 && Number(row.distance_km)<=10));
    assert.ok(nearby.some((row) => row.market_id===8), "10km inclusive");
    assert.ok(!nearby.some((row) => row.market_id===9), "10.001 excluded before rounding");
    assert.equal((await get("p_lat=>0,p_lng=>0,p_same_area=>true")).length,0);
    await assert.rejects(db.query("select * from public.user_locations"), /permission denied/);
    await db.exec("reset role; set role authenticated");
    await db.query("select set_config('test.uid',$1,false)",[user]);
    const scoped = await get("p_same_area=>true,p_nearby_only=>true,p_in_stock_only=>true,p_sort=>'price_desc'");
    assert.ok(scoped.length>0);
    assert.ok(scoped.every((row) => [1,7,8].includes(row.market_id)), "saved area belongs to current account");
    await db.query("select set_config('test.uid','','false')");
    assert.equal((await get("p_same_area=>true,p_sort=>'rating'")).length,0);
  } finally { await db.close(); }
});

test("Home resets stock/sort, sends full cursor and watches stock invalidations", () => {
  const home = read("app/(tabs)/index.tsx");
  const hook = read("src/hooks/useCommerce.ts");
  assert.deepEqual(CATALOG_SORT_OPTIONS.map((option) => option.value),["distance","rating","price_asc","price_desc"]);
  assert.match(home,/\[inStockOnly, setInStockOnly\] = useState\(false\)/);
  assert.match(home,/useState<CatalogSort>\("distance"\)/);
  const filters=read("src/components/HomeCatalogFilters.tsx");
  assert.match(filters,/setDraft\(\{ \.\.\.DEFAULTS \}\)/);
  assert.match(filters,/รายการไม่มีราคา\/คะแนนอยู่ท้าย/);
  assert.match(filters,/<Modal visible=\{open\}/);
  assert.match(hook,/enhanced \? "discover_filtered_catalog_page"/);
  assert.match(hook,/p_after_missing: after\?\.cursor_missing, p_after_value: after\?\.cursor_value/);
  assert.match(hook,/table: "seller_listings", event: "UPDATE"/);
});
