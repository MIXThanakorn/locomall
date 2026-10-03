import assert from "node:assert/strict";
import test from "node:test";
import { formatChatClock, shouldShowChatTimeDivider } from "../src/lib/chatTime.ts";

test("chat shows a time divider for the first message and gaps over one hour", () => {
  const messages = [
    { created_at: "2026-10-03T08:00:00.000Z" },
    { created_at: "2026-10-03T08:59:00.000Z" },
    { created_at: "2026-10-03T09:59:00.000Z" },
    { created_at: "2026-10-03T11:00:00.000Z" },
  ];
  assert.equal(shouldShowChatTimeDivider(messages, 0), true);
  assert.equal(shouldShowChatTimeDivider(messages, 1), false);
  assert.equal(shouldShowChatTimeDivider(messages, 2), false);
  assert.equal(shouldShowChatTimeDivider(messages, 3), true);
  assert.ok(formatChatClock(messages[0].created_at).length > 0);
});
