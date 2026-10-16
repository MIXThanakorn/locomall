export type SellerAllocation = {
  allocation_id: number; quantity: number; status: string; created_at: string;
  order_items: { product_name: string; product_image_url: string | null; unit: string; unit_price: number;
    stores: { name: string; image_url: string | null; markets: { name: string; hub_address?: string } };
    orders: { order_id: number; order_number: string; created_at: string; fulfillment_method: string; status: string } };
};
export function parseSellerAllocations(value: unknown): SellerAllocation[] {
  if (!Array.isArray(value)) throw new Error("invalid seller response");
  for (const row of value) {
    const i = row?.order_items;
    if (!Number.isSafeInteger(row?.allocation_id) || !Number.isSafeInteger(row?.quantity) || typeof row?.status !== "string"
      || typeof row?.created_at !== "string" || !Number.isFinite(Date.parse(row.created_at)) || typeof i?.product_name !== "string"
      || typeof i?.unit !== "string" || !Number.isFinite(Number(i?.unit_price)) || typeof i?.stores?.name !== "string"
      || typeof i?.stores?.markets?.name !== "string" || !Number.isSafeInteger(i?.orders?.order_id)
      || typeof i?.orders?.order_number !== "string") throw new Error("invalid seller response");
  }
  return value as SellerAllocation[];
}

export type DeliveryAddress = { recipient_name: string; phone: string; address_line: string; postal_code: string; location?: { subdistrict?: string; district?: string; province?: string } };
export function parseDeliveryAddress(value: unknown): DeliveryAddress | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (!["recipient_name", "phone", "address_line", "postal_code"].every(key => typeof row[key] === "string")) return null;
  const location = row.location && typeof row.location === "object" ? row.location as Record<string, unknown> : {};
  return { recipient_name: row.recipient_name as string, phone: row.phone as string, address_line: row.address_line as string, postal_code: row.postal_code as string,
    location: { subdistrict: typeof location.subdistrict === "string" ? location.subdistrict : "", district: typeof location.district === "string" ? location.district : "", province: typeof location.province === "string" ? location.province : "" } };
}
