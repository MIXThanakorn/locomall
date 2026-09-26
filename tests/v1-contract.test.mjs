import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { passwordValidationError } from "../src/lib/password.ts";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

test("V1 hardening RPCs are authenticated and use an empty search path", () => {
  const sql = read("supabase/migrations/20260921021549_v1_release_hardening.sql");
  for (const name of ["increment_cart_item", "set_market_image", "set_store_image"]) {
    assert.match(sql, new RegExp(`function public\\.${name}\\([^]*?security definer set search_path=''`, "i"));
    assert.match(sql, new RegExp(`revoke execute on function public\\.${name}\\([^;]+ from public,anon`, "i"));
  }
});

test("Storage policies bind paths to user, market, or store ownership", () => {
  const original = read("supabase/migrations/20260921021549_v1_release_hardening.sql");
  const fix = read("supabase/migrations/20260925015236_admin_workspace_and_request_rls_fixes.sql");
  assert.match(fix, /storage\.foldername\(storage\.objects\.name\)/);
  assert.match(fix, /bucket_id = 'market-images'[\s\S]*m\.owner_id = \(select auth\.uid\(\)\)/);
  assert.match(fix, /bucket_id = 'store-images'[\s\S]*s\.manager_id = \(select auth\.uid\(\)\)/);
  assert.doesNotMatch(fix, /storage\.foldername\(m\.name\)|storage\.foldername\(s\.name\)/);
  assert.match(original, /allowed_mime_types/s);
  assert.match(original, /5242880/);
});

