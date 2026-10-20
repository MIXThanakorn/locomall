// Validate again at the app boundary; never render arbitrary provider/server values.
export type ListingSuggestion = { product_name: string; description: string; keywords: string[]; missing_information: string[] };
export type ListingAiResult = { suggestion: ListingSuggestion; model: string; usedFallback: boolean; requiresReview: boolean };
export function parseListingResult(value: unknown): ListingAiResult {
  const invalid = () => new Error("ผลการวิเคราะห์ข้อมูลไม่ครบ กรุณาลองใหม่หรือกรอกเอง");
  const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
  const text = (v: unknown, max: number): v is string => typeof v === "string" && !!v.trim() && v.length <= max;
  const list = (v: unknown, max: number, length: number): v is string[] => Array.isArray(v) && v.length <= max && v.every((item) => text(item, length));
  if (!record(value) || !record(value.suggestion) || value.requiresReview !== true || typeof value.usedFallback !== "boolean" || !text(value.model, 100)) throw invalid();
  const draft = value.suggestion;
  if (!text(draft.product_name, 120) || !text(draft.description, 1500) || !list(draft.keywords, 8, 40) || !list(draft.missing_information, 6, 150)) throw invalid();
  return { suggestion: { product_name: draft.product_name.trim(), description: draft.description.trim(), keywords: draft.keywords, missing_information: draft.missing_information }, model: value.model, usedFallback: value.usedFallback, requiresReview: true };
}
