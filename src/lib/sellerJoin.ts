type JoinAccess = { signedIn: boolean; sameArea: boolean; isManager: boolean; isSeller: boolean; status?: string | null };

/** Presentation only. The database still independently verifies area and identity. */
export function sellerJoinAction(access: JoinAccess): string | null {
  if (!access.signedIn || !access.sameArea || access.isManager || access.isSeller) return null;
  if (access.status === "pending" || access.status === "approved") return "ดูคำขอร่วมขาย";
  if (access.status === "rejected") return "ส่งคำขอร่วมขายใหม่";
  return access.status ? null : "ขอร่วมขายสินค้านี้";
}

export type JoinCatalog = { store_id: number; name: string; product_name: string; image_url: string | null; same_area: boolean; is_manager: boolean; is_seller: boolean };
export function parseJoinCatalog(value: unknown, storeId: number): JoinCatalog | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (row.store_id !== storeId || typeof row.name !== "string" || typeof row.product_name !== "string") return null;
  return { store_id: storeId, name: row.name, product_name: row.product_name,
    image_url: typeof row.image_url === "string" ? row.image_url : null,
    same_area: row.same_area === true, is_manager: row.is_manager === true, is_seller: row.is_seller === true };
}