test("Platform Admin authorization uses server-controlled roles without email or MFA", () => {
  const sql = read("supabase/migrations/20260925015236_admin_workspace_and_request_rls_fixes.sql");
  assert.match(sql, /platform_roles/);
  assert.doesNotMatch(sql, /auth\.jwt\(\)->>'aal'|email/);
  assert.doesNotMatch(read("app/admin/security.tsx"), /auth\.mfa|reauthenticate|email/i);
  assert.match(read("app/admin/_layout.tsx"), /Tabs/);
  assert.match(read("app/index.tsx"), /isAdmin[\s\S]*Redirect href=\{"\/admin"/);
});

test("Application RPC retries are idempotent and do not duplicate pending requests", () => {
  const sql = read("supabase/migrations/20260925015236_admin_workspace_and_request_rls_fixes.sql");
  assert.match(sql, /owner_id = auth\.uid\(\) and approval_status = 'pending'/);
  assert.match(sql, /manager_id=auth\.uid\(\) and approval_status='pending'/);
  assert.match(sql, /existing_status='rejected'[\s\S]*status='pending'/);
  assert.match(read("app/market/create.tsx"), /ส่งคำขอแล้ว แต่รูปยังไม่ถูกบันทึก/);
  assert.match(read("app/seller/listings/join.tsx"), /ส่งคำขอแล้ว แต่รูปยังไม่ถูกบันทึก/);
});

test("Admin workspace provides dashboard, approvals, orders, audit, and no user tabs", () => {
  const layout = read("app/admin/_layout.tsx");
  for (const route of ["index", "markets", "orders", "audit"]) assert.match(layout, new RegExp(`name="${route}"`));
  assert.doesNotMatch(layout, /nearby|profile|notification/);
  assert.match(read("app/admin/index.tsx"), /ศูนย์ควบคุมระบบ/);
  assert.match(read("app/admin/orders.tsx"), /p_admin_override: true/);
  assert.match(read("app/admin/audit.tsx"), /admin_audit_logs/);
});

test("Production routes do not import mock data", () => {
  const roots = ["app", "src"];
  const visit = (relative) => {
    const absolute = new URL(relative, root);
    for (const entry of readdirSync(absolute, { withFileTypes: true })) {
      const child = join(relative, entry.name).replaceAll("\\", "/");
      if (entry.isDirectory()) visit(`${child}/`);
      else if (/\.[jt]sx?$/.test(entry.name) && child !== "src/mock/data.ts") {
        assert.doesNotMatch(read(child), /(?:src\/mock\/data|mock\/data)/, child);
      }
    }
  };
  roots.forEach((directory) => visit(`${directory}/`));
});

test("Deferred payment and wallet routes are absent", () => {
  const appFiles = [];
  const visit = (relative) => {
    for (const entry of readdirSync(new URL(relative, root), { withFileTypes: true })) {
      const child = join(relative, entry.name).replaceAll("\\", "/");
      if (entry.isDirectory()) visit(`${child}/`); else appFiles.push(child);
    }
  };
  visit("app/");
  assert.equal(appFiles.some((path) => /wallet|promptpay|bank-transfer/i.test(path)), false);
});

test("Password policy matches the hardened Supabase Auth configuration", () => {
  assert.match(passwordValidationError("Short1!"), /10/);
  assert.match(passwordValidationError("lowercase1!"), /พิมพ์ใหญ่/);
  assert.match(passwordValidationError("UPPERCASE1!"), /พิมพ์เล็ก/);
  assert.match(passwordValidationError("NoNumber!!"), /ตัวเลข/);
  assert.match(passwordValidationError("NoSymbol19"), /สัญลักษณ์/);
  assert.equal(passwordValidationError("StrongPass!9"), null);
});

test("V1 sign-up does not require email confirmation", () => {
  assert.match(read("supabase/config.toml"), /\[auth\.email\][\s\S]*?enable_confirmations = false/);
  const signUp = read("app/(auth)/sign-up.tsx");
  assert.doesNotMatch(signUp, /emailRedirectTo|ยืนยันอีเมล/);
  assert.match(signUp, /location-onboarding/);
});

test("Location onboarding saves the selected hierarchy before runtime GPS discovery", () => {
  const migration = read("supabase/migrations/20260921080637_runtime_location_and_policy_helpers.sql");
  assert.match(migration, /grant usage on schema private to anon, authenticated/i);
  assert.match(migration, /grant execute on function private\.is_admin\(uuid\) to anon, authenticated/i);
  assert.match(migration, /p_lat double precision default null[\s\S]*p_lng double precision default null/i);
  assert.match(migration, /st_makepoint\(p_lng,p_lat\)/i);
  const onboarding = read("app/(auth)/location-onboarding.tsx");
  assert.match(onboarding, /บันทึกพื้นที่หลัก/);
  assert.doesNotMatch(onboarding, /requestForegroundPermissionsAsync|getCurrentPositionAsync/);
  assert.match(onboarding, /p_gps_consent: false/);
});

test("Every user-facing address selector uses the shared searchable dropdown", () => {
  for (const path of ["app/(auth)/location-onboarding.tsx", "app/profile/shipping-address.tsx", "app/order/checkout.tsx"]) {
    const source = read(path);
    assert.match(source, /SearchableDropdown/, path);
    assert.doesNotMatch(source, /<ScrollView\s+horizontal/, path);
  }
  assert.match(read("src/components/SearchableDropdown.tsx"), /searchPlaceholder[\s\S]*TextInput/);
});

test("Order participant policies do not recursively query other protected order tables", () => {
  const sql = read("supabase/migrations/20260921084304_fix_order_rls_recursion.sql");
  assert.match(sql, /function private\.can_access_order\(p_order_id bigint\)[\s\S]*security definer[\s\S]*set search_path = pg_catalog/i);
  assert.match(sql, /revoke all on function private\.can_access_order\(bigint\) from public, anon/i);
  assert.match(sql, /create policy order_items_participants[\s\S]*private\.can_access_order\(order_id\)/i);
  assert.doesNotMatch(sql, /create policy order_items_participants[\s\S]*?exists\s*\(\s*select[\s\S]*?public\.orders/i);
});

test("Sign-up is Thai, confirms password, and supports showing both password fields", () => {
  const signUp = read("app/(auth)/sign-up.tsx");
  assert.match(signUp, /ยืนยันรหัสผ่าน/);
  assert.match(signUp, /password !== passwordConfirmation/);
  assert.match(signUp, /showPasswordConfirmation/);
  assert.match(signUp, /ตัวพิมพ์เล็ก ตัวพิมพ์ใหญ่ ตัวเลข และสัญลักษณ์/);
  assert.doesNotMatch(signUp, />Full name<|>Username<|>Password<|>Gender</);
});

test("Authentication forms avoid the keyboard and Android resizes its window", () => {
  for (const path of ["app/(auth)/sign-in.tsx", "app/(auth)/sign-up.tsx"]) {
    const source = read(path);
    assert.match(source, /KeyboardAvoidingView/, path);
    assert.match(source, /keyboardShouldPersistTaps="handled"/, path);
  }
  assert.match(read("app.json"), /"softwareKeyboardLayoutMode": "resize"/);
});

test("Logout clears local auth state and routes directly to sign in", () => {
  const context = read("src/context/AuthContext.tsx");
  const profile = read("app/(tabs)/profile.tsx");
  assert.match(context, /signOut\(\{ scope: "local" \}\)/);
  assert.match(context, /setSession\(null\)/);
  assert.match(profile, /await signOut\(\)/);
  assert.match(profile, /router\.replace\("\/\(auth\)\/sign-in"/);
});

test("Native alerts are presented with the Locomall themed modal", () => {
  const provider = read("src/components/AppAlertProvider.tsx");
  assert.match(read("app/_layout.tsx"), /AppAlertProvider/);
  assert.match(provider, /Alert\.alert =/);
  assert.match(provider, /Colors\.greenPrimary/);
  assert.match(provider, /Modal/);
});

test("V1 release blocker migration keeps Guest catalog public without exposing admin helpers", () => {
  const sql = read("supabase/migrations/20260925082644_fix_v1_release_blockers.sql");
  assert.match(sql, /create policy markets_public_catalog[\s\S]*to anon[\s\S]*approval_status = 'approved'/i);
  assert.match(sql, /create policy stores_public_catalog[\s\S]*to anon[\s\S]*approval_status = 'approved'/i);
  const publicMarketPolicy = sql.match(/create policy markets_public_catalog[\s\S]*?;\s*/i)?.[0] ?? "";
  const publicStorePolicy = sql.match(/create policy stores_public_catalog[\s\S]*?;\s*/i)?.[0] ?? "";
  assert.doesNotMatch(publicMarketPolicy, /private\.is_admin|private\.market_owner/);
  assert.doesNotMatch(publicStorePolicy, /private\.is_admin|private\.market_owner/);
  assert.match(read("supabase/migrations/20260925015236_admin_workspace_and_request_rls_fixes.sql"), /revoke all on function private\.is_admin\(uuid\) from public, anon/i);
});

test("Order completion and cancellation aggregate the qualified allocation quantity", () => {
  const sql = read("supabase/migrations/20260925082644_fix_v1_release_blockers.sql");
  assert.match(sql, /function public\.confirm_delivery[\s\S]*sum\(oa\.quantity\)/i);
  assert.match(sql, /function public\.cancel_order[\s\S]*sum\(oa\.quantity\)/i);
  assert.doesNotMatch(sql, /sum\(quantity\)/i);
});

test("New Market requests notify Platform Admins once", () => {
  const sql = read("supabase/migrations/20260925082644_fix_v1_release_blockers.sql");
  assert.match(sql, /insert into public\.notifications[\s\S]*from public\.platform_roles pr[\s\S]*pr\.role = 'platform_admin'/i);
  assert.match(sql, /if mid is null then[\s\S]*insert into public\.notifications/i);
});

test("Protected profile and account tabs redirect Guests to sign in", () => {
  assert.match(read("app/profile/_layout.tsx"), /if \(!session\) return <Redirect href="\/\(auth\)\/sign-in"/);
  for (const path of ["app/(tabs)/profile.tsx", "app/(tabs)/orders.tsx", "app/(tabs)/notification.tsx"]) {
    assert.match(read(path), /if\s*\(!.*session\)\s*return <Redirect href="\/\(auth\)\/sign-in"\s*\/>/, path);
  }
});

test("Runtime geolocation always times out to saved-area discovery", () => {
  const context = read("src/context/AuthContext.tsx");
  assert.match(context, /LOCATION_TIMEOUT_MS = 5000/);
  assert.match(context, /withTimeout\(Location\.requestForegroundPermissionsAsync\(\), LOCATION_TIMEOUT_MS\)/);
  assert.match(context, /withTimeout\([\s\S]*Location\.getCurrentPositionAsync/);
  assert.match(context, /setDeviceLocationReady\(true\)/);
});

test("Stock management scopes both reads and writes to the current seller", () => {
  const screen = read("app/seller/listings/index.tsx");
  const sql = read("supabase/migrations/20260926025356_market_store_management_and_pickup.sql");
  assert.match(screen, /\.eq\("seller_id", session\.user\.id\)/);
  assert.match(sql, /l\.listing_id=p_listing_id and l\.seller_id=auth\.uid\(\)/);
});

test("Store applications stay in the Market subdistrict and expose a review detail flow", () => {
  const sql = read("supabase/migrations/20260925015236_admin_workspace_and_request_rls_fixes.sql");
  assert.match(sql, /seller must be in the same subdistrict/i);
  assert.match(read("app/market/[id].tsx"), /sameArea/);
  assert.match(read("app/market/manage/index.tsx"), /market\/manage\/request/);
  assert.match(read("app/market/manage/request/[id].tsx"), /get_store_request_detail/);
});

test("A rejection reason is required and returned to applicants", () => {
  const sql = read("supabase/migrations/20260926025356_market_store_management_and_pickup.sql");
  assert.match(sql, /rejection reason required/);
  assert.match(read("app/seller/stores.tsx"), /approval_note/);
  assert.match(read("app/store/[id].tsx"), /review_note/);
});

test("Pickup is capped at 10 km and follows the short at-hub confirmation flow", () => {
  const sql = read("supabase/migrations/20260926025356_market_store_management_and_pickup.sql");
  assert.match(sql, /distance_m<=10000/);
  assert.match(sql, /pickup_km>10/);
  assert.match(sql, /fulfillment_method='pickup' and o\.status='at_hub'/);
  const order = read("app/order/[id].tsx");
  assert.match(order, /pickupSteps = \["awaiting_preparation", "preparing", "at_hub", "delivered"\]/);
  assert.match(order, /isBuyer &&/);
});

test("Market ownership adds management without removing buyer capabilities", () => {
  const profile = read("app/(tabs)/profile.tsx");
  const checkout = read("app/order/checkout.tsx");
  assert.match(profile, /จัดการตลาดชุมชน/);
  assert.match(profile, /เจ้าของตลาดชุมชน · ซื้อสินค้าได้ตามปกติ/);
  assert.doesNotMatch(checkout, /isMarketOwner.*disabled|!isMarketOwner/);
});

test("Saved shipping addresses can be loaded into the form and updated by their owner", () => {
  const screen = read("app/profile/shipping-address.tsx");
  assert.match(screen, /startEditing/);
  assert.match(screen, /\.update\(payload\)\.eq\("address_id", editingId\)\.eq\("user_id", session\.user\.id\)/);
  assert.match(screen, /แก้ไขที่อยู่แล้ว/);
  assert.match(screen, /scrollToEnd/);
});

test("Every route with a text input opts into keyboard avoidance", () => {
  const routes = [
    "app/admin/markets.tsx", "app/(auth)/new-password.tsx", "app/(auth)/recover-password.tsx",
    "app/(auth)/sign-in.tsx", "app/(auth)/sign-up.tsx", "app/chat/[id].tsx", "app/market/create.tsx",
    "app/market/manage/edit.tsx", "app/market/manage/index.tsx", "app/market/manage/logistics.tsx",
    "app/market/manage/request/[id].tsx", "app/profile/change-password.tsx", "app/profile/edit-profile.tsx",
    "app/profile/language.tsx", "app/profile/shipping-address.tsx", "app/seller/listings/index.tsx",
    "app/seller/listings/join.tsx", "app/store/[id].tsx", "app/store/manage/edit.tsx", "app/(tabs)/nearby.tsx",
  ];
  for (const path of routes) {
    assert.match(read(path), /KeyboardAware|KeyboardAvoidingView/, path);
  }
  assert.match(read("src/components/SearchableDropdown.tsx"), /KeyboardAwareView/);
  assert.match(read("app.json"), /"softwareKeyboardLayoutMode": "resize"/);
});
