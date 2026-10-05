import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("core data publication requires RLS and never subscribes to unfilterable deletes", () => {
  const migration = read("supabase/migrations/20261005003510_realtime_core_data_views.sql");
  const hook = read("src/hooks/useRealtimeRefresh.ts");
  for (const table of ["orders", "order_allocations", "carts", "markets", "stores", "store_seller_applications", "seller_listings"]) {
    assert.match(migration, new RegExp(`'${table}'`));
  }
  assert.match(migration, /c\.relrowsecurity/);
  assert.match(hook, /"INSERT" \| "UPDATE"/);
  assert.match(hook, /removeChannel\(channel\)/);
  assert.match(hook, /AppState\.addEventListener/);
});

test("buyer, seller, cart and admin live views requery through their existing scopes", () => {
  const commerce = read("src/hooks/useCommerce.ts");
  assert.match(commerce, /\.eq\("buyer_id", userId\)/);
  assert.match(commerce, /\.eq\("seller_id", userId\)/);
  assert.match(commerce, /buyer_id=eq\.\$\{userId\}/);
  assert.match(commerce, /seller_id=eq\.\$\{userId\}/);
  assert.match(read("src/context/BadgeContext.tsx"), /table: "carts"/);
  assert.match(read("app/order/cart.tsx"), /useRealtimeRefresh/);
  assert.match(read("app/admin/finance.tsx"), /useRealtimeRefresh/);
  assert.match(read("app/admin/markets.tsx"), /useRealtimeRefresh/);
});
