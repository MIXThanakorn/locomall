import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";
import { AiError, generateSuggestion, MAX_IMAGE_BYTES, readLimitedJson, validateImage, validateInput } from "./core.ts";
import { authorizedStoreImage, ownedStoreImagePath } from "./access.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const messages: Record<string, string> = {
  auth_required: "กรุณาเข้าสู่ระบบใหม่ก่อนใช้บริการวิเคราะห์ข้อมูล", forbidden: "คุณไม่มีสิทธิ์วิเคราะห์ข้อมูลของร้านหรือตลาดนี้",
  invalid_input: "กรุณาใส่ชื่อหรือรายละเอียดสินค้าไม่เกินกำหนด", invalid_image: "ใช้ภาพ JPG, PNG หรือ WebP ขนาดไม่เกิน 4 MB",
  payload_too_large: "รูปภาพมีขนาดใหญ่เกินไป กรุณาใช้รูปขนาดเล็กลง", no_content: "กรุณาเพิ่มรูปหรือรายละเอียดสินค้าก่อนวิเคราะห์ข้อมูล",
  not_configured: "ยังไม่ได้ตั้งค่าบริการวิเคราะห์ข้อมูล กรุณาแจ้งผู้ดูแล", rate_limited: "ใช้บริการวิเคราะห์ข้อมูลครบจำนวนที่กำหนดแล้ว กรุณารอแล้วลองใหม่",
  provider_quota: "บริการวิเคราะห์ข้อมูลมีการใช้งานถึงขีดจำกัดชั่วคราว กรุณาลองใหม่ภายหลัง", provider_auth: "บริการวิเคราะห์ข้อมูลมีปัญหาการตั้งค่า กรุณาแจ้งผู้ดูแล",
  provider_busy: "ระบบวิเคราะห์ข้อมูลไม่พร้อมให้บริการชั่วคราว กรุณาลองใหม่ภายหลัง คุณยังกรอกข้อมูลเองได้",
  provider_request: "ระบบวิเคราะห์ข้อมูลไม่รองรับคำขอนี้ กรุณาแจ้งผู้ดูแล", invalid_response: "ผลการวิเคราะห์ข้อมูลไม่ครบ กรุณาลองใหม่หรือกรอกเอง",
  blocked_content: "ระบบไม่สามารถวิเคราะห์เนื้อหานี้ได้ กรุณาตรวจสอบรูปและรายละเอียด", internal_error: "วิเคราะห์ข้อมูลไม่สำเร็จ กรุณาลองใหม่ภายหลัง",
  request_cancelled: "ยกเลิกหรือใช้เวลาวิเคราะห์นานเกินไป คุณยังกรอกข้อมูลเองได้",
};
function reply(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, ...headers, "content-type": "application/json", "Cache-Control": "no-store" } });
}
function serviceKey() {
  const keys = Deno.env.get("SUPABASE_SECRET_KEYS");
  return keys ? JSON.parse(keys).default : Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return reply({ code: "method_not_allowed" }, 405);
  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) throw new AiError("auth_required", 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, serviceKey()!, { auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (resource, init) => fetch(resource, { ...init, signal: init?.signal ?? AbortSignal.timeout(8000) }) } });
    const { data: { user }, error: authError } = await admin.auth.getUser(authorization.slice(7));
    if (authError || !user) throw new AiError("auth_required", 401);
    const input = validateInput(await readLimitedJson(req));
    const existingImage = await authorizedStoreImage(admin, input, user.id);
    const apiKey = Deno.env.get("GEMINI_API_KEY"); const model = Deno.env.get("GEMINI_MODEL");
    if (Deno.env.get("AI_PROVIDER") !== "gemini" || !apiKey || !model) throw new AiError("not_configured", 503);
    if (!input.image && !existingImage && !input.productName && !input.description) throw new AiError("no_content", 400);
    const { data: quota, error: quotaError } = await admin.rpc("reserve_listing_ai_request", { p_user_id: user.id });
    if (quotaError || !quota) throw quotaError ?? new Error("quota unavailable");
    if (!quota.allowed) return reply({ code: "rate_limited", message: messages.rate_limited, retryAfterSeconds: quota.retry_after_seconds }, 429, { "Retry-After": String(quota.retry_after_seconds) });
    // Existing image comes from the owned store, never from a client URL. Restrict host/bucket/folder.
    if (!input.image && existingImage) {
      const objectPath = ownedStoreImagePath(existingImage, url, input.storeId!);
      const { data: blob, error } = await admin.storage.from("store-images").download(objectPath);
      if (error || !blob || blob.size > MAX_IMAGE_BYTES) throw new AiError("invalid_image", 400);
      const bytes = new Uint8Array(await blob.arrayBuffer()); let binary = "";
      for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      input.image = validateImage({ mimeType: blob.type.split(";")[0], base64: btoa(binary) });
    }
    const result = await generateSuggestion(input, { apiKey, model, fallbackModel: Deno.env.get("GEMINI_FALLBACK_MODEL") ?? "gemini-3.8-flash" }, {
      signal: AbortSignal.any([req.signal, AbortSignal.timeout(35000)]),
      onAttempt: (diagnostic) => console.info("suggest-listing-upstream", JSON.stringify(diagnostic)),
    });
    return reply({ ...result, requiresReview: true });
  } catch (error) {
    const safe = error instanceof AiError ? error : new AiError("internal_error", 500);
    // Intentionally no raw provider response, key, image, prompt, or user text in logs.
    console.warn("suggest-listing", safe.code);
    return reply({ code: safe.code, message: messages[safe.code] ?? messages.internal_error }, safe.status);
  }
});
