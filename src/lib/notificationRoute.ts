// Route only known entities and positive database IDs; never accept a payload URL.
export function notificationPath(data: Record<string, unknown> | undefined) {
  const kind = typeof data?.entity_type === "string" ? data.entity_type : "";
  const id = String(data?.entity_id ?? "");
  const valid = /^[1-9]\d*$/.test(id);
  if (kind === "allocation" && valid) return `/seller/allocations/${id}` as const;
  if (kind === "my_store" && valid) return `/store/manage/edit?storeId=${id}` as const;
  if (kind === "my_market") return "/market/manage/home" as const;
  if (kind === "store_request" && valid) return `/market/manage/request/${id}` as const;
  if (kind === "seller_request" && valid) return `/market/manage?applicationId=${id}` as const;
  if (kind === "seller" || kind === "seller_application") return "/seller/listings" as const;
  if (kind === "store_moderation") return "/seller/stores" as const;
  if (["demo_topup", "topup", "demo_settlement", "settlement", "wallet"].includes(kind)) return "/profile/wallet" as const;
  if (kind === "order_hub_ready" && valid) return `/market/manage/logistics?orderId=${id}` as const;
  if ((kind === "market" || kind === "markets") && valid) {
    return data?.category === "approval" || data?.type === "approval" ? "/market/manage/home" as const : `/market/${id}` as const;
  }
  if ((kind === "store" || kind === "stores") && valid) {
    return data?.category === "approval" || data?.type === "approval" ? `/store/manage/edit?storeId=${id}` as const : `/store/${id}` as const;
  }
  if (kind === "order" && valid) {
    if (data?.type === "order_allocation_ready" || data?.type === "order_all_at_hub") return "/market/manage/logistics" as const;
    if (data?.type === "order_new" || data?.type === "order_delivered") return "/seller/allocations" as const;
    return `/order/${id}` as const;
  }
  if (kind === "chat" && valid) return `/chat/${id}` as const;
  return "/(tabs)/notification" as const;
}
