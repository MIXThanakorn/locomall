// Read secrets locally; print only safe diagnostics. Does not send customer data.
import { loadEnvFile } from "node:process";
import { generateSuggestion } from "../supabase/functions/suggest-listing/core.ts";
loadEnvFile(process.argv[2] ?? ".env.local");
try {
  const result = await generateSuggestion({ productName: "เสื้อฟุตบอลสีเขียวขาว", description: "ยังไม่ได้ระบุขนาดและสภาพสินค้า" }, {
    apiKey: process.env.GEMINI_API_KEY ?? "", model: process.env.GEMINI_MODEL ?? "", fallbackModel: process.env.GEMINI_FALLBACK_MODEL ?? "gemini-3.8-flash",
  });
  console.log(JSON.stringify({ ok: true, model: result.model, usedFallback: result.usedFallback, schemaValid: !!result.suggestion.product_name }));
} catch (error) {
  console.error(JSON.stringify({ ok: false, code: error.code ?? "request_failed", status: error.status ?? null })); process.exitCode = 1;
}
