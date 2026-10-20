// Read secrets locally; print only safe diagnostics. Does not send customer data.
import { loadEnvFile } from "node:process";
import { readFileSync } from "node:fs";
import { generateSuggestion } from "../supabase/functions/suggest-listing/core.ts";
loadEnvFile(process.argv[2] ?? ".env.local");
try {
  // Repository branding image only: never upload a customer's image for diagnostics.
  const imageSmoke = process.argv.includes("--image-smoke");
  const input = imageSmoke
    ? { productName: "ภาพโลโก้ตัวอย่างสำหรับทดสอบ ไม่ใช่สินค้า", description: "อย่าเดาราคาหรือสรรพคุณจากโลโก้", image: { mimeType: "image/png", base64: readFileSync(new URL("../assets/images/APP_LOGO.png", import.meta.url)).toString("base64") } }
    : { productName: "เสื้อฟุตบอลสีเขียวขาว", description: "ยังไม่ได้ระบุขนาดและสภาพสินค้า" };
  const result = await generateSuggestion(input, {
    apiKey: process.env.GEMINI_API_KEY ?? "", model: process.env.GEMINI_MODEL ?? "", fallbackModel: process.env.GEMINI_FALLBACK_MODEL ?? "gemini-3.8-flash",
  });
  console.log(JSON.stringify({ ok: true, imageSmoke, model: result.model, usedFallback: result.usedFallback, schemaValid: !!result.suggestion.product_name, missingInformationCount: result.suggestion.missing_information.length }));
} catch (error) {
  console.error(JSON.stringify({ ok: false, code: error.code ?? "request_failed", status: error.status ?? null })); process.exitCode = 1;
}
