import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("listing analysis uses system wording in the UI and user-facing errors", () => {
  for (const path of ["src/components/ListingAssistant.tsx", "src/lib/listingAi.ts", "supabase/functions/suggest-listing/index.ts"]) {
    const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /["'][^"'\r\n]*\bAI\b[^"'\r\n]*["']|>[^<\r\n]*\bAI\b[^<\r\n]*</, path);
  }
  const screen = readFileSync(new URL("../src/components/ListingAssistant.tsx", import.meta.url), "utf8");
  assert.match(screen, /ระบบช่วยวิเคราะห์ข้อมูลสินค้า/);
  assert.match(screen, /คำแนะนำจากการวิเคราะห์ของระบบ/);
  assert.match(screen, /บริการของ Google/);
  assert.match(screen, /คำแนะนำที่อาจคลาดเคลื่อน/);
});
