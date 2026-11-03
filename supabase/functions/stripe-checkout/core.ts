export class PaymentError extends Error {
  code: string;
  status: number;
  constructor(code: string, status = 400) {
    super(code);
    this.code = code;
    this.status = status;
  }
}
export type Payment = {
  order_id: number;
  buyer_id: string;
  request_id: string;
  amount: number;
  currency: string;
  status: string;
  session_id: string | null;
  checkout_url: string | null;
  payment_intent: string | null;
  refund_id?: string | null;
  expires_at: string;
};
export function validatePurchase(value: unknown) {
  const v = value as Record<string, unknown>;
  const id = (n: unknown) => Number.isSafeInteger(n) && Number(n) > 0;
  if (
    !v ||
    typeof v !== "object" ||
    !id(v.marketId) ||
    !Array.isArray(v.items) ||
    !v.items.length ||
    v.items.length > 50 ||
    !["delivery", "pickup"].includes(String(v.fulfillment)) ||
    (v.fulfillment === "delivery" && !id(v.addressId))
  )
    throw new PaymentError("invalid_request");
  const seen = new Set();
  for (const item of v.items) {
    if (
      !item ||
      !id(item.store_id) ||
      !id(item.quantity) ||
      item.quantity > 10000 ||
      seen.has(item.store_id)
    )
      throw new PaymentError("invalid_request");
    seen.add(item.store_id);
  }
  for (const [key, max] of [
    ["latitude", 90],
    ["longitude", 180],
  ] as const)
    if (
      v[key] != null &&
      (typeof v[key] !== "number" ||
        !Number.isFinite(v[key]) ||
        Math.abs(v[key] as number) > max)
    )
      throw new PaymentError("invalid_request");
  return {
    marketId: v.marketId,
    addressId: v.fulfillment === "delivery" ? v.addressId : null,
    items: v.items.map((i) => ({ store_id: i.store_id, quantity: i.quantity })),
    fulfillment: v.fulfillment,
    latitude: v.latitude ?? null,
    longitude: v.longitude ?? null,
  };
}
export function testKey(key: string) {
  if (!key.startsWith("sk_test_"))
    throw new PaymentError("not_configured", 503);
}
export async function readBody(req: Request, limit = 16000) {
  if (Number(req.headers.get("content-length")) > limit)
    throw new PaymentError("payload_too_large", 413);
  const reader = req.body?.getReader();
  if (!reader) throw new PaymentError("invalid_request");
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) {
        await reader.cancel();
        throw new PaymentError("payload_too_large", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.length;
  }
  return new TextDecoder().decode(bytes);
}
export function verifySession(s: any, p: Payment) {
  if (
    !s ||
    s.object !== "checkout.session" ||
    s.livemode !== false ||
    typeof s.id !== "string" ||
    !s.id.startsWith("cs_test_") ||
    s.amount_total !== p.amount ||
    s.currency !== "thb" ||
    s.metadata?.order_id !== String(p.order_id) ||
    s.metadata?.buyer_id !== p.buyer_id ||
    (p.session_id && s.id !== p.session_id)
  )
    throw new PaymentError("verification_failed", 502);
  if (s.url && new URL(s.url).origin !== "https://checkout.stripe.com")
    throw new PaymentError("verification_failed", 502);
  const state =
    s.payment_status === "paid"
      ? "paid"
      : s.status === "expired"
        ? "expired"
        : s.status === "complete"
          ? "processing"
          : "open";
  return {
    state,
    intent: typeof s.payment_intent === "string" ? s.payment_intent : null,
  };
}
export function sessionParams(p: Payment, returnUrl: string) {
  const params = new URLSearchParams({
    mode: "payment",
    success_url: `${returnUrl}?order=${p.order_id}`,
    cancel_url: `${returnUrl}?order=${p.order_id}`,
    "payment_method_types[0]": "card",
    "payment_method_types[1]": "promptpay",
    "line_items[0][price_data][currency]": "thb",
    "line_items[0][price_data][unit_amount]": String(p.amount),
    "line_items[0][price_data][product_data][name]": `Locomall ออเดอร์ทดสอบ #${p.order_id}`,
    "line_items[0][quantity]": "1",
    "metadata[order_id]": String(p.order_id),
    "metadata[buyer_id]": p.buyer_id,
    expires_at: String(Math.floor(new Date(p.expires_at).getTime() / 1000)),
    locale: "th",
  });
  return params;
}
export async function stripeApi(
  key: string,
  path: string,
  body?: URLSearchParams,
  idempotency?: string,
) {
  testKey(key);
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${key}`,
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      ...(idempotency ? { "Idempotency-Key": idempotency } : {}),
    },
    body,
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new PaymentError("provider_unavailable", 503);
  }
  const value = await response.json();
  if (value.livemode === true)
    throw new PaymentError("live_mode_forbidden", 503);
  return value;
}
export async function verifySignature(
  raw: string,
  signature: string,
  secret: string,
  now = Date.now(),
) {
  const fields = signature.split(",").map((x) => x.split("="));
  const timestamp = fields.find((x) => x[0] === "t")?.[1];
  if (
    !timestamp ||
    !/^\d+$/.test(timestamp) ||
    Math.abs(now / 1000 - Number(timestamp)) > 300 ||
    !secret.startsWith("whsec_")
  )
    throw new PaymentError("invalid_signature", 400);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const payload = new TextEncoder().encode(`${timestamp}.${raw}`);
  for (const [, hex] of fields.filter((x) => x[0] === "v1")) {
    if (!/^[a-f0-9]{64}$/.test(hex ?? "")) continue;
    const bytes = Uint8Array.from(
      hex.match(/../g)!.map((x) => parseInt(x, 16)),
    );
    if (await crypto.subtle.verify("HMAC", key, bytes, payload)) return;
  }
  throw new PaymentError("invalid_signature", 400);
}
