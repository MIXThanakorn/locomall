import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { emailValidationError, mobilePhoneError, normalizeMobilePhone } from "../src/lib/fieldValidation.ts";
import { translateAuthError } from "../src/lib/authError.ts";

test("mobile input accepts only ten digits beginning with zero", () => {
  assert.equal(normalizeMobilePhone("08a1-234 56789"), "0812345678");
  assert.equal(mobilePhoneError("0812345678"), null);
  assert.match(mobilePhoneError("8123456789"), /ขึ้นต้นด้วยเลข 0/);
  assert.match(mobilePhoneError("081234567"), /10 หลัก/);
  assert.match(mobilePhoneError("08a2345678"), /ตัวเลขเท่านั้น/);
  assert.equal(mobilePhoneError("", false), null);
});

test("signup email validation explains the malformed part", () => {
  assert.match(emailValidationError("user.example.com"), /@/);
  assert.match(emailValidationError("user@example"), /จุด/);
  assert.match(emailValidationError("user@example.c"), /นามสกุล/);
  assert.match(emailValidationError("user@-example.com"), /โดเมน/);
  assert.equal(emailValidationError("user+sale@example.co.th"), null);
});

test("Supabase Auth signup errors show actionable Thai messages", () => {
  assert.match(translateAuthError({ code: "email_exists" }), /ถูกใช้สมัคร/);
  assert.match(translateAuthError({ code: "email_address_not_authorized" }), /ส่งอีเมล/);
  assert.match(translateAuthError({ code: "signup_disabled" }), /ปิดการสมัคร/);
});

test("all app text fields use the shared light-and-dark input colors", () => {
  const root = new URL("../", import.meta.url);
  const visit = (relative) => {
    for (const entry of readdirSync(new URL(relative, root), { withFileTypes: true })) {
      const path = join(relative, entry.name).replaceAll("\\", "/");
      if (entry.isDirectory()) visit(`${path}/`);
      else if (path.endsWith(".tsx") && path !== "src/components/AppTextInput.tsx") {
        assert.doesNotMatch(readFileSync(new URL(path, root), "utf8"), /<TextInput\b/, path);
      }
    }
  };
  visit("app/");
  visit("src/");
  assert.match(readFileSync(new URL("src/components/AppTextInput.tsx", root), "utf8"), /color: Colors\.textDark/);
});
