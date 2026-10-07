import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { formatProductUnit, formatSaleQuantity, normalizeWeightInput, parseProductUnit, PRODUCT_UNITS } from "../src/lib/productUnit.ts";

test("store unit dropdown includes count and weighted sale units", () => {
  for (const unit of ["ชิ้น", "กรัม", "กิโลกรัม", "ขวด", "แพ็ก", "ชุด", "กล่อง", "ถุง"]) {
    assert.ok(PRODUCT_UNITS.includes(unit));
  }
  assert.match(readFileSync(new URL("../src/components/ProductUnitField.tsx", import.meta.url), "utf8"), /SearchableDropdown/);
});

test("weighted units require a positive amount per sale unit and survive edit", () => {
  assert.deepEqual(formatProductUnit("กรัม", "500"), { unit: "500 กรัม", error: null });
  assert.deepEqual(formatProductUnit("กิโลกรัม", "0.5"), { unit: "0.5 กิโลกรัม", error: null });
  assert.equal(formatProductUnit("กรัม", "0").unit, null);
  assert.equal(formatProductUnit("กรัม", "1.5").unit, null);
  assert.equal(formatProductUnit("กิโลกรัม", "0.1234").unit, null);
  assert.deepEqual(parseProductUnit("500 กรัม"), { kind: "กรัม", amount: "500" });
  assert.deepEqual(parseProductUnit("0.5 กิโลกรัม"), { kind: "กิโลกรัม", amount: "0.5" });
  assert.deepEqual(parseProductUnit("กก."), { kind: "กก.", amount: "" });
  assert.equal(normalizeWeightInput("1,25kg", "กิโลกรัม"), "1.25");
  assert.equal(formatSaleQuantity(2, "500 กรัม"), "2 ชุด (ชุดละ 500 กรัม)");
  assert.equal(formatSaleQuantity(3, "ชิ้น"), "3 ชิ้น");
});

test("old stock cannot be reinterpreted by editing the approved store unit", () => {
  const edit = readFileSync(new URL("../app/store/manage/edit.tsx", import.meta.url), "utf8");
  assert.match(edit, /disabled=\{store\?\.approval_status === "approved"/);
  const migration = readFileSync(new URL("../supabase/migrations/20261007032858_protect_sale_units_and_phone_format.sql", import.meta.url), "utf8");
  assert.match(migration, /old\.approval_status in \('approved', 'suspended'\)/);
  assert.match(migration, /public\.seller_listings/);
  assert.match(migration, /public\.cart_items/);
  assert.match(migration, /public\.order_items/);
});

test("OAuth accounts must complete a valid phone before app navigation", () => {
  const context = readFileSync(new URL("../src/context/AuthContext.tsx", import.meta.url), "utf8");
  const root = readFileSync(new URL("../app/_layout.tsx", import.meta.url), "utf8");
  const screen = readFileSync(new URL("../app/(auth)/phone-onboarding.tsx", import.meta.url), "utf8");
  assert.match(context, /hasPhone/);
  assert.match(context, /mobilePhoneError\(data\?\.phone_num/);
  assert.match(root, /PhoneCompletionGuard/);
  assert.match(screen, /mobilePhoneError\(phone\)/);
  assert.match(screen, /keyboardType="phone-pad"/);
});

test("store forms submit formatted units and signup requires a mobile number", () => {
  for (const path of ["app/seller/listings/join.tsx", "app/store/manage/edit.tsx"]) {
    const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
    assert.match(source, /ProductUnitField/);
    assert.match(source, /p_unit: formattedUnit\.unit/);
  }
  const signup = readFileSync(new URL("../app/(auth)/sign-up.tsx", import.meta.url), "utf8");
  assert.match(signup, /mobilePhoneError\(phone\)/);
  assert.match(signup, /เบอร์มือถือ \*/);
  assert.match(signup, /keyboardType="phone-pad"/);
});
