import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(new URL("../supabase/migrations/20261005023340_clarify_notification_copy_and_chat_header.sql", import.meta.url), "utf8");
const chatScreen = readFileSync(new URL("../app/chat/[id].tsx", import.meta.url), "utf8");

test("chat notification names the product and sender", () => {
  assert.match(migration, /s\.product_name/);
  assert.match(migration, /v_sender_name \|\| ': '/);
  assert.match(migration, /'chat_message', 'chat'/);
});

test("order and approval notifications use the requested titles", () => {
  assert.match(migration, /'ออเดอร์ใหม่'/);
  assert.match(migration, /'สถานะของออเดอร์ #'/);
  assert.match(migration, /'ข้อความจากระบบ'/);
  assert.match(migration, /'คำขอเปิด' \|\| v_kind/);
  assert.match(migration, /select distinct a\.seller_id/);
});

test("chat header shows only the participant and product", () => {
  assert.doesNotMatch(chatScreen, /แชตกับ|แชทกับ/);
  assert.match(chatScreen, /header\?\.partner_name/);
  assert.match(chatScreen, /header\.product_name/);
  assert.doesNotMatch(chatScreen, /header\.market_name|header\.store_name/);
});
