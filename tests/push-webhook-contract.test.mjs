import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("new notifications enqueue a server-authenticated Push request", () => {
  const migration = read("supabase/migrations/20261005005210_connect_push_notification_webhook.sql");
  const edge = read("supabase/functions/push-notification/index.ts");
  const config = read("supabase/config.toml");

  assert.match(migration, /after insert on public\.notifications/);
  assert.match(migration, /vault\.decrypted_secrets/);
  assert.match(migration, /net\.http_post/);
  assert.match(migration, /revoke execute on function private\.enqueue_push_notification\(\) from public, anon, authenticated/);
  assert.match(config, /\[functions\.push-notification\]\s*verify_jwt = false/);
  assert.match(edge, /LOCOMALL_PUSH_WEBHOOK_SECRET/);
  assert.match(edge, /x-locomall-webhook-secret/);
  assert.match(edge, /\.from\("notifications"\)/);
  assert.doesNotMatch(edge, /title: payload\.record\.title/);
});
