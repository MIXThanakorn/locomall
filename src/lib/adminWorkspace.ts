export const ADMIN_PAGE_SIZE = 20;
export const ADMIN_SECTIONS = [
  { key: "index", label: "ภาพรวม", route: "/admin", icon: "grid-outline" },
  { key: "markets", label: "คำขออนุมัติ", route: "/admin/markets", icon: "checkmark-done-outline" },
  { key: "stores", label: "ร้านค้า", route: "/admin/stores", icon: "storefront-outline" },
  { key: "orders", label: "คำสั่งซื้อ", route: "/admin/orders", icon: "cube-outline" },
  { key: "reviews", label: "รีวิว", route: "/admin/reviews", icon: "star-outline" },
  { key: "finance", label: "ยอดเงินจำลอง", route: "/admin/finance", icon: "wallet-outline" },
  { key: "audit", label: "ประวัติ", route: "/admin/audit", icon: "document-text-outline" },
] as const;
export type AdminSection = typeof ADMIN_SECTIONS[number]["key"];
export const ADMIN_ORDER_FILTERS = [
  { value: "active", label: "กำลังดำเนินการ" }, { value: "awaiting_preparation", label: "รอรับงาน" },
  { value: "preparing", label: "กำลังเตรียม" }, { value: "at_hub", label: "ถึงจุดรวม" },
  { value: "consolidated", label: "รวมพัสดุ" }, { value: "shipped", label: "จัดส่งแล้ว" },
  { value: "delivered", label: "สำเร็จ" }, { value: "cancelled", label: "ยกเลิก" },
] as const;
export type AdminOrderFilter = typeof ADMIN_ORDER_FILTERS[number]["value"];
export function approvalQueueKind(value: unknown): "market" | "store" | "seller" {
  return value === "store" || value === "seller" ? value : "market";
}
export function adminPageRange(page: number): [number, number] {
  const safe = Number.isSafeInteger(page) && page >= 0 && page <= 100000 ? page : 0;
  return [safe * ADMIN_PAGE_SIZE, (safe + 1) * ADMIN_PAGE_SIZE - 1];
}
export function escapeAdminSearch(value: string) { return value.trim().slice(0, 120).replace(/[%_\\]/g, "\\$&"); }
