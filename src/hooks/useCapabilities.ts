import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

export type Capabilities = {
  isAdmin: boolean;
  isMarketOwner: boolean;
  isStoreManager: boolean;
  isSeller: boolean;
  canViewSellerOrders: boolean;
};

const empty: Capabilities = { isAdmin: false, isMarketOwner: false, isStoreManager: false, isSeller: false, canViewSellerOrders: false };

export function useCapabilities() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [result, setResult] = useState<{ userId?: string; capabilities: Capabilities; loading: boolean }>({ capabilities: empty, loading: true });

  useFocusEffect(useCallback(() => {
    let active = true;
    async function load() {
      if (!userId) {
        if (active) setResult({ userId, capabilities: empty, loading: false });
        return;
      }
      setResult((current) => ({ userId, capabilities: current.userId === userId ? current.capabilities : empty, loading: true }));
      const [role, markets, stores, listings, approvedStores, approvedStoreListings] = await Promise.all([
        supabase.from("platform_roles").select("role").eq("user_id", userId).maybeSingle(),
        supabase.from("markets").select("market_id").eq("owner_id", userId).limit(1),
        supabase.from("stores").select("store_id").eq("manager_id", userId).limit(1),
        supabase.from("seller_listings").select("listing_id").eq("seller_id", userId).limit(1),
        supabase.from("stores").select("store_id").eq("manager_id", userId).eq("approval_status", "approved").limit(1),
        supabase.from("seller_listings").select("listing_id,stores!inner(store_id)").eq("seller_id", userId).eq("stores.approval_status", "approved").limit(1),
      ]);
      if (active) {
        setResult({ userId, capabilities: {
          isAdmin: role.data?.role === "platform_admin",
          isMarketOwner: Boolean(markets.data?.length),
          isStoreManager: Boolean(stores.data?.length),
          isSeller: Boolean(listings.data?.length),
          canViewSellerOrders: Boolean(approvedStores.data?.length || approvedStoreListings.data?.length),
        }, loading: false });
      }
    }
    void load();
    return () => { active = false; };
  }, [userId]));

  return { ...(result.userId === userId ? result.capabilities : empty), loading: result.userId !== userId || result.loading };
}
