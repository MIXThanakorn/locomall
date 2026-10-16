/** Use available container width, not device model or physical screen size. */
export function catalogColumns(width: number, fontScale = 1): 1 | 2 {
  return width >= 340 && fontScale < 1.3 ? 2 : 1;
}

export function catalogPrice(price: number | null | undefined, unit?: string | null, market = false): string {
  if (price == null || !Number.isFinite(Number(price))) return "ยังไม่มีราคา";
  return `${market ? "เริ่มต้น " : ""}฿${Number(price).toLocaleString("th-TH")}${!market && unit ? ` / ${unit}` : ""}`;
}

export function filterMarketStores<T extends { name: string; product_name?: string | null; available_stock?: number | string | null }>(stores: T[], query: string, inStockOnly: boolean): T[] {
  const search = query.trim().toLocaleLowerCase("th-TH");
  return stores.filter((store) => (!inStockOnly || Number(store.available_stock ?? 0) > 0)
    && (!search || `${store.name} ${store.product_name ?? ""}`.toLocaleLowerCase("th-TH").includes(search)));
}
