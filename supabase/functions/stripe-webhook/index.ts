import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";
import {
  PaymentError,
  testKey,
  verifySignature,
  readBody,
} from "../stripe-checkout/core.ts";
import { reconcile } from "../stripe-checkout/service.ts";
Deno.serve(async (req) => {
  if (req.method !== "POST")
    return new Response("method not allowed", { status: 405 });
  try {
    const key = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
    testKey(key);
    const url = Deno.env.get("SUPABASE_URL")!;
    const secret =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}").default;
    const admin = createClient(url, secret, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (r, i) =>
          fetch(r, { ...i, signal: i?.signal ?? AbortSignal.timeout(10000) }),
      },
    });
    const raw = await readBody(req, 262144);
    const worker = req.headers.get("x-worker-token");
    if (worker && worker === Deno.env.get("STRIPE_WORKER_TOKEN")) {
      const { data, error } = await admin.rpc("stripe_due_payments");
      if (error) throw new PaymentError("database_unavailable", 503);
      const outcomes = await Promise.allSettled(
        (data ?? []).map((p: any) =>
          reconcile(admin, key, p, `${url}/functions/v1/stripe-return`),
        ),
      );
      return Response.json({
        processed: outcomes.filter((x) => x.status === "fulfilled").length,
        failed: outcomes.filter((x) => x.status === "rejected").length,
      });
    }
    await verifySignature(
      raw,
      req.headers.get("stripe-signature") ?? "",
      Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "",
    );
    const event = JSON.parse(raw);
    if (event.livemode !== false) throw new PaymentError("live_mode_forbidden");
    if (
      [
        "checkout.session.completed",
        "checkout.session.async_payment_succeeded",
        "checkout.session.async_payment_failed",
        "checkout.session.expired",
      ].includes(event.type)
    ) {
      const s = event.data?.object;
      const oid = Number(s?.metadata?.order_id);
      const uid = s?.metadata?.buyer_id;
      if (!Number.isSafeInteger(oid) || oid <= 0 || typeof uid !== "string")
        return Response.json({ received: true });
      const { data, error } = await admin.rpc("stripe_context", {
        p_user: uid,
        p_order: oid,
      });
      if (error || !data) throw new PaymentError("payment_not_found", 503);
      if (data.session_id && data.session_id !== s.id)
        throw new PaymentError("verification_failed");
      await reconcile(admin, key, data, `${url}/functions/v1/stripe-return`);
    }
    return Response.json({ received: true });
  } catch (error) {
    const e =
      error instanceof PaymentError
        ? error
        : new PaymentError("unavailable", 503);
    console.warn("stripe-webhook", e.code);
    return Response.json({ code: e.code }, { status: e.status });
  }
});
