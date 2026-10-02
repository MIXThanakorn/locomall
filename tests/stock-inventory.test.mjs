import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const migration = read("supabase/migrations/20261002094200_keep_stock_reserved_until_order_completion.sql");
const delivery = migration.split("create or replace function public.confirm_delivery")[1]?.split("create or replace function public.cancel_order")[0] ?? "";
const cancellation = migration.split("create or replace function public.cancel_order")[1] ?? "";

test("checkout reserves stock and the catalog reports only unreserved units", () => {
  const checkout = read("supabase/migrations/20260926025356_market_store_management_and_pickup.sql");
  assert.match(checkout, /set reserved_quantity=reserved_quantity\+take/i);
  const catalog = read("supabase/migrations/20260928080428_close_rls_security_findings.sql");
  assert.match(catalog, /stock_quantity-l\.reserved_quantity/i);
});

test("delivery consumes reserved physical stock exactly once", () => {
  assert.match(delivery, /o\.status = 'shipped'/);
  assert.match(delivery, /o\.status = 'at_hub'/);
  assert.match(delivery, /stock_quantity = l\.stock_quantity - allocation\.allocated_quantity/);
  assert.match(delivery, /reserved_quantity = l\.reserved_quantity - allocation\.allocated_quantity/);
  assert.match(delivery, /fulfilled_quantity = l\.fulfilled_quantity \+ allocation\.allocated_quantity/);
  assert.match(delivery, /v_updated_listings <> v_allocated_listings/);
});

test("cancelling an unfinished order releases only its reservation", () => {
  assert.match(cancellation, /v_status = 'delivered'/);
  assert.match(cancellation, /reserved_quantity = l\.reserved_quantity - allocation\.allocated_quantity/);
  assert.doesNotMatch(cancellation, /stock_quantity\s*=/);
});

test("seller stock screen distinguishes on-hand, reserved and available", () => {
  const screen = read("app/seller/listings/index.tsx");
  assert.match(screen, /คงเหลือทั้งหมด/);
  assert.match(screen, /จองแล้ว/);
  assert.match(screen, /stock_quantity - listing\.reserved_quantity/);
});
