import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const migration = read("supabase/migrations/20261015051617_home_nearby_catalog_filter.sql");
const user = "00000000-0000-4000-8000-000000000001";

test("nearby filters raw 10km boundary before pagination and composes category, search and own area", async () => {
  const db = new PGlite();
  try {
    // Numeric distance stand-ins isolate SQL filtering/pagination from PostGIS.
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
      create table public.markets(market_id bigint primary key,name text,description text,image_url text,geography extensions.geography,approval_status text,subdistrict_code text);
      create table public.stores(store_id bigint primary key,market_id bigint,name text,description text,image_url text,product_name text,approval_status text);
      create table public.seller_listings(store_id bigint,stock_quantity integer,reserved_quantity integer,status text);
      grant usage on schema public,private,auth,extensions to anon,authenticated;
      insert into public.user_locations values('${user}','A','0');
      insert into public.markets values
        (1,'At origin','','','0','approved','A'),
        (2,'Just inside','','','9.999','approved','A'),
        (3,'Exact boundary','','','10','approved','B'),
        (4,'Rounded outside','','','10.001','approved','A'),
        (5,'Distant','','','50','approved','A'),
        (6,'Pending','','','0','pending','A'),
        (7,'No geography','','',null,'approved','A');
      insert into public.stores values
        (1,1,'Near store','','','Banana','approved'),
        (2,3,'Boundary store','','','Banana','approved'),
        (3,4,'Outside store','','','Banana','approved'),
        (4,1,'Suspended','','','Banana','suspended'),
        (5,6,'Pending parent','','','Banana','approved');
      insert into public.seller_listings values(1,12,3,'active'),(1,50,0,'paused');
      -- More than one page, with tied distances and mixed categories.
      insert into public.stores select n,2,'Paged store '||n,'','','Banana','approved'
        from generate_series(10,40) n;
    `);
    await db.exec(read("supabase/migrations/20261003021710_show_all_catalog_and_chat_partner.sql").split("-- Profiles are private")[0]);
    await db.exec(migration);
    await db.exec("set role anon");
    const get = async (args = "") => (await db.query(`select * from public.discover_nearby_catalog_page(${args})`)).rows;
    assert.equal((await get()).length, 0, "no origin must not guess nearby results");
    assert.equal((await get("p_lat=>0,p_lng=>0,p_same_area=>true")).length, 0, "guest cannot use another user's saved area");
    const guest = await get("p_lat=>0,p_lng=>0,p_limit=>100");
    assert.equal(guest.length, 36);
    assert.ok(guest.every((row) => row.market_id <= 3 && Number(row.distance_km) <= 10));
    assert.ok(guest.some((row) => row.market_id === 3), "exact 10km included");
    assert.ok(!guest.some((row) => row.market_id === 4), "10.001km excluded even though displayed as 10.00");
    assert.equal(Number(guest.find((row) => row.entity_type === "store" && row.entity_id === 1).available_stock), 9);
    assert.deepEqual((await get("p_lat=>0,p_lng=>0,p_kind=>'market'")).map((row) => row.entity_id), [1,2,3]);
    assert.ok((await get("p_lat=>0,p_lng=>0,p_kind=>'store',p_query=>'Banana'")).every((row) => row.entity_type === "store"));
    assert.equal((await get("p_lat=>0,p_lng=>0,p_query=>'does-not-exist'")).length, 0);
    await assert.rejects(db.query("select * from public.user_locations"), /permission denied/);
    await db.exec("reset role; set role authenticated");
    await db.query("select set_config('test.uid',$1,false)", [user]);
    const ownArea = await get("p_same_area=>true,p_limit=>100");
    assert.equal(ownArea.length, 34);
    assert.ok(ownArea.every((row) => row.market_id <= 2));
    const pages = [];
    let cursor;
    do {
      const page = (await db.query(`select * from public.discover_nearby_catalog_page(p_limit=>7,
        p_after_distance_km=>$1,p_after_entity_type=>$2,p_after_entity_id=>$3)`,
        cursor ? [cursor.distance_km,cursor.entity_type,cursor.entity_id] : [null,null,null])).rows;
      pages.push(...page);
      cursor = page.length === 7 ? page.at(-1) : null;
    } while (cursor);
    assert.equal(pages.length, 36);
    assert.equal(new Set(pages.map((row) => `${row.entity_type}:${row.entity_id}`)).size, 36);
    const defaultRows = (await db.query("select * from public.discover_catalog_page(p_limit=>100)")).rows;
    assert.ok(defaultRows.some((row) => row.market_id === 5), "default still includes distant results");
    assert.ok(defaultRows.some((row) => row.distance_km === null), "default still works without market geography");
    const override = await get("p_lat=>0,p_lng=>50,p_limit=>100");
    assert.deepEqual(override.map((row) => row.market_id), [5], "device coordinates override saved origin");
    await db.query("select set_config('test.uid','','false')");
    assert.equal((await get()).length, 0, "missing auth cannot read the saved origin");
  } finally { await db.close(); }
});

test("Home defaults to all and scopes requests by every active filter", () => {
  const home = read("app/(tabs)/index.tsx");
  const hook = read("src/hooks/useCommerce.ts");
  assert.match(home, /useState<"all" \| "market" \| "store">\("all"\)/);
  assert.match(home, /\[nearbyOnly, setNearbyOnly\] = useState\(false\)/);
  assert.match(home, /useNearby\(normalizedQuery, kind, \{ sameArea, nearbyOnly, inStockOnly, sort, enabled: preferencesReady \}\)/);
  const filters = read("src/components/HomeCatalogFilters.tsx");
  assert.match(filters, /ล้างตัวกรองหน้าแรก/);
  assert.match(filters, /accessibilityState=\{\{ checked: draft.nearbyOnly \}\}/);
  assert.match(hook, /JSON.stringify\(\[userId, query, kind, sameArea, nearbyOnly, inStockOnly, sort, deviceLocation\]\)/);
  assert.match(hook, /nearbyOnly \? "discover_nearby_catalog_page"/);
  assert.match(migration, /st_distance\(c.geography,o.geography\) <= 10000/);
  assert.doesNotMatch(migration, /p_user_id|p_subdistrict_code/);
});
