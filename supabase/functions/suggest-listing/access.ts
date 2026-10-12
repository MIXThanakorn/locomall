import type { SupabaseClient } from "npm:@supabase/supabase-js@2.112.3";
import { AiError, type ListingInput } from "./core.ts";

export async function authorizedStoreImage(client: Pick<SupabaseClient, "from">, input: ListingInput, userId: string): Promise<string | null> {
  if (input.storeId) {
    const { data, error } = await client.from("stores").select("store_id, manager_id, image_url").eq("store_id", input.storeId).eq("manager_id", userId).maybeSingle();
    if (error) throw error;
    if (!data) throw new AiError("forbidden", 403);
    return data.image_url;
  }
  const { data: market, error: marketError } = await client.from("markets").select("subdistrict_code").eq("market_id", input.marketId!).eq("approval_status", "approved").maybeSingle();
  const { data: location, error: locationError } = await client.from("user_locations").select("subdistrict_code").eq("user_id", userId).maybeSingle();
  if (marketError || locationError) throw marketError ?? locationError;
  if (!market || !location || market.subdistrict_code !== location.subdistrict_code) throw new AiError("forbidden", 403);
  return null;
}
export function ownedStoreImagePath(imageUrl: string, projectUrl: string, storeId: number): string {
  try {
    const image = new URL(imageUrl); const project = new URL(projectUrl);
    const prefix = `/storage/v1/object/public/store-images/${storeId}/`;
    if (image.origin !== project.origin || !image.pathname.startsWith(prefix)) throw new Error();
    const path = decodeURIComponent(image.pathname.slice("/storage/v1/object/public/store-images/".length));
    if (path.split("/").some((segment) => segment === ".." || segment === ".") || !path.startsWith(`${storeId}/`)) throw new Error();
    return path;
  } catch { throw new AiError("invalid_image", 400); }
}
