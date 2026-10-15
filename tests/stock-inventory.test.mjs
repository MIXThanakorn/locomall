import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const migration = read("supabase/migrations/20261015044841_multi_market_cart_hub_inventory.sql");
const delivery = migration.split("create or replace function private.confirm_delivery")[1]?.split("create or replace function public.confirm_delivery")[0] ?? "";
const cancellation = migration.split("create or replace function private.cancel_order")[1]?.split("create or replace function public.cancel_order")[0] ?? "";

test("checkout reserves stock and the catalog reports only unreserved units", () => {
  const checkout = read("supabase/migrations/20260926025356_market_store_management_and_pickup.sql");
  assert.match(checkout, /set reserved_quantity=reserved_quantity\+take/i);
  const catalog = read("supabase/migrations/20260928080428_close_rls_security_findings.sql");
  assert.match(catalog, /stock_quantity-l\.reserved_quantity/i);
});

test("hub consumes stock once and receipt only records fulfilled sales", () => {
  assert.match(migration, /stock_quantity=stock_quantity-a\.quantity,reserved_quantity=reserved_quantity-a\.quantity/);
  assert.match(delivery, /parent\.status='shipped'/);
  assert.match(delivery, /parent\.status='at_hub'/);
  assert.match(delivery, /fulfilled_quantity=fulfilled_quantity\+sale\.q/);
  assert.doesNotMatch(delivery, /set stock_quantity|set reserved_quantity/);
  assert.match(delivery, /stock_deducted_at is null/);
});

test("cancelling an unfinished order releases only its reservation", () => {
  assert.match(cancellation, /parent\.status='delivered'/);
  assert.match(cancellation, /reserved_quantity=reserved_quantity-sale\.q/);
  assert.match(cancellation, /stock_deducted_at is null/);
  assert.doesNotMatch(cancellation, /stock_quantity\s*=/);
});

test("seller stock screen distinguishes on-hand, reserved and available", () => {
  const screen = read("app/seller/listings/index.tsx");
  assert.match(screen, /คงเหลือทั้งหมด/);
  assert.match(screen, /จองแล้ว/);
  assert.match(screen, /stock_quantity - listing\.reserved_quantity/);
});
