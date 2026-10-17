type SelectableItem = { cart_item_id: number; store_id: number; quantity: number; stores: { market_id?: number; unit_price: number | string } | null };

export function parseCartSelection(value: unknown): number[] {
  if (typeof value !== "string" || !/^\d+(,\d+)*$/.test(value) || value.length > 4096) return [];
  const ids = value.split(",").map(Number);
  if (ids.some((id) => !Number.isSafeInteger(id) || id <= 0) || new Set(ids).size !== ids.length) return [];
  return ids;
}

/** Reject the whole selection if any row disappeared or belongs to another market. */
export function selectedCartItems<T extends SelectableItem>(items: readonly T[], ids: readonly number[], marketId?: number): T[] {
  if (!ids.length || new Set(ids).size !== ids.length) return [];
  const selected = ids.map((id) => items.find((item) => item.cart_item_id === id));
  if (selected.some((item) => !item?.stores || !Number.isSafeInteger(Number(item.stores.market_id)) || Number(item.stores.market_id) <= 0)) return [];
  const market = marketId ?? Number(selected[0]!.stores!.market_id);
  if (selected.some((item) => Number(item!.stores!.market_id) !== market || !Number.isSafeInteger(item!.quantity) || item!.quantity <= 0)) return [];
  return selected as T[];
}

export function toggleCartSelection<T extends SelectableItem>(items: readonly T[], ids: readonly number[], itemId: number): number[] {
  const current = selectedCartItems(items, ids);
  const validIds = current.map((item) => item.cart_item_id);
  if (validIds.includes(itemId)) return validIds.filter((id) => id !== itemId);
  const next = [...validIds, itemId];
  return selectedCartItems(items, next).length === next.length ? next : validIds;
}
