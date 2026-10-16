import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("buyer-only accounts do not get a seller tab from old allocations", () => {
  const screen = read("app/(tabs)/orders.tsx");
  const capabilities = read("src/hooks/useCapabilities.ts");
  assert.match(screen, /canSell = capabilities\.canViewSellerOrders/);
  assert.doesNotMatch(screen, /canSell =[^;]*seller\.allocations\.length/);
  assert.match(capabilities, /eq\("approval_status", "approved"\)/);
  assert.match(capabilities, /eq\("stores\.approval_status", "approved"\)/);
  assert.match(capabilities, /approvedStores\.data\?\.length \|\| approvedStoreListings\.data\?\.length/);
});

test("buyer and seller data are scoped to the currently signed-in account", () => {
  const commerce = read("src/hooks/useCommerce.ts");
  const capabilities = read("src/hooks/useCapabilities.ts");
  assert.match(commerce, /useAccountPage\(fetchBuyerOrders/);
  assert.match(commerce, /useAccountPage\(fetchSellerAllocations/);
  const paging = read("src/hooks/useAccountPage.ts");
  assert.match(paging, /state\.userId === userId/);
  assert.match(paging, /rows: scoped \? state\.rows : \[\]/);
  assert.match(paging, /version !== generation\.current/);
  assert.match(capabilities, /result\.userId === userId \? result\.capabilities : empty/);
  assert.match(capabilities, /useFocusEffect/);
});
