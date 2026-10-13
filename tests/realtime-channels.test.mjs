import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { RealtimeClient } from "@supabase/realtime-js";
import { realtimeChannelName } from "../src/lib/realtimeChannelName.ts";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const filter = { event: "INSERT", schema: "public", table: "chat_messages", filter: "room_id=eq.14" };

test("reopening the same room has an independent channel even before old cleanup completes", () => {
  // Installed SDK, with only transport state stubbed: no keys or network involved.
  const client = new RealtimeClient("wss://example.invalid/socket", { params: { apikey: "test-only" } });
  const legacy = client.channel("chat-14");
  legacy.channelAdapter.isJoining = () => true;
  assert.equal(client.channel("chat-14"), legacy);
  assert.throws(() => client.channel("chat-14").on("postgres_changes", filter, () => {}), /cannot add.*after.*subscribe/);

  const first = client.channel(realtimeChannelName("chat-14"));
  first.on("postgres_changes", filter, () => {});
  first.channelAdapter.isJoining = () => true;
  const second = client.channel(realtimeChannelName("chat-14"));
  assert.notEqual(first, second);
  assert.doesNotThrow(() => second.on("postgres_changes", filter, () => {}));
  assert.equal(first.bindings.postgres_changes.length, 1);
  assert.equal(second.bindings.postgres_changes.length, 1);
  // Removing one screen does not remove the other screen's subscription.
  client._remove(first);
  assert.ok(client.getChannels().includes(second));
  assert.ok(!client.getChannels().includes(first));
});

test("all realtime consumers allocate unique effect-owned names, and chat subscriptions follow screen focus", () => {
  for (const path of ["src/hooks/useRealtimeRefresh.ts", "src/hooks/useCommerce.ts", "src/context/BadgeContext.tsx", "app/(tabs)/chat.tsx"]) {
    assert.match(read(path), /supabase.channel\(realtimeChannelName\(/, path);
    assert.match(read(path), /removeChannel\(channel\)/, path);
  }
  const chat = read("app/chat/[id].tsx");
  assert.doesNotMatch(chat, /supabase.channel\(/);
  assert.match(chat, /useRealtimeRefresh\(`chat-messages-\$\{contextKey\}`/);
  assert.match(chat, /filter: `room_id=eq.\$\{roomId\}`/);
  assert.match(chat, /useFocusEffect/);
  assert.match(read("src/hooks/useRealtimeRefresh.ts"), /if \(!active\) return/);
  assert.equal(new Set(Array.from({ length: 100 }, () => realtimeChannelName("same-room"))).size, 100);
});
