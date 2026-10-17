import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
test("small-screen media cards keep image and copy together instead of splitting every child", () => {
  for (const path of ["app/(tabs)/orders.tsx", "app/order/[id].tsx", "app/seller/allocations/[id].tsx", "app/seller/dashboard.tsx", "app/seller/stores.tsx", "app/market/manage/index.tsx"]) {
    assert.doesNotMatch(read(path), /"stack":\["(?:row","itemRow|card)"/);
  }
  const orders = read("app/(tabs)/orders.tsx");
  assert.match(orders, /orderHead: \{ alignItems: "flex-start", gap: 6 \}/);
  assert.match(orders, /row: \{ flexDirection: "row", flexWrap: "wrap"/);
  assert.match(orders, /<Text style=\{styles.itemTotal\}>฿\{total.toLocaleString\(\)\}<\/Text><\/View><\/View>/);
  assert.doesNotMatch(orders, /number: \{[^}]*flex: 1|maxWidth: "48%"/);
});
