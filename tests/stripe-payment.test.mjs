import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import {
  validatePurchase,
  verifySession,
  testKey,
  verifySignature,
  sessionParams,
  readBody,
} from "../supabase/functions/stripe-checkout/core.ts";
import { reconcile } from "../supabase/functions/stripe-checkout/service.ts";
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const buyer = "00000000-0000-4000-8000-000000000001",
  seller = "00000000-0000-4000-8000-000000000002";

test("payment request size is bounded and APK return never confirms payment from a redirect", async () => {
  await assert.rejects(readBody(new Request("https://app.test", {method:"POST",body:"x".repeat(100)}),20));
  assert.equal(await readBody(new Request("https://app.test", {method:"POST",body:"{}"})),"{}");
  const panel=read("src/components/StripePaymentPanel.tsx");
  assert.match(panel,/AppState/);assert.match(panel,/openBrowserAsync/);assert.match(panel,/15000/);
  assert.match(read("supabase/functions/stripe-return/index.ts"),/status: 302/);
  assert.match(read("supabase/functions/stripe-return/index.ts"),/locomall:\/\/order/);
  const endpoint=read("supabase/functions/stripe-checkout/index.ts");
  assert.match(endpoint,/provider_pending_after_order_created/);
  assert.match(read(".easignore"),/\.env\.\*/);
});
test("Stripe rejects live keys, tampered totals, cross-order metadata and arbitrary redirect URLs", () => {
  assert.throws(() => testKey("sk_live_fake"));
  testKey("sk_test_fake");
  const p = { order_id: 1, buyer_id: buyer, amount: 3000 };
  const s = {
    object: "checkout.session",
    id: "cs_test_demo",
    livemode: false,
    amount_total: 3000,
    currency: "thb",
    metadata: { order_id: "1", buyer_id: buyer },
    status: "complete",
    payment_status: "paid",
    payment_intent: "pi_test",
  };
  assert.equal(verifySession(s, p).state, "paid");
  for (const value of [
    { ...s, livemode: true },
    { ...s, amount_total: 1 },
    { ...s, currency: "usd" },
    { ...s, metadata: { order_id: "2", buyer_id: buyer } },
    { ...s, url: "https://evil.test" },
  ])
    assert.throws(() => verifySession(value, p));
  const purchase = {
    marketId: 1,
    addressId: 1,
    fulfillment: "delivery",
    items: [{ store_id: 1, quantity: 1 }],
  };
  assert.equal(validatePurchase(purchase).items.length, 1);
  for (const x of [
    null,
    {},
    { ...purchase, items: [{ store_id: 1, quantity: -1 }] },
    { ...purchase, items: [...purchase.items, ...purchase.items] },
    { ...purchase, latitude: NaN },
  ])
    assert.throws(() => validatePurchase(x));
  assert.equal(
    sessionParams(
      { ...p, expires_at: new Date(Date.now() + 3600000).toISOString() },
      "https://app.test/return",
    ).get("line_items[0][price_data][unit_amount]"),
    "3000",
  );
});
test("Stripe webhook verifies exact raw body, multiple signatures, timestamp and rejects forgery", async () => {
  const raw = '{"id":"evt_demo"}',
    now = Date.now(),
    t = Math.floor(now / 1000),
    secret = "whsec_test";
  const hex = createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex");
  await verifySignature(
    raw,
    `t=${t},v1=${"0".repeat(64)},v1=${hex}`,
    secret,
    now,
  );
  await assert.rejects(
    verifySignature(raw + " ", `t=${t},v1=${hex}`, secret, now),
  );
  await assert.rejects(
    verifySignature(raw, `t=${t},v1=${hex}`, secret, now + 301000),
  );
  await assert.rejects(verifySignature(raw, "", "", now));
});
test("reconciliation releases failed async payments and polls an existing pending refund instead of recreating it", async () => {
  const original = globalThis.fetch;
  const p = {
    order_id: 1,
    buyer_id: buyer,
    request_id: "test",
    amount: 3000,
    currency: "thb",
    session_id: "cs_test_demo",
    status: "processing",
  };
  const session = {
    object: "checkout.session",
    id: p.session_id,
    livemode: false,
    amount_total: p.amount,
    currency: "thb",
    metadata: { order_id: "1", buyer_id: buyer },
    status: "complete",
    payment_status: "unpaid",
    payment_intent: "pi_demo",
  };
  const syncs = [];
  try {
    globalThis.fetch = async (url) =>
      new Response(
        JSON.stringify(
          String(url).includes("payment_intents/")
            ? {
                id: "pi_demo",
                livemode: false,
                amount: 3000,
                currency: "thb",
                status: "canceled",
              }
            : session,
        ),
      );
    await reconcile(
      {
        rpc: async (_name, args) => {
          syncs.push(args);
          return { data: { ...p, status: args.p_state } };
        },
      },
      "sk_test_fake",
      p,
      "https://app.test",
    );
    assert.equal(syncs[0].p_state, "expired");
    const calls = [];
    globalThis.fetch = async (url, options) => {
      calls.push([url, options.method]);
      return new Response(
        JSON.stringify(
          String(url).includes("refunds/")
            ? {
                id: "re_demo",
                livemode: false,
                payment_intent: "pi_demo",
                amount: 3000,
                currency: "thb",
                status: "succeeded",
              }
            : { ...session, payment_status: "paid" },
        ),
      );
    };
    const refund = { ...p, status: "refund_pending", refund_id: "re_demo" };
    const result = await reconcile(
      {
        rpc: async (_name, args) => ({
          data: {
            ...refund,
            status: args.p_state === "refunded" ? "refunded" : "refund_pending",
          },
        }),
      },
      "sk_test_fake",
      refund,
      "https://app.test",
    );
    assert.equal(result.status, "refunded");
    assert.ok(
      calls.some(
        ([url, method]) =>
          String(url).endsWith("/refunds/re_demo") && method === "GET",
      ),
    );
    assert.ok(calls.every(([, method]) => method === "GET"));
  } finally {
    globalThis.fetch = original;
  }
});
test("Stripe SQL scopes private payment data, reserves once, blocks unpaid work, fulfils once and refunds cancellation", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      read("tests/demo-v1-db.test.mjs").match(/const base = `([\s\S]*?)`;/)[1],
    );
    await db.exec(`create role service_role bypassrls;grant usage on schema public,private,auth to authenticated,anon,service_role;
   create or replace function auth.uid() returns uuid language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),nullif(current_setting('test.uid',true),''))::uuid$$;
   alter table orders add column payment_method text not null default 'cod' constraint orders_payment_method_check check(payment_method in ('cod','demo_wallet')),add column updated_at timestamptz default now();
   alter table order_allocations add column status text default 'awaiting_preparation';
   create function private.notify_new_order_allocation() returns trigger language plpgsql as $$begin insert into notifications(user_id,type,entity_id) select new.seller_id,'order_new',i.order_id from order_items i where i.order_item_id=new.order_item_id;return new;end$$;
   create trigger notify_new after insert on order_allocations for each row execute function private.notify_new_order_allocation();
   create function private.get_my_seller_allocations(bigint) returns jsonb language sql as $$select '[]'::jsonb from orders o,order_allocations a where true and a.seller_id=(select auth.uid())$$;
   create function private.cancel_order(p_order_id bigint,p_reason text,p_admin_override boolean) returns void language plpgsql as $$begin
    update public.seller_listings l set reserved_quantity=reserved_quantity-a.quantity from public.order_allocations a,public.order_items i where a.listing_id=l.listing_id and a.order_item_id=i.order_item_id and i.order_id=p_order_id;
    update public.orders set status='cancelled',payment_status='failed' where order_id=p_order_id;end$$;
   insert into profiles values('${buyer}'),('${seller}');insert into markets values(1,'${seller}','Market','','','approved');
   insert into stores values(1,1,'${seller}','Store','','','Product','approved',30);
   insert into seller_listings values(1,1,'${seller}',100,0,'active');`);
    await db.exec(
      read("supabase/migrations/20261103025858_stripe_sandbox_checkout.sql"),
    );
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      await assert.rejects(
        db.query("select * from private.stripe_payments"),
        /permission denied/,
      );
      await assert.rejects(
        db.query(`select public.stripe_due_payments()`),
        /permission denied/,
      );
      await db.exec("reset role");
    }
    const payload = {
      marketId: 1,
      addressId: 1,
      items: [{ store_id: 1, quantity: 2 }],
      fulfillment: "delivery",
      latitude: null,
      longitude: null,
    };
    const begin = async (request) =>
      (
        await db.query("select public.begin_stripe_order($1,$2,$3) p", [
          buyer,
          request,
          payload,
        ])
      ).rows[0].p;
    const request = "10000000-0000-4000-8000-000000000001";
    const p = await begin(request);
    assert.equal((await begin(request)).order_id, p.order_id);
    assert.equal(p.amount, 6000);
    assert.equal(
      (await db.query("select reserved_quantity from seller_listings")).rows[0]
        .reserved_quantity,
      2,
    );
    assert.equal(
      (await db.query("select count(*)::int n from notifications")).rows[0].n,
      0,
    );
    await assert.rejects(
      db.query("update order_allocations set status='preparing'"),
      /payment must succeed/,
    );
    await assert.rejects(
      db.query("select public.stripe_context($1,$2)", [seller, p.order_id]),
      /not found/,
    );
    const sync = (state, amount = 6000, refund = null) =>
      db.query("select public.sync_stripe_payment($1,$2,$3,$4,$5,$6,$7,$8) p", [
        p.order_id,
        "cs_test_demo",
        "https://checkout.stripe.com/test",
        amount,
        "thb",
        state,
        "pi_demo",
        refund,
      ]);
    await assert.rejects(sync("paid", 1), /mismatch/);
    await sync("open");
    await sync("paid");
    await sync("paid");
    assert.equal(
      (await db.query("select count(*)::int n from notifications")).rows[0].n,
      1,
    );
    await db.query("update order_allocations set status='preparing'");
    await db.query("select private.cancel_order($1,null,false)", [p.order_id]);
    await sync("paid");
    assert.equal(
      (await db.query("select payment_status from orders")).rows[0]
        .payment_status,
      "stripe_refund_pending",
    );
    await sync("refunded", 6000, "re_demo");
    await sync("paid");
    assert.equal(
      (await db.query("select payment_status from orders")).rows[0]
        .payment_status,
      "stripe_refunded",
    );
    assert.equal(
      (await db.query("select reserved_quantity from seller_listings")).rows[0]
        .reserved_quantity,
      0,
    );
    const p2 = await begin("10000000-0000-4000-8000-000000000002");
    await db.query(
      "select public.sync_stripe_payment($1,$2,null,$3,$4,$5,null,null)",
      [p2.order_id, "cs_test_expire", 6000, "thb", "expired"],
    );
    assert.equal(
      (await db.query("select reserved_quantity from seller_listings")).rows[0]
        .reserved_quantity,
      0,
    );
  } finally {
    await db.close();
  }
});
