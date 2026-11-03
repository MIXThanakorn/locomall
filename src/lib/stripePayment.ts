import { supabase } from "./supabase";
export type StripePayment = {
  orderId: number;
  status: string;
  url: string | null;
};
export async function stripePayment(
  input:
    | { action: "create"; requestId: string; purchase: unknown }
    | { action: "status"; orderId: number },
): Promise<StripePayment> {
  const { data, error } = await supabase.functions.invoke("stripe-checkout", {
    body: input,
    signal: AbortSignal.timeout(40000),
  });
  if (error)
    throw new Error(
      "ยังตรวจสอบการชำระไม่ได้ กรุณาเปิดประวัติออเดอร์ก่อนลองสั่งใหม่",
    );
  if (
    !data ||
    !Number.isSafeInteger(data.orderId) ||
    data.orderId <= 0 ||
    typeof data.status !== "string" ||
    (data.url !== null &&
      (typeof data.url !== "string" ||
        !data.url.startsWith("https://checkout.stripe.com/")))
  )
    throw new Error("ข้อมูลการชำระไม่ครบ");
  return data;
}
export const paymentLabels: Record<string, string> = {
  stripe_pending: "รอชำระผ่าน Stripe · โหมดทดสอบ",
  stripe_paid: "ชำระผ่าน Stripe แล้ว · โหมดทดสอบ",
  stripe_refund_pending: "กำลังคืนเงินทดสอบผ่าน Stripe",
  stripe_refunded: "คืนเงินทดสอบผ่าน Stripe แล้ว",
  failed: "รายการชำระถูกยกเลิกหรือหมดอายุ",
};
