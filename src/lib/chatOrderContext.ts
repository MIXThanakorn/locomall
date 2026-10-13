export type ChatOrderContext = {
  order_id: number; order_item_id: number; order_number: string; product_name: string;
  quantity: number; unit: string; item_amount: number; order_status: string; created_at: string;
  viewer_is_buyer: boolean; allocation_id: number | null;
};

export function chatOrderDetailPath(item: ChatOrderContext): string | null {
  if (item.viewer_is_buyer) return `/order/${item.order_id}`;
  // A store manager can chat without being an allocated seller. Never link
  // that manager to the buyer's full order (other shops / delivery address).
  return item.allocation_id ? `/seller/allocations/${item.allocation_id}` : null;
}

export function shortChatOrderNumber(value: string): string {
  return `#${value.split("-").at(-1) || value}`;
}
