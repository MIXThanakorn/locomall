import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
test("order refreshes review state on focus and existing reviews open in edit mode", () => {
  const detail = read("app/order/[id].tsx");
  const form = read("app/order/review.tsx");
  assert.match(detail, /useFocusEffect\(useCallback/);
  assert.match(detail, /แก้ไขการรีวิวตลาดชุมชน/);
  assert.match(detail, /order_item_id === item.order_item_id/);
  assert.match(detail, /disabled=\{reviewError/);
  assert.match(form, /setEditing\(Boolean\(existing.data\)\)/);
  assert.match(form, /setStars\(existing.data.stars\); setBody\(existing.data.body\)/);
  assert.match(form, /บันทึกการแก้ไขรีวิว/);
  assert.match(form, /submitting.current \|\| initialLoading \|\| loadError \|\| hidden/);
  assert.match(form, /eq\("buyer_id", session.user.id\)/);
});
test("database enforces one market review per order and one shop review per purchased item", () => {
  const sql = read("supabase/migrations/20261004061208_demo_wallet_reviews_social_v1.sql");
  assert.match(sql, /create unique index purchase_reviews_market_once/);
  assert.match(sql, /create unique index purchase_reviews_store_item_once/);
  assert.match(sql, /on conflict \(order_id\) where market_id is not null do update/);
  assert.match(sql, /on conflict \(order_item_id\) where store_id is not null do update/);
  assert.match(sql, /buyer_id=auth.uid\(\) and status='delivered'/);
});
