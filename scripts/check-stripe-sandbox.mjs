// No customer payloads or credentials in output. The worker credential stays in memory.
import { loadEnvFile } from "node:process";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import {
  stripeApi,
  sessionParams,
} from "../supabase/functions/stripe-checkout/core.ts";
import { randomUUID } from "node:crypto";
loadEnvFile(".env.local");
const key = process.env.STRIPE_SECRET_KEY;
if (!key?.startsWith("sk_test_")) throw Error("Test key required");
const project = new URL(process.env.EXPO_PUBLIC_SUPABASE_URL).hostname.split(
  ".",
)[0];
const list = await stripeApi(key, "webhook_endpoints?limit=100");
const hook = list.data.find(
  (e) =>
    e.url ===
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/stripe-webhook` &&
    e.status === "enabled" &&
    e.livemode === false,
);
console.log(JSON.stringify({ sandboxWebhookEnabled: !!hook }));
const r = spawnSync(
  process.execPath,
  [
    resolve("node_modules/supabase/dist/supabase.js"),
    "db",
    "query",
    "--linked",
    "--project-ref",
    project,
    "select decrypted_secret as token from vault.decrypted_secrets where name='locomall_stripe_worker_token'",
  ],
  { encoding: "utf8", windowsHide: true, timeout: 30000 },
);
if (r.status !== 0) throw Error("Worker config unavailable");
const start = r.stdout.indexOf("{");
const end = r.stdout.lastIndexOf("}");
const data = JSON.parse(r.stdout.slice(start, end + 1));
const token = data.rows[0]?.token;
if (!token) throw Error("Worker config missing");
const worker = await fetch(hook.url, {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-worker-token": token },
  body: "{}",
  signal: AbortSignal.timeout(50000),
});
console.log(
  JSON.stringify({ workerStatus: worker.status, ...(await worker.json()) }),
);
const response = await fetch(
  `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/stripe-return?order=1`,
  { redirect: "manual", signal: AbortSignal.timeout(10000) },
);
console.log(
  JSON.stringify({
    nativeReturnStatus: response.status,
    nativeReturnValid:
      response.headers.get("location") === "locomall://order/1",
  }),
);
if (process.argv.includes("--provider-event")) {
  const p = {
    order_id: 0,
    buyer_id: "diagnostic-only",
    amount: 3000,
    expires_at: new Date(Date.now() + 3600000).toISOString(),
  };
  const session = await stripeApi(
    key,
    "checkout/sessions",
    sessionParams(
      p,
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/stripe-return`,
    ),
    `diagnostic-${randomUUID()}`,
  );
  await stripeApi(
    key,
    `checkout/sessions/${session.id}/expire`,
    new URLSearchParams(),
  );
  let delivered = false;
  for (let i = 0; i < 4; i++) {
    const events = await stripeApi(
      key,
      "events?type=checkout.session.expired&limit=10",
    );
    const event = events.data.find((e) => e.data?.object?.id === session.id);
    if (event?.pending_webhooks === 0) {
      delivered = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  console.log(
    JSON.stringify({
      diagnosticSessionExpired: true,
      providerEventDelivered: delivered,
    }),
  );
  if (!delivered) process.exitCode = 1;
}
