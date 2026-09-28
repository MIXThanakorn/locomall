/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

export type NearbyResult = { entity_type: string; entity_id: number; market_id: number; name: string; description: string; image_url: string | null; distance_km: number | null; radius_km: number; available_stock: number };

export function useNearby(query = "", kind = "all") {
  const { deviceLocation, deviceLocationReady } = useAuth();
  const [items, setItems] = useState<NearbyResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    if (!deviceLocationReady) return;
    setLoading(true);
    const { data, error: requestError } = await supabase.rpc("discover_nearby", { p_query: query || undefined, p_kind: kind, p_limit: 40, p_lat: deviceLocation?.latitude, p_lng: deviceLocation?.longitude });
    setItems((data ?? []) as NearbyResult[]); setError(requestError?.message ?? null); setLoading(false);
  }, [query, kind, deviceLocation, deviceLocationReady]);
  useEffect(() => { const timer = setTimeout(() => void refresh(), 250); return () => clearTimeout(timer); }, [refresh]);
  return { items, loading, error, refresh };
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
  const [items, setItems] = useState<any[]>([]); const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => { const r = await supabase.from("notifications").select("*").order("created_at", { ascending: false }); setItems(r.data ?? []); setLoading(false); }, []);
  useEffect(() => {
    void refresh();
    const channel = supabase.channel("my-notifications").on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => void refresh()).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [refresh]);
  return { items, loading, refresh };
}
