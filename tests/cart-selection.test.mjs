import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { parseCartSelection, selectedCartItems, toggleCartSelection } from "../src/lib/cartSelection.ts";

const items = [
  { cart_item_id: 11, store_id: 1, quantity: 2, stores: { market_id: 1, unit_price: 30 } },
  { cart_item_id: 12, store_id: 2, quantity: 1, stores: { market_id: 1, unit_price: 50 } },
  { cart_item_id: 13, store_id: 3, quantity: 3, stores: { market_id: 2, unit_price: 20 } },
  { cart_item_id: 14, store_id: 4, quantity: 1, stores: null },
];
test("cart starts empty, combines only one market, clears and switches markets", () => {
  assert.deepEqual(selectedCartItems(items, []), []);
  let ids = toggleCartSelection(items, [], 11);
  ids = toggleCartSelection(items, ids, 12);
  assert.deepEqual(ids, [11, 12]);
  assert.deepEqual(toggleCartSelection(items, ids, 13), ids);
  assert.deepEqual(toggleCartSelection(items, ids, 14), ids);
  assert.equal(selectedCartItems(items, ids).reduce((sum, item) => sum + item.quantity * item.stores.unit_price, 0), 110);
  assert.deepEqual(toggleCartSelection(items, [11], 11), []);
  assert.deepEqual(toggleCartSelection(items, [], 13), [13]);
});
test("checkout rejects cross-market, missing, duplicate, malformed and replaced item identities", () => {
  for (const value of [undefined, "", "11,11", "11,x", "-1", "0", "1.5", "9007199254740992", ["11"]]) assert.deepEqual(parseCartSelection(value), []);
  assert.deepEqual(parseCartSelection("11,12"), [11,12]);
  for (const ids of [[11,13],[11,99],[11,11],[14]]) assert.deepEqual(selectedCartItems(items, ids), []);
  assert.deepEqual(selectedCartItems(items, [11], 2), []);
  assert.deepEqual(selectedCartItems(items.filter((item) => item.cart_item_id !== 11), [11,12]), []);
  assert.equal(selectedCartItems(items.map((item) => ({ ...item, quantity: 4 })), [11])[0].quantity, 4);
});
test("UI selection reaches checkout and existing server deletes only explicitly ordered items", () => {
  const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const cart = read("app/order/cart.tsx");
  const checkout = read("app/order/checkout.tsx");
  assert.match(cart, /useState<number\[\]>\(\[\]\)/);
  assert.match(cart, /accessibilityRole="checkbox"/);
  assert.match(cart, /selectedMarketId !== null && Number\(item.stores.market_id\) !== selectedMarketId/);
  assert.match(cart, /ContextImage uri=\{item.stores.image_url\}/);
  assert.match(cart, /router.push\(`\/store\/\$\{item.store_id\}`/);
  assert.doesNotMatch(cart, /group.total|totalQuantity|checkoutMarket/);
  assert.match(checkout, /selectedCartItems<any>\(cartResult.data\?\.cart_items \?\? \[\], parseCartSelection\(itemIds\), Number\(marketId\)\)/);
  assert.match(checkout, /p_items: items/);
  assert.match(read("supabase/migrations/20261015044841_multi_market_cart_hub_inventory.sql"), /ci.store_id in \(select \(value->>'store_id'\)::bigint from jsonb_array_elements\(p_items\)\)/);
});
