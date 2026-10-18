import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { ADMIN_SECTIONS, ADMIN_ORDER_FILTERS, adminPageRange, approvalQueueKind, escapeAdminSearch } from "../src/lib/adminWorkspace.ts";
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("admin menus cover every tool with unique destinations and validated queue links", () => {
  assert.equal(new Set(ADMIN_SECTIONS.map((item) => item.route)).size, 7);
  for (const kind of ["market", "store", "seller"]) assert.equal(approvalQueueKind(kind), kind);
  for (const kind of [undefined, ["seller"], "all", "../orders"]) assert.equal(approvalQueueKind(kind), "market");
  assert.deepEqual(adminPageRange(0), [0,19]); assert.deepEqual(adminPageRange(3), [60,79]);
  for (const value of [-1, NaN, Infinity, 1.5, 100001]) assert.deepEqual(adminPageRange(value), [0,19]);
  assert.equal(escapeAdminSearch("  LM_10%\\  "), "LM\\_10\\%\\\\");
  assert.equal(escapeAdminSearch("x".repeat(500)).length, 120);
  assert.ok(ADMIN_ORDER_FILTERS.some((item) => item.value === "delivered"));
  assert.ok(ADMIN_ORDER_FILTERS.some((item) => item.value === "cancelled"));
});
test("admin pages preserve gates, expose navigation, bound queries and distinguish failures", () => {
  for (const name of ["markets", "orders", "stores", "reviews", "finance", "audit"]) {
    const source = read(`app/admin/${name}.tsx`);
    assert.match(source, /<AdminGate>/); assert.match(source, new RegExp(`<AdminSectionNav active="${name}"`));
  }
  for (const name of ["markets", "orders", "reviews"]) {
    const source = read(`app/admin/${name}.tsx`);
    assert.match(source, /adminPageRange\(page\)/); assert.match(source, /<AdminPager/);
    assert.match(source, /if \(request !== generation.current\) return/);
    assert.match(source, /loadError/); assert.match(source, /submitting.current/);
  }
  assert.match(read("app/admin/orders.tsx"), /p_admin_override: true/);
  assert.match(read("app/admin/orders.tsx"), /const reason = reasons\[order.order_id\]\?\.trim\(\)/);
  assert.doesNotMatch(read("app/admin/orders.tsx"), /คืนจำนวนสินค้าให้ผู้ขายเพียงครั้งเดียว/);
  assert.match(read("app/admin/markets.tsx"), /if \(!approve && !note\)/);
  assert.match(read("app/admin/markets.tsx"), /kind === "seller" \? item.evidence_url : item.image_url/);
  assert.match(read("app/admin/index.tsx"), /card.value \?\? "—"/);
  assert.match(read("app/admin/index.tsx"), /kind: "seller"/);
});
test("Home retains the original logo tagline on small screens", () => {
  const source = read("app/(tabs)/index.tsx");
  assert.match(source, /ของดีจากชุมชน\{"\\n"\}ใกล้คุณก่อนเสมอ/);
  assert.doesNotMatch(source, /!layout.stack \? <Text style=\{styles.tagline\}/);
  assert.match(source, /flexBasis: 144/);
});
