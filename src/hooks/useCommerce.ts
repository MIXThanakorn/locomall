import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import type { Tables } from "../types/database";
import type { CatalogSort } from "../lib/catalogSort";
import { RealtimeWatch, useRealtimeRefresh } from "./useRealtimeRefresh";

export type NearbyResult = { entity_type: string; entity_id: number; market_id: number; name: string; description: string; image_url: string | null; distance_km: number | null; radius_km: number; available_stock: number; unit_price?: number | null; rating_average?: number; rating_count?: number; sold_quantity?: number; cursor_missing?: boolean; cursor_value?: number };
const DISCOVERY_PAGE_SIZE = 24;
const CATALOG_WATCHES: RealtimeWatch[] = [
  { table: "markets", event: "INSERT" }, { table: "markets", event: "UPDATE" },
  { table: "stores", event: "INSERT" }, { table: "stores", event: "UPDATE" },
  { table: "seller_listings", event: "INSERT" }, { table: "seller_listings", event: "UPDATE" },
];

export function useNearby(query = "", kind = "all", options: { sameArea?: boolean; nearbyOnly?: boolean; inStockOnly?: boolean; sort?: CatalogSort; enabled?: boolean } = {}) {
  const { deviceLocation, deviceLocationReady, session } = useAuth();
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
    const { data: metrics, error: metricsError } = await (supabase as any).rpc("get_catalog_card_metrics", { p_market_ids: marketIds, p_store_ids: storeIds });
    if (metricsError) return { ...result, error: metricsError };
    const byEntity = new Map<string, Record<string, unknown>>((metrics ?? []).map((metric: any) => [`${metric.entity_type}-${metric.entity_id}`, metric]));
    return { ...result, data: result.data.map((item) => {
      const metric = byEntity.get(`${item.entity_type}-${item.entity_id}`);
      return { ...metric, ...item, unit_price: "unit_price" in item ? item.unit_price : metric?.min_price ?? null };
    }) };
  }, [query, kind, deviceLocation, sameArea, nearbyOnly, inStockOnly, sort, enhanced]);
  const refresh = useCallback(async () => {
    if (!deviceLocationReady || !enabled) return;
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
    setError(requestError?.message ?? null);
    } catch {
      if (currentRequest !== requestId.current) return;
      setPageResult((current) => current?.scope === scope ? current : { scope, items: [] });
      setError("โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่");
    } finally { if (currentRequest === requestId.current) setLoading(false); }
  }, [deviceLocationReady, enabled, fetchPage, scope]);
  const loadMore = useCallback(async () => {
    if (!deviceLocationReady || !enabled || loading || !hasMore || !items.length || requestingMore.current) return;
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
  }, [deviceLocationReady, enabled, loading, hasMore, items, fetchPage, scope]);
  useFocusEffect(useCallback(() => {
    const timer = setTimeout(() => void refresh(), 250);
    return () => { clearTimeout(timer); requestId.current += 1; };
  }, [refresh]));
  useRealtimeRefresh("home-catalog", refresh, CATALOG_WATCHES, deviceLocationReady && enabled);
  const currentScope = enabled && pageResult?.scope === scope;
  return { items: enabled ? items : [], loading: !currentScope || loading, loadingMore: currentScope && loadingMore, hasMore: currentScope && hasMore, error: currentScope ? error : null, refresh, loadMore };
}

export function useOrders() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [result, setResult] = useState<{ userId?: string; orders: any[]; loading: boolean; error: string | null }>({ orders: [], loading: true, error: null });
  const requestId = useRef(0);
  const refresh = useCallback(async () => {
    const currentRequest = ++requestId.current;
    if (!userId) { setResult({ userId, orders: [], loading: false, error: null }); return; }
    setResult((current) => ({ userId, orders: current.userId === userId ? current.orders : [], loading: true, error: null }));
    try {
      const response = await supabase.from("orders").select("*,markets(name),order_items(*,stores(name,image_url))").eq("buyer_id", userId).order("created_at", { ascending: false });
      if (response.error) throw response.error;
      if (currentRequest === requestId.current) setResult({ userId, orders: response.data ?? [], error: null, loading: false });
    } catch {
      if (currentRequest === requestId.current) setResult((current) => ({ userId, orders: current.userId === userId ? current.orders : [], error: "โหลดคำสั่งซื้อไม่สำเร็จ", loading: false }));
    }
  }, [userId]);
  useFocusEffect(useCallback(() => { void refresh(); return () => { requestId.current++; }; }, [refresh]));
  const watches = useMemo<RealtimeWatch[]>(() => userId ? [
    { table: "orders", event: "INSERT", filter: `buyer_id=eq.${userId}` },
    { table: "orders", event: "UPDATE", filter: `buyer_id=eq.${userId}` },
  ] : [], [userId]);
  useRealtimeRefresh(`buyer-orders-${userId}`, refresh, watches, Boolean(userId));
  return { orders: result.userId === userId ? result.orders : [], loading: result.userId !== userId || result.loading, error: result.userId === userId ? result.error : null, refresh };
}

