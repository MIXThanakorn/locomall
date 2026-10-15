type Item = { quantity: number; stores: { market_id?: number; unit_price: number | string; markets?: { name: string } | null } | null };
export function groupCartByMarket<T extends Item>(items: readonly T[], legacyMarketId?: number | null) {
  const groups = new Map<number, { marketId: number; marketName: string; items: T[]; total: number; quantity: number }>();
  for (const item of items) {
    const rawMarketId = item.stores ? Number(item.stores.market_id ?? legacyMarketId) : 0;
    const marketId = Number.isSafeInteger(rawMarketId) && rawMarketId > 0 ? rawMarketId : 0;
    let group = groups.get(marketId);
    if (!group) {
      group = { marketId, marketName: marketId ? item.stores?.markets?.name ?? "ตลาดชุมชน" : "รายการที่ไม่พร้อมขาย", items: [], total: 0, quantity: 0 };
      groups.set(marketId, group);
    }
    group.items.push(item);
    group.quantity += item.quantity;
    group.total += item.quantity * Number(item.stores?.unit_price ?? 0);
  }
  return [...groups.values()];
}

export function canBuyerCancel(order: { status: string; order_items: { order_allocations?: { status: string; stock_deducted_at?: string | null }[] }[] }) {
  return ["awaiting_preparation", "preparing"].includes(order.status)
    && !order.order_items.some((item) => (item.order_allocations ?? []).some((allocation) =>
      ["collected", "at_hub"].includes(allocation.status) || Boolean(allocation.stock_deducted_at)));
}
