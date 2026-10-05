/* eslint-disable react-hooks/set-state-in-effect */
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import type { Tables } from "../types/database";
import { RealtimeWatch, useRealtimeRefresh } from "./useRealtimeRefresh";

export type NearbyResult = { entity_type: string; entity_id: number; market_id: number; name: string; description: string; image_url: string | null; distance_km: number | null; radius_km: number; available_stock: number; unit_price?: number | null; rating_average?: number; rating_count?: number; sold_quantity?: number };
const DISCOVERY_PAGE_SIZE = 24;
const CATALOG_WATCHES: RealtimeWatch[] = [
  { table: "markets", event: "INSERT" }, { table: "markets", event: "UPDATE" },
  { table: "stores", event: "INSERT" }, { table: "stores", event: "UPDATE" },
];

export function useNearby(query = "", kind = "all") {
  const { deviceLocation, deviceLocationReady } = useAuth();
  const [items, setItems] = useState<NearbyResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const requestingMore = useRef(false);
  const fetchPage = useCallback(async (after?: NearbyResult) => {
    const result = await supabase.rpc("discover_catalog_page", {
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
      return { ...item, ...metric, unit_price: metric?.min_price ?? null };
    }) };
  }, [query, kind, deviceLocation]);
  const refresh = useCallback(async () => {
    if (!deviceLocationReady) return;
    const currentRequest = ++requestId.current;
    requestingMore.current = false;
    setLoadingMore(false);
    setLoading(true);
    const { data, error: requestError } = await fetchPage();
    if (currentRequest !== requestId.current) return;
    const page = (data ?? []) as NearbyResult[];
    setItems(page.slice(0, DISCOVERY_PAGE_SIZE));
    setHasMore(page.length > DISCOVERY_PAGE_SIZE);
    setError(requestError?.message ?? null);
    setLoading(false);
  }, [deviceLocationReady, fetchPage]);
  const loadMore = useCallback(async () => {
    if (!deviceLocationReady || loading || !hasMore || !items.length || requestingMore.current) return;
    requestingMore.current = true;
    setLoadingMore(true);
    const currentRequest = requestId.current;
    const { data, error: requestError } = await fetchPage(items[items.length - 1]);
    if (currentRequest === requestId.current) {
      const page = ((data ?? []) as NearbyResult[]).slice(0, DISCOVERY_PAGE_SIZE);
      if (!requestError) {
        setItems((current) => {
          const known = new Set(current.map((item) => `${item.entity_type}-${item.entity_id}`));
          return [...current, ...page.filter((item) => !known.has(`${item.entity_type}-${item.entity_id}`))];
        });
        setHasMore((data?.length ?? 0) > DISCOVERY_PAGE_SIZE);
      } else setError(requestError.message);
      setLoadingMore(false);
      requestingMore.current = false;
    }
  }, [deviceLocationReady, loading, hasMore, items, fetchPage]);
  useFocusEffect(useCallback(() => {
    const timer = setTimeout(() => void refresh(), 250);
    return () => { clearTimeout(timer); requestId.current += 1; };
  }, [refresh]));
  useRealtimeRefresh("home-catalog", refresh, CATALOG_WATCHES, deviceLocationReady);
  return { items, loading, loadingMore, hasMore, error, refresh, loadMore };
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
    const response = await supabase.from("orders").select("*,markets(name),order_items(*,stores(name,image_url))").eq("buyer_id", userId).order("created_at", { ascending: false });
    if (currentRequest === requestId.current) setResult({ userId, orders: response.data ?? [], error: response.error?.message ?? null, loading: false });
  }, [userId]);
  useEffect(() => { void refresh(); }, [refresh]);
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
    const response = await supabase.from("order_allocations").select("*,order_items(product_name,product_image_url,unit,unit_price,stores(name,image_url,markets(name)),orders(order_id,order_number,created_at,fulfillment_method,status))").eq("seller_id", userId).order("created_at", { ascending: false });
    if (currentRequest === requestId.current) setResult({ userId, allocations: response.data ?? [], error: response.error?.message ?? null, loading: false });
  }, [userId]);
  useEffect(() => { void refresh(); }, [refresh]);
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
  const [items, setItems] = useState<Tables<"notifications">[]>([]); const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    if (!userId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const r = await supabase.from("notifications").select("*").neq("category", "chat").order("created_at", { ascending: false });
    setItems(r.data ?? []); setLoading(false);
  }, [userId]);
  useEffect(() => {
    if (!userId) return;
    void refresh();
    const channel = supabase.channel(`my-notifications-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => void refresh())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => void refresh())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [refresh, userId]);
  return { items, loading, refresh };
}
