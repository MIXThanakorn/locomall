import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { responsiveMetrics, SCREEN_MAX_WIDTH } from "../src/lib/responsiveLayout.ts";
import { bottomTabSpacing } from "../src/lib/bottomTabSpacing.ts";
import { parseJoinCatalog, sellerJoinAction } from "../src/lib/sellerJoin.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
test("responsive layout uses logical container width, supports landscape and does not stretch forms across tablets", () => {
  for (const width of [280, 320, 360, 375]) assert.equal(responsiveMetrics(width, 844).stack, true);
  for (const width of [390, 430, 768, 1024, 1366]) {
    assert.equal(responsiveMetrics(width, 844).width, Math.min(width, SCREEN_MAX_WIDTH));
    assert.equal(responsiveMetrics(width, 844, 1.5).stack, true);
    assert.equal(responsiveMetrics(width, 844, 2).stack, true);
  }
  assert.equal(responsiveMetrics(960, 360).short, true);
  assert.equal(responsiveMetrics(NaN, 844, NaN).width, 320);
  assert.equal(responsiveMetrics(390, 844).touchSize, 44);
});

test("selected bottom tabs have a background plus filled icon; scaled labels fit above system navigation", () => {
  assert.match(read("src/components/ScreenHeader.tsx"), /header: \{ alignSelf: "stretch"/);
  const tabs = read("app/(tabs)/_layout.tsx");
  assert.match(tabs, /tabBarActiveBackgroundColor/);
  assert.match(tabs, /focused && styles.iconActive/);
  assert.match(tabs, /name=\{focused \? filled : outline\}/);
  assert.match(tabs, /numberOfLines=\{2\}/);
  assert.match(tabs, /tabBarLabelPosition: "below-icon"/);
  for (const scale of [1, 1.3, 1.5, 2]) {
    const space = bottomTabSpacing(24, scale);
    assert.ok(space.height - space.paddingBottom - space.paddingTop >= 32 + 4 + 28 * scale);
  }
});

test("every styled destination uses the shared adaptive styles and the root includes nested routes", () => {
  const walk = (dir) => readdirSync(new URL(`../${dir}`, import.meta.url), { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]);
  for (const path of walk("app").filter(path => path.endsWith(".tsx") && !path.endsWith("_layout.tsx"))) {
    const source = read(path.replaceAll("\\", "/"));
    if (!source.includes("StyleSheet.create") || !/<Text|<AppTextInput|<Button|<ScreenHeader/.test(source)) continue;
    assert.match(source, /useResponsiveStyles/, path);
  }
  assert.match(read("app/_layout.tsx"), /<ResponsiveFrame><Stack/);
  const frame = read("src/components/ResponsiveFrame.tsx");
  assert.match(frame, /maxWidth: SCREEN_MAX_WIDTH/);
  assert.match(frame, /onLayout/);
  assert.doesNotMatch(read("src/components/AppTextInput.tsx"), /allowFontScaling=\{false\}/);
});

test("footers reserve measured height, primary tab headers and auth forms remain scrollable", () => {
  for (const path of ["app/order/cart.tsx", "app/order/checkout.tsx", "app/store/[id].tsx"]) {
    const source = read(path);
    assert.match(source, /onLayout=\{bottomAction.onLayout\}/, path);
    assert.match(source, /paddingBottom: bottomAction.contentBottom/, path);
    assert.match(source, /paddingBottom: bottomAction.paddingBottom/, path);
  }
  for (const [path, header] of [["index", "hero"], ["chat", "header"], ["orders", "head"], ["notification", "head"], ["setting", "hero"]]) {
    const source = read(`app/(tabs)/${path}.tsx`);
    assert.ok(source.indexOf("<ScrollView") < source.indexOf(`<View style={[styles.${header}`), path);
  }
  for (const path of ["sign-in", "sign-up", "recover-password", "new-password"]) {
    const source = read(`app/(auth)/${path}.tsx`);
    assert.ok(source.indexOf("<KeyboardAwareScrollView") < source.indexOf("<HeaderGradient"), path);
  }
  const dropdown = read("src/components/SearchableDropdown.tsx");
  assert.match(dropdown, /maxWidth: 640/);
  assert.match(dropdown, /insets.bottom \+ 12/);
  assert.match(read("src/components/AppAlertProvider.tsx"), /<ScrollView/);
});

test("co-seller call to action is visible only to eligible local accounts, including retries/status", () => {
  const local = { signedIn: true, sameArea: true, isManager: false, isSeller: false };
  assert.equal(sellerJoinAction(local), "ขอร่วมขายสินค้านี้");
  assert.equal(sellerJoinAction({ ...local, status: "pending" }), "ดูคำขอร่วมขาย");
  assert.equal(sellerJoinAction({ ...local, status: "rejected" }), "ส่งคำขอร่วมขายใหม่");
  for (const status of [undefined, "pending", "rejected", "approved"]) {
    for (const blocked of [{ signedIn: false }, { sameArea: false }, { isManager: true }, { isSeller: true }]) assert.equal(sellerJoinAction({ ...local, status, ...blocked }), null);
  }
  assert.equal(sellerJoinAction({ ...local, status: "unexpected" }), null);
  const payload = { store_id: 5, name: "Shop", product_name: "Product", same_area: "true", is_manager: null, is_seller: false };
  assert.equal(parseJoinCatalog(payload, 5).same_area, false);
  assert.equal(parseJoinCatalog(payload, 6), null);
});

test("seller form is separate, account-scoped, requires evidence and retains server validation", () => {
  const store = read("app/store/[id].tsx");
  const form = read("app/seller/listings/apply.tsx");
  assert.match(store, /sellerJoinAction/);
  assert.match(store, /pathname: "\/seller\/listings\/apply"/);
  assert.doesNotMatch(store, /sellerImagePicker|apply_to_sell_in_store|มีสินค้าชนิดเดียวกัน|คุณจะร่วมขายได้เมื่อ/);
  assert.doesNotMatch(read("app/market/[id].tsx"), /เปิดร้านได้เมื่อพื้นที่หลัก/);
  assert.doesNotMatch(read("app/(tabs)/setting.tsx"), /ซื้อสินค้าได้ตามปกติ/);
  assert.match(form, /key=\{`\$\{session.user.id\}:\$\{storeId\}`\}/);
  assert.match(form, /\.eq\("applicant_id", userId\)/);
  assert.match(form, /disabled=\{!image \|\| sending\}/);
  assert.match(form, /submitting.current/);
  assert.match(form, /cleanupSafe = false/);
  assert.match(form, /rpc\("apply_to_sell_in_store"/);
  assert.match(read("supabase/migrations/20260928080428_close_rls_security_findings.sql"), /seller must be in the same subdistrict/);
});
