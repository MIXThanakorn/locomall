import assert from "node:assert/strict";
import test from "node:test";
import { AiError, generateSuggestion, MAX_IMAGE_BYTES, normalizeModel, readLimitedJson, validateImage, validateInput, validateSuggestion } from "../supabase/functions/suggest-listing/core.ts";

const suggestion = { product_name: "เสื้อฟุตบอลสีเขียวขาว", description: "เสื้อฟุตบอลโทนสีเขียวขาว", keywords: ["เสื้อฟุตบอล"], missing_information: ["ขนาดเสื้อ"] };
const input = { marketId: 1, productName: "เสื้อฟุตบอล", description: "สีเขียวขาว" };
const ok = () => new Response(JSON.stringify({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(suggestion) }] } }] }));
const config = { apiKey: "test-secret", model: "models/gemini-3.8-flash", fallbackModel: "gemini-3.5-flash-lite" };

test("AI input is bounded and only one store/market context may be submitted", () => {
  assert.deepEqual(validateInput(input), input);
  for (const value of [null, [], { ...input, storeId: 2 }, { ...input, marketId: -1 }, { ...input, marketId: "1" }, { productName: "a" }, { ...input, productName: "a".repeat(121) }, { ...input, description: "a".repeat(1501) }]) assert.throws(() => validateInput(value), AiError);
  assert.equal(normalizeModel("models/gemini-3.8-flash"), "gemini-3.8-flash");
  assert.throws(() => normalizeModel("../../../other"), AiError);
});
test("AI image validates actual bytes and mime without accepting arbitrary URLs", () => {
  const png = { mimeType: "image/png", base64: Buffer.from("\x89PNG\r\n\x1a\n", "latin1").toString("base64") };
  assert.deepEqual(validateImage(png), png);
  for (const image of [{ ...png, mimeType: "image/jpeg" }, { mimeType: "image/svg+xml", base64: "AAAA" }, { ...png, base64: "https://evil.test/image" }, { ...png, base64: "A".repeat(Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 4) }]) assert.throws(() => validateImage(image), AiError);
});
test("AI body cap works without Content-Length", async () => {
  await assert.rejects(readLimitedJson(new Response(JSON.stringify({ text: "a".repeat(100) })), 32), (e) => e.code === "payload_too_large");
  await assert.rejects(readLimitedJson(new Response("not-json")), AiError);
  assert.deepEqual(await readLimitedJson(new Response("{}")), {});
});
test("AI output validates schema instead of trusting valid JSON", () => {
  assert.deepEqual(validateSuggestion(suggestion), suggestion);
  for (const output of [null, {}, { ...suggestion, price: 500 }, { ...suggestion, keywords: Array(9).fill("x") }, { ...suggestion, missing_information: ["a".repeat(151)] }, { ...suggestion, product_name: "" }]) assert.throws(() => validateSuggestion(output), (e) => e.code === "invalid_response");
});
test("503 retries the primary once and uses the configured fallback, not a client model", async () => {
  const calls = []; const sleeps = [];
  const response = await generateSuggestion(input, config, { sleep: async (ms) => { sleeps.push(ms); }, fetch: async (url, options) => {
    calls.push(url); const body = JSON.parse(options.body);
    assert.equal(options.headers["x-goog-api-key"], "test-secret"); assert.equal(body.generationConfig.maxOutputTokens, 3072);
    assert.equal(body.tools, undefined); assert.equal(body.contents[0].parts.length, 1);
    return calls.length < 3 ? new Response("high demand", { status: 503 }) : ok();
  } });
  assert.equal(calls.length, 3); assert.ok(calls[0].includes("gemini-3.8-flash")); assert.ok(calls[2].includes("gemini-3.5-flash-lite"));
  assert.equal(sleeps.length, 2); assert.equal(response.usedFallback, true); assert.deepEqual(response.suggestion, suggestion);
});
test("persistent 503 has a hard attempt limit and never exposes upstream errors", async () => {
  let count = 0;
  await assert.rejects(generateSuggestion(input, config, { sleep: async () => {}, fetch: async () => { count++; return new Response("test-secret", { status: 503 }); } }), (e) => e.code === "provider_busy" && !e.message.includes("test-secret"));
  assert.equal(count, 3);
});
test("429, credential errors, invalid request and safety do not retry or burn fallback quota", async () => {
  for (const [status, code] of [[429,"provider_quota"],[403,"provider_auth"],[400,"provider_request"]]) {
    let count = 0;
    await assert.rejects(generateSuggestion(input, config, { fetch: async () => { count++; return new Response("private error", { status }); } }), (e) => e.code === code);
    assert.equal(count, 1);
  }
  await assert.rejects(generateSuggestion(input, config, { fetch: async () => new Response(JSON.stringify({ candidates: [{ finishReason: "SAFETY" }] })) }), (e) => e.code === "blocked_content");
});
test("network errors and timeout are bounded; fallback respects same cancellation deadline", async () => {
  let count = 0;
  const result = await generateSuggestion(input, config, { sleep: async () => {}, fetch: async () => { if (++count < 3) throw new Error("network"); return ok(); } });
  assert.equal(result.usedFallback, true);
  count = 0;
  await assert.rejects(generateSuggestion(input, config, { timeoutMs: 2, sleep: async () => {}, fetch: (_url, options) => new Promise((_resolve, reject) => { count++; options.signal.addEventListener("abort", () => reject(new Error("timeout"))); }) }), (e) => e.code === "provider_busy");
  assert.equal(count, 3);
});
test("truncated and malformed output is rejected without silently overwriting a listing", async () => {
  for (const body of [{ candidates: [{ finishReason: "MAX_TOKENS" }] }, { candidates: [{ finishReason: "STOP", content: { parts: [{ text: "invalid json" }] } }] }]) {
    await assert.rejects(generateSuggestion(input, config, { fetch: async () => new Response(JSON.stringify(body)) }), (e) => e.code === "invalid_response");
  }
});
