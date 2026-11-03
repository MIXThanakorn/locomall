import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";
import { PaymentError, testKey, validatePurchase, readBody } from "./core.ts";
import { reconcile } from "./service.ts";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization,apikey,content-type,x-client-info",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};
const reply = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      ...cors,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST")
    return reply({ message: "method not allowed" }, 405);
  try {
    const key = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
    testKey(key);
    if (!Deno.env.get("STRIPE_WEBHOOK_SECRET"))
      throw new PaymentError("not_configured", 503);
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
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer "))
      throw new PaymentError("auth_required", 401);
    const {
      data: { user },
      error,
    } = await admin.auth.getUser(auth.slice(7));
    if (error || !user) throw new PaymentError("auth_required", 401);
    const raw = await readBody(req);
    const input = JSON.parse(raw);
    let payment;
    if (input.action === "create") {
      if (
        typeof input.requestId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          input.requestId,
        )
      )
        throw new PaymentError("invalid_request");
      const result = await admin.rpc("begin_stripe_order", {
        p_user: user.id,
        p_request: input.requestId,
        p_payload: validatePurchase(input.purchase),
      });
      if (result.error) throw new PaymentError("order_rejected", 409);
      payment = result.data;
    } else if (
      input.action === "status" &&
      Number.isSafeInteger(input.orderId) &&
      input.orderId > 0
    ) {
      const result = await admin.rpc("stripe_context", {
        p_user: user.id,
        p_order: input.orderId,
      });
      if (result.error || !result.data)
        throw new PaymentError("not_found", 404);
      payment = result.data;
    } else throw new PaymentError("invalid_request");
    if (!["refunded", "expired"].includes(payment.status)) {
      try {
        payment = await reconcile(
          admin,
          key,
          payment,
          `${url}/functions/v1/stripe-return`,
        );
      } catch (error) {
        if (input.action !== "create") throw error;
        // The reservation already committed. Return its order ID even when Stripe
        // is unavailable, so the app opens that order instead of a second checkout.
        console.warn("stripe-checkout", "provider_pending_after_order_created");
        return reply({
          orderId: payment.order_id,
          status: payment.status,
          url: null,
        });
      }
    }
    return reply({
      orderId: payment.order_id,
      status: payment.status,
      url: ["creating", "open"].includes(payment.status)
        ? payment.checkout_url
        : null,
    });
  } catch (error) {
    const e =
      error instanceof PaymentError
        ? error
        : new PaymentError("unavailable", 503);
    console.warn("stripe-checkout", e.code);
    return reply(
      {
        code: e.code,
        message:
          e.code === "auth_required"
            ? "กรุณาเข้าสู่ระบบใหม่"
            : e.code === "order_rejected"
              ? "สร้างรายการชำระไม่สำเร็จ กรุณาตรวจสต็อก ที่อยู่ และออเดอร์ค้าง"
              : "ยังตรวจสอบการชำระไม่ได้ กรุณาลองใหม่หรือเปิดประวัติคำสั่งซื้อก่อนสั่งซ้ำ",
      },
      e.status,
    );
  }
});
