// Install sandbox-only integration secrets without printing or committing them.
import { loadEnvFile } from "node:process";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
loadEnvFile(".env.local");
const project = new URL(process.env.EXPO_PUBLIC_SUPABASE_URL).hostname.split(
  ".",
)[0];
if (
  !/^[a-z]{20}$/.test(project) ||
  !process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")
)
  throw Error("Test key and valid project required");
const endpoint = `https://${project}.supabase.co/functions/v1/stripe-webhook`;
const request = async (path, body) => {
  const r = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body,
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw Error(`Stripe setup failed HTTP ${r.status}`);
  return r.json();
};
const list = await request("webhook_endpoints?limit=100");
let webhook = list.data.find(
  (e) => e.url === endpoint && e.status === "enabled" && e.livemode === false,
);
let signingSecret = process.env.STRIPE_WEBHOOK_SECRET;
if (webhook && !signingSecret)
  throw Error(
    "Webhook already exists; supply its signing secret locally instead of creating a duplicate",
  );
if (!webhook) {
  webhook = await request(
    "webhook_endpoints",
    new URLSearchParams({
      url: endpoint,
      description: "Locomall sandbox checkout only",
      "enabled_events[0]": "checkout.session.completed",
      "enabled_events[1]": "checkout.session.async_payment_succeeded",
      "enabled_events[2]": "checkout.session.async_payment_failed",
      "enabled_events[3]": "checkout.session.expired",
    }),
  );
  if (webhook.livemode !== false) throw Error("Sandbox required");
  signingSecret = webhook.secret;
}
const token = randomBytes(32).toString("hex");
const cli = resolve("node_modules/supabase/dist/supabase.js");
const run = (args) => {
  const p = spawnSync(process.execPath, [cli, ...args], {
    encoding: "utf8",
    windowsHide: true,
    timeout: 90000,
  });
  if (p.status !== 0)
    throw Error(
      `Supabase setup failed (${args[0]} ${args[1]}); output withheld`,
    );
};
run([
  "secrets",
  "set",
  "--project-ref",
  project,
  `STRIPE_SECRET_KEY=${process.env.STRIPE_SECRET_KEY}`,
  `STRIPE_WEBHOOK_SECRET=${signingSecret}`,
  `STRIPE_WORKER_TOKEN=${token}`,
]);
// Random token and validated project only; no user-provided SQL interpolation.
run([
  "db",
  "query",
  "--linked",
  "--project-ref",
  project,
  `begin;
 select vault.create_secret('${endpoint}','locomall_stripe_worker_url') where not exists(select 1 from vault.secrets where name='locomall_stripe_worker_url');
 select vault.create_secret('${token}','locomall_stripe_worker_token') where not exists(select 1 from vault.secrets where name='locomall_stripe_worker_token');
 select vault.update_secret(id,'${token}') from vault.secrets where name='locomall_stripe_worker_token';
 select cron.schedule('locomall-stripe-sandbox-reconcile','* * * * *','select private.wake_stripe_worker()');commit;`,
]);
console.log(
  JSON.stringify({
    sandbox: true,
    webhookConfigured: true,
    secretNames: [
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "STRIPE_WORKER_TOKEN",
    ],
    workerScheduled: true,
  }),
);