export function useSellerAllocations() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [result, setResult] = useState<{ userId?: string; allocations: any[]; loading: boolean; error: string | null }>({ allocations: [], loading: true, error: null });
  const requestId = useRef(0);
  const refresh = useCallback(async () => {
    const currentRequest = ++requestId.current;
    if (!userId) { setResult({ userId, allocations: [], loading: false, error: null }); return; }
    setResult((current) => ({ userId, allocations: current.userId === userId ? current.allocations : [], loading: true, error: null }));
    try {
      const response = await supabase.from("order_allocations").select("*,order_items(product_name,product_image_url,unit,unit_price,stores(name,image_url,markets(name)),orders(order_id,order_number,created_at,fulfillment_method,status))").eq("seller_id", userId).order("created_at", { ascending: false });
      if (response.error) throw response.error;
      if (currentRequest === requestId.current) setResult({ userId, allocations: response.data ?? [], error: null, loading: false });
    } catch {
      if (currentRequest === requestId.current) setResult((current) => ({ userId, allocations: current.userId === userId ? current.allocations : [], error: "โหลดงานขายไม่สำเร็จ", loading: false }));
    }
  }, [userId]);
  useFocusEffect(useCallback(() => { void refresh(); return () => { requestId.current++; }; }, [refresh]));
  const watches = useMemo<RealtimeWatch[]>(() => userId ? [
    { table: "order_allocations", event: "INSERT", filter: `seller_id=eq.${userId}` },
    { table: "order_allocations", event: "UPDATE", filter: `seller_id=eq.${userId}` },
  ] : [], [userId]);
  useRealtimeRefresh(`seller-allocations-${userId}`, refresh, watches, Boolean(userId));
  return { allocations: result.userId === userId ? result.allocations : [], loading: result.userId !== userId || result.loading, error: result.userId === userId ? result.error : null, refresh };
}

export function useNotifications() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [result, setResult] = useState<{ userId?: string; items: Tables<"notifications">[]; loading: boolean; error: boolean }>({ items: [], loading: true, error: false });
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++generation.current;
    if (!userId) { setResult({ userId, items: [], loading: false, error: false }); return; }
    setResult((current) => ({ userId, items: current.userId === userId ? current.items : [], loading: true, error: false }));
    try {
      const r = await supabase.from("notifications").select("*").eq("user_id", userId).neq("category", "chat").is("dismissed_at", null).order("created_at", { ascending: false });
      if (r.error) throw r.error;
      if (request === generation.current) setResult({ userId, items: r.data ?? [], loading: false, error: false });
    } catch {
      if (request === generation.current) setResult((current) => ({ userId, items: current.userId === userId ? current.items : [], loading: false, error: true }));
    }
  }, [userId]);
  useFocusEffect(useCallback(() => { void refresh(); return () => { generation.current++; }; }, [refresh]));
  const watches = useMemo<RealtimeWatch[]>(() => userId ? [
    { table: "notifications", event: "INSERT", filter: `user_id=eq.${userId}` },
    { table: "notifications", event: "UPDATE", filter: `user_id=eq.${userId}` },
  ] : [], [userId]);
  useRealtimeRefresh(`my-notifications-${userId}`, refresh, watches, !!userId);
  return { items: result.userId === userId ? result.items : [], loading: result.userId !== userId || result.loading, error: result.userId === userId && result.error, refresh };
}
