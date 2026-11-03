import {
  PaymentError,
  stripeApi,
  verifySession,
  sessionParams,
  type Payment,
} from "./core.ts";
export async function reconcile(
  admin: any,
  key: string,
  p: Payment,
  returnUrl: string,
) {
  let s = p.session_id
    ? await stripeApi(
        key,
        `checkout/sessions/${encodeURIComponent(p.session_id)}`,
      )
    : await stripeApi(
        key,
        "checkout/sessions",
        sessionParams(p, returnUrl),
        `locomall-checkout-${p.buyer_id}-${p.request_id}`,
      );
  let { state, intent } = verifySession(s, p);
  if (state === "processing" && intent) {
    const pi = await stripeApi(
      key,
      `payment_intents/${encodeURIComponent(intent)}`,
    );
    if (
      pi.id !== intent ||
      pi.livemode !== false ||
      pi.amount !== p.amount ||
      pi.currency !== "thb"
    )
      throw new PaymentError("verification_failed", 502);
    if (["canceled", "requires_payment_method"].includes(pi.status))
      state = "expired";
  }
  if (p.status === "cancelled" && state === "open") {
    s = await stripeApi(
      key,
      `checkout/sessions/${s.id}/expire`,
      new URLSearchParams(),
      `locomall-expire-${p.order_id}`,
    );
    ({ state, intent } = verifySession(s, p));
  }
  const sync = async (next: string, refund: string | null = null) => {
    const { data, error } = await admin.rpc("sync_stripe_payment", {
      p_order: p.order_id,
      p_session: s.id,
      p_url: s.url ?? null,
      p_amount: s.amount_total,
      p_currency: s.currency,
      p_state: next,
      p_intent: intent,
      p_refund: refund,
    });
    if (error) throw new PaymentError("database_unavailable", 503);
    return data as Payment;
  };
  p = await sync(state);
  if (p.status === "refund_pending" && intent) {
    const refund = p.refund_id
      ? await stripeApi(key, `refunds/${encodeURIComponent(p.refund_id)}`)
      : await stripeApi(
          key,
          "refunds",
          new URLSearchParams({ payment_intent: intent }),
          `locomall-refund-${p.order_id}`,
        );
    if (
      refund.payment_intent !== intent ||
      refund.amount !== p.amount ||
      refund.currency !== "thb"
    )
      throw new PaymentError("verification_failed", 502);
    p = await sync(
      refund.status === "succeeded" ? "refunded" : "paid",
      refund.id,
    );
  }
  return p;
}
