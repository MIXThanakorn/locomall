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
