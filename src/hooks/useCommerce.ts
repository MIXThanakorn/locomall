/* eslint-disable react-hooks/set-state-in-effect */
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import type { Tables } from "../types/database";

export type NearbyResult = { entity_type: string; entity_id: number; market_id: number; name: string; description: string; image_url: string | null; distance_km: number | null; radius_km: number; available_stock: number; unit_price?: number | null };
const DISCOVERY_PAGE_SIZE = 24;

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
    const storeIds = result.data.filter((item) => item.entity_type === "store").map((item) => item.entity_id);
    if (!storeIds.length) return result;
    const { data: prices } = await supabase.rpc("get_public_store_prices", { p_store_ids: storeIds });
    const priceByStore = new Map((prices ?? []).map((price) => [price.store_id, Number(price.unit_price)]));
    return { ...result, data: result.data.map((item) => ({ ...item, unit_price: priceByStore.get(item.entity_id) ?? null })) };
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
  return { items, loading, loadingMore, hasMore, error, refresh, loadMore };
}

export function useOrders() {
  const [orders, setOrders] = useState<any[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await supabase.from("orders").select("*,markets(name),order_items(*,stores(name,image_url))").order("created_at", { ascending: false });
    setOrders(result.data ?? []); setError(result.error?.message ?? null); setLoading(false);
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  return { orders, loading, error, refresh };
}

export function useSellerAllocations() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [allocations, setAllocations] = useState<any[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    if (!userId) { setAllocations([]); setLoading(false); return; }
    setLoading(true);
    const result = await supabase.from("order_allocations").select("*,order_items(product_name,product_image_url,unit,unit_price,stores(name,image_url,markets(name)),orders(order_id,order_number,created_at,fulfillment_method,status))").eq("seller_id", userId).order("created_at", { ascending: false });
    setAllocations(result.data ?? []); setError(result.error?.message ?? null); setLoading(false);
  }, [userId]);
  useEffect(() => { void refresh(); }, [refresh]);
  return { allocations, loading, error, refresh };
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
    const channel = supabase.channel(`my-notifications-${userId}`).on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => void refresh()).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [refresh, userId]);
  return { items, loading, refresh };
}
