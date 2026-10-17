import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { getSettingsGroups } from "../src/lib/settingsMenu.ts";

const buyer = { isAdmin: false, isMarketOwner: false, isStoreManager: false, isSeller: false };
const routes = (access) => getSettingsGroups(access).flatMap((group) => group.actions).map((action) => action.route).filter(Boolean);

test("settings groups keep buyer actions and show management only for the relevant account capabilities", () => {
  const plain = routes(buyer);
  for (const route of ["/(tabs)/orders", "/order/cart", "/profile/wallet", "/profile/edit-profile", "/profile/shipping-address", "/(auth)/switch-account", "/settings/about"]) assert.ok(plain.includes(route));
  assert.ok(!plain.includes("/seller/dashboard"));
  assert.ok(!plain.includes("/market/manage/home"));
  assert.ok(!plain.includes("/admin"));
  const seller = routes({ ...buyer, isSeller: true });
  assert.ok(seller.includes("/seller/allocations"));
  assert.ok(!seller.includes("/seller/stores"));
  const manager = routes({ ...buyer, isStoreManager: true });
  assert.ok(manager.includes("/seller/stores"));
  assert.ok(!manager.includes("/seller/allocations"));
  const owner = routes({ ...buyer, isMarketOwner: true });
  assert.ok(owner.includes("/market/manage/home"));
  assert.ok(owner.includes("/market/manage/logistics"));
  assert.ok(!owner.includes("/market/create"));
  assert.ok(!owner.includes("/seller/dashboard"));
  const all = routes({ isAdmin: true, isMarketOwner: true, isStoreManager: true, isSeller: true });
  assert.ok(all.includes("/admin"));
  assert.ok(all.includes("/profile/wallet"));
  assert.equal(all.length, new Set(all).size);
});

test("settings actions point to real routes and notification permission opens device settings without a fake switch", () => {
  const groups = getSettingsGroups({ isAdmin: true, isMarketOwner: true, isStoreManager: true, isSeller: true });
  for (const route of [...routes(buyer), ...groups.flatMap((group) => group.actions).map((action) => action.route).filter(Boolean)]) {
    const path = route.split("?")[0];
    assert.ok(existsSync(new URL(`../app${path}.tsx`, import.meta.url)) || existsSync(new URL(`../app${path}/index.tsx`, import.meta.url)), route);
  }
  const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const settings = read("app/(tabs)/setting.tsx");
  assert.match(settings, /Linking.openSettings\(\)/);
  assert.match(settings, /getSettingsGroups\(permissions\)/);
  assert.match(settings, /loadGeneration.current/);
  assert.match(read("app/(tabs)/_layout.tsx"), /title: "ตั้งค่า"[\s\S]*tabIcon\("settings-outline", "settings"\)/);
  assert.equal(groups.find((group) => group.title === "แอปและความช่วยเหลือ").actions[0].command, "notification-permission");
});
