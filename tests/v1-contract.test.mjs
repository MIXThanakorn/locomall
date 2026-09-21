import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { passwordValidationError } from "../src/lib/password.ts";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

test("V1 hardening RPCs are authenticated and use an empty search path", () => {
  const sql = read("supabase/migrations/20260921020823_v1_release_hardening.sql");
  for (const name of ["increment_cart_item", "set_market_image", "set_store_image"]) {
    assert.match(sql, new RegExp(`function public\\.${name}\\([^]*?security definer set search_path=''`, "i"));
    assert.match(sql, new RegExp(`revoke execute on function public\\.${name}\\([^;]+ from public,anon`, "i"));
  }
});

test("Storage policies bind paths to user, market, or store ownership", () => {
  const sql = read("supabase/migrations/20260921020823_v1_release_hardening.sql");
  assert.match(sql, /bucket_id='avatars'.*storage\.foldername\(name\).*auth\.uid\(\)/s);
  assert.match(sql, /bucket_id='market-images'.*m\.owner_id=.*auth\.uid\(\)/s);
  assert.match(sql, /bucket_id='store-images'.*s\.manager_id=.*auth\.uid\(\)/s);
  assert.match(sql, /allowed_mime_types/s);
  assert.match(sql, /5242880/);
});

test("Platform Admin authorization requires an AAL2 MFA session", () => {
  const sql = read("supabase/migrations/20260921022510_enforce_admin_mfa.sql");
  assert.match(sql, /auth\.jwt\(\)->>'aal'\)='aal2'/);
  assert.match(sql, /platform_roles/);
  assert.match(read("app/admin/security.tsx"), /auth\.mfa\.(?:enroll|challenge|verify)/);
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
