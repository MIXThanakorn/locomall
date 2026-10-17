import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { formatChatDateTime } from "../src/lib/date.ts";

test("chat dates use two-digit Gregorian date followed by 24-hour time", () => {
  assert.equal(formatChatDateTime("2026-10-17T14:36:00"), "17/10/26 14:36");
  assert.equal(formatChatDateTime("2026-01-05T00:04:00"), "05/01/26 00:04");
  for (const value of [null, undefined, "", "bad date"]) assert.equal(formatChatDateTime(value), "ไม่ระบุวันที่");
});
test("inbox name does not grow vertically and date uses a small explicit gap", () => {
  const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const inbox = read("app/(tabs)/chat.tsx");
  assert.match(inbox, /row: \{ flexDirection: "column", alignItems: "flex-start", gap: 2 \}/);
  assert.doesNotMatch(inbox, /name: \{ flex: 1|"stack":\["row"\]/);
  for (const path of ["app/(tabs)/chat.tsx", "app/chat/[id].tsx", "src/components/ChatOrderCards.tsx"]) {
    assert.match(read(path), /formatChatDateTime/);
    assert.doesNotMatch(read(path), /formatThaiDateTime/);
  }
});
