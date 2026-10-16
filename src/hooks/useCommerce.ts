import { useFocusEffect } from "expo-router";
import type { QueryData } from "@supabase/supabase-js";
import { COMMERCE_PAGE_SIZE, type PageCursor, useAccountPage } from "./useAccountPage";
import { parseSellerAllocations, type SellerAllocation } from "../lib/commerceDto";
import { useCallback, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import type { Tables } from "../types/database";
import type { CatalogSort } from "../lib/catalogSort";
import { RealtimeWatch, useRealtimeRefresh } from "./useRealtimeRefresh";

export type NearbyResult = { entity_type: string; entity_id: number; market_id: number; name: string; description: string; image_url: string | null; distance_km: number | null; radius_km: number; available_stock: number; product_name?: string | null; unit?: string | null; market_name?: string | null; unit_price?: number | null; rating_average?: number; rating_count?: number; sold_quantity?: number; cursor_missing?: boolean; cursor_value?: number };
const DISCOVERY_PAGE_SIZE = 24;
const CATALOG_WATCHES: RealtimeWatch[] = [
  { table: "markets", event: "INSERT" }, { table: "markets", event: "UPDATE" },
  { table: "stores", event: "INSERT" }, { table: "stores", event: "UPDATE" },
  { table: "seller_listings", event: "INSERT" }, { table: "seller_listings", event: "UPDATE" },
];

export function useNearby(query = "", kind = "all", options: { sameArea?: boolean; nearbyOnly?: boolean; inStockOnly?: boolean; sort?: CatalogSort; enabled?: boolean } = {}) {
  const { deviceLocation, deviceLocationReady, session } = useAuth();
  // Guests have no saved-location onboarding; absence of GPS must not block public browsing.
  const discoveryReady = deviceLocationReady || !session;
  const sameArea = options.sameArea ?? false;
  const nearbyOnly = options.nearbyOnly ?? false;
  const inStockOnly = options.inStockOnly ?? false;
  const sort = options.sort ?? "distance";
  const enhanced = inStockOnly || sort !== "distance";
  const enabled = options.enabled ?? true;
  const userId = session?.user.id;
  const scope = JSON.stringify([userId, query, kind, sameArea, nearbyOnly, inStockOnly, sort, deviceLocation]);
  const [pageResult, setPageResult] = useState<{ scope: string; items: NearbyResult[] } | null>(null);
  const items = useMemo(() => pageResult?.scope === scope ? pageResult.items : [], [pageResult, scope]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const requestingMore = useRef(false);
  const fetchPage = useCallback(async (after?: NearbyResult) => {
    const result = await supabase.rpc(enhanced ? "discover_filtered_catalog_page" : nearbyOnly ? "discover_nearby_catalog_page" : sameArea ? "discover_same_area_catalog_page" : "discover_catalog_page", {
      ...(nearbyOnly || enhanced ? { p_same_area: sameArea } : {}),
      ...(enhanced ? { p_nearby_only: nearbyOnly, p_in_stock_only: inStockOnly, p_sort: sort,
        p_after_missing: after?.cursor_missing, p_after_value: after?.cursor_value } : {}),
      p_query: query || undefined,
      p_kind: kind,
      p_limit: DISCOVERY_PAGE_SIZE + 1,
      p_lat: deviceLocation?.latitude,
      p_lng: deviceLocation?.longitude,
      p_after_distance_km: after?.distance_km,
      p_after_entity_type: after?.entity_type,
      p_after_entity_id: after?.entity_id,
    });
    if (result.error || !result.data) return result;
    const marketIds = result.data.filter((item) => item.entity_type === "market").map((item) => item.entity_id);
    const storeIds = result.data.filter((item) => item.entity_type === "store").map((item) => item.entity_id);
    const { data: metrics, error: metricsError } = await supabase.rpc("get_catalog_card_details", { p_market_ids: marketIds, p_store_ids: storeIds });
    if (metricsError) return { ...result, error: metricsError };
    const byEntity = new Map((metrics ?? []).map((metric) => [`${metric.entity_type}-${metric.entity_id}`, metric]));
    return { ...result, data: result.data.map((item) => {
      const metric = byEntity.get(`${item.entity_type}-${item.entity_id}`);
      return { ...metric, ...item, unit_price: "unit_price" in item ? item.unit_price : metric?.min_price ?? null };
    }) };
  }, [query, kind, deviceLocation, sameArea, nearbyOnly, inStockOnly, sort, enhanced]);
  const refresh = useCallback(async () => {
    if (!discoveryReady || !enabled) return;
    const currentRequest = ++requestId.current;
    requestingMore.current = false;
    setLoadingMore(false);
    setLoading(true);
    try {
    const { data, error: requestError } = await fetchPage();
    if (currentRequest !== requestId.current) return;
    if (requestError) throw requestError;
    const page = (data ?? []) as NearbyResult[];
    setPageResult({ scope, items: page.slice(0, DISCOVERY_PAGE_SIZE) });
    setHasMore(page.length > DISCOVERY_PAGE_SIZE);
    setError(null);
    } catch {
      if (currentRequest !== requestId.current) return;
      setPageResult((current) => current?.scope === scope ? current : { scope, items: [] });
      setError("โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่");
    } finally { if (currentRequest === requestId.current) setLoading(false); }
  }, [discoveryReady, enabled, fetchPage, scope]);
  const loadMore = useCallback(async () => {
    if (!discoveryReady || !enabled || loading || !hasMore || !items.length || requestingMore.current) return;
    requestingMore.current = true;
    setLoadingMore(true);
    const currentRequest = requestId.current;
    try {
    const { data, error: requestError } = await fetchPage(items[items.length - 1]);
    if (currentRequest === requestId.current) {
      const page = ((data ?? []) as NearbyResult[]).slice(0, DISCOVERY_PAGE_SIZE);
      if (!requestError) {
        setPageResult((current) => {
          if (!current || current.scope !== scope) return current;
          const known = new Set(current.items.map((item) => `${item.entity_type}-${item.entity_id}`));
          return { scope, items: [...current.items, ...page.filter((item) => !known.has(`${item.entity_type}-${item.entity_id}`))] };
        });
        setHasMore((data?.length ?? 0) > DISCOVERY_PAGE_SIZE);
      } else setError(requestError.message);
    }
    } catch { if (currentRequest === requestId.current) setError("โหลดรายการเพิ่มเติมไม่สำเร็จ กรุณาลองใหม่"); }
    finally { if (currentRequest === requestId.current) { setLoadingMore(false); requestingMore.current = false; } }
  }, [discoveryReady, enabled, loading, hasMore, items, fetchPage, scope]);
  useFocusEffect(useCallback(() => {
    const timer = setTimeout(() => void refresh(), 250);
    return () => { clearTimeout(timer); requestId.current += 1; };
  }, [refresh]));
  useRealtimeRefresh("home-catalog", refresh, CATALOG_WATCHES, discoveryReady && enabled);
  const currentScope = enabled && pageResult?.scope === scope;
  return { items: enabled ? items : [], loading: !currentScope || loading, loadingMore: currentScope && loadingMore, hasMore: currentScope && hasMore, error: currentScope ? error : null, refresh, loadMore };
}

function buyerOrdersQuery() {
  return supabase.from("orders").select("order_id,order_number,created_at,status,total_amount,fulfillment_method,markets(name),order_items(order_item_id,product_name,product_image_url,unit,unit_price,quantity,total_amount,stores(name,image_url))");
}
export type BuyerOrder = QueryData<ReturnType<typeof buyerOrdersQuery>>[number];
const buyerCursor = (row: BuyerOrder) => ({ created_at: new Date(row.created_at).toISOString(), id: row.order_id });
const sellerCursor = (row: SellerAllocation) => ({ created_at: new Date(row.created_at).toISOString(), id: row.allocation_id });
const notificationCursor = (row: Tables<"notifications">) => ({ created_at: new Date(row.created_at).toISOString(), id: row.notification_id });
function beforeCursor(cursor: PageCursor, id: string) {
  return "created_at.lt." + cursor.created_at + ",and(created_at.eq." + cursor.created_at + "," + id + ".lt." + cursor.id + ")";
}
const fetchBuyerOrders = async (userId: string, cursor: PageCursor | null) => {
  let query = buyerOrdersQuery().eq("buyer_id", userId).order("created_at", { ascending: false }).order("order_id", { ascending: false }).limit(COMMERCE_PAGE_SIZE + 1);
  if (cursor) query = query.or(beforeCursor(cursor, "order_id"));
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
};
const fetchSellerAllocations = async (_userId: string, cursor: PageCursor | null) => {
  const { data, error } = await supabase.rpc("get_my_seller_allocations_page", { p_limit: COMMERCE_PAGE_SIZE + 1, p_before_created_at: cursor?.created_at, p_before_id: cursor?.id });
  if (error) throw error;
  return parseSellerAllocations(data);
};
const fetchNotifications = async (userId: string, cursor: PageCursor | null, category: string, unreadOnly: boolean) => {
  let query = supabase.from("notifications").select("*").eq("user_id", userId).neq("category", "chat").is("dismissed_at", null)
    .order("created_at", { ascending: false }).order("notification_id", { ascending: false }).limit(COMMERCE_PAGE_SIZE + 1);
  if (cursor) query = query.or(beforeCursor(cursor, "notification_id"));
  if (category !== "all") query = query.eq("category", category);
  if (unreadOnly) query = query.is("read_at", null);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
};
export function useOrders() {
  const { session } = useAuth(); const userId = session?.user.id;
  const page = useAccountPage(fetchBuyerOrders, buyerCursor);
  const watches = useMemo<RealtimeWatch[]>(() => userId ? [
    { table: "orders", event: "INSERT", filter: "buyer_id=eq." + userId }, { table: "orders", event: "UPDATE", filter: "buyer_id=eq." + userId },
  ] : [], [userId]);
  useRealtimeRefresh("buyer-orders-" + userId, page.refresh, watches, Boolean(userId));
  return { ...page, orders: page.rows, error: page.error ? "โหลดคำสั่งซื้อไม่สำเร็จ" : null };
}
export function useSellerAllocations() {
  const { session } = useAuth(); const userId = session?.user.id;
  const page = useAccountPage(fetchSellerAllocations, sellerCursor);
  const watches = useMemo<RealtimeWatch[]>(() => userId ? [
    { table: "order_allocations", event: "INSERT", filter: "seller_id=eq." + userId }, { table: "order_allocations", event: "UPDATE", filter: "seller_id=eq." + userId },
  ] : [], [userId]);
  useRealtimeRefresh("seller-allocations-" + userId, page.refresh, watches, Boolean(userId));
  return { ...page, allocations: page.rows, error: page.error ? "โหลดงานขายไม่สำเร็จ" : null };
}
export function useNotifications(category = "all", unreadOnly = false) {
  const { session } = useAuth(); const userId = session?.user.id;
  const fetch = useCallback((userId: string, cursor: PageCursor | null) => fetchNotifications(userId, cursor, category, unreadOnly), [category, unreadOnly]);
  const page = useAccountPage(fetch, notificationCursor, `${category}:${unreadOnly}`);
  const watches = useMemo<RealtimeWatch[]>(() => userId ? [
    { table: "notifications", event: "INSERT", filter: "user_id=eq." + userId }, { table: "notifications", event: "UPDATE", filter: "user_id=eq." + userId },
  ] : [], [userId]);
  useRealtimeRefresh(`my-notifications-${userId}`, page.refresh, watches, Boolean(userId));
  return { ...page, items: page.rows };
}
