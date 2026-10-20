import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { SelectedImage } from "./storage";
import { parseListingResult, type ListingAiResult } from "./listingSuggestion";
export type { ListingSuggestion, ListingAiResult } from "./listingSuggestion";

export type ListingAiInput = { marketId?: number; storeId?: number; productName: string; description: string; image?: SelectedImage | null };
export async function suggestListing(input: ListingAiInput, signal: AbortSignal): Promise<ListingAiResult> {
  const { data, error } = await supabase.functions.invoke("suggest-listing", {
    body: { marketId: input.marketId, storeId: input.storeId, productName: input.productName, description: input.description,
      ...(input.image ? { image: { base64: input.image.base64, mimeType: input.image.mimeType } } : {}) },
    signal,
  });
  if (error) {
    let message = "วิเคราะห์ข้อมูลไม่สำเร็จ กรุณาลองใหม่ภายหลัง คุณยังกรอกข้อมูลเองได้";
    if (error instanceof FunctionsHttpError) {
      try {
        const body = await error.context.json();
        if (error.context.status === 401) message = "กรุณาเข้าสู่ระบบใหม่ก่อนใช้บริการวิเคราะห์ข้อมูล";
        else if (typeof body?.message === "string") message = body.message;
        if (Number.isFinite(body?.retryAfterSeconds) && body.retryAfterSeconds > 0 && body.retryAfterSeconds <= 86400) message += ` (รอประมาณ ${Math.ceil(body.retryAfterSeconds / 60)} นาที)`;
      } catch { /* No raw server errors or secrets in UI. */ }
    }
    throw new Error(message);
  }
  if (signal.aborted) throw new Error("ยกเลิกการวิเคราะห์แล้ว");
  return parseListingResult(data);
}
