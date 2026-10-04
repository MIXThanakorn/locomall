import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { GOOGLE_OAUTH_CALLBACK_PATH, parseGoogleOAuthCallback, withGoogleOAuthTimeout } from "../src/lib/googleOAuth.ts";

const redirect = "locomall://sign-in";

test("Google callback uses the app's stable sign-in path", () => {
  assert.equal(GOOGLE_OAUTH_CALLBACK_PATH, "sign-in");
  const screen = readFileSync(new URL("../app/(auth)/sign-in.tsx", import.meta.url), "utf8");
  assert.match(screen, /signInWithOAuth\(/);
  assert.match(screen, /skipBrowserRedirect: true/);
  assert.doesNotMatch(screen, /\/auth\/v1\/authorize\?/);
});

test("a stalled browser login reports a timeout instead of spinning forever", async () => {
  await assert.rejects(withGoogleOAuthTimeout(new Promise(() => {}), 1), /ไม่ส่งกลับเข้าแอป/);
});

test("Google callback accepts tokens, code, and OAuth errors without silently hanging", () => {
  assert.deepEqual(parseGoogleOAuthCallback(`${redirect}#access_token=access&refresh_token=refresh`, redirect), {
    kind: "tokens", accessToken: "access", refreshToken: "refresh",
  });
  assert.deepEqual(parseGoogleOAuthCallback(`${redirect}?code=one-time`, redirect), { kind: "code", code: "one-time" });
  assert.throws(() => parseGoogleOAuthCallback(`${redirect}#error_description=Access+denied`, redirect), /Access denied/);
  assert.throws(() => parseGoogleOAuthCallback(redirect, redirect), /ไม่ได้รับข้อมูลเข้าสู่ระบบ/);
  assert.throws(() => parseGoogleOAuthCallback("locomall://other#access_token=a&refresh_token=b", redirect), /ไม่ตรงกัน/);
});
