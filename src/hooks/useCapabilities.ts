import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

export type Capabilities = {
  isAdmin: boolean;
  isMarketOwner: boolean;
  isStoreManager: boolean;
  isSeller: boolean;
};

const empty: Capabilities = { isAdmin: false, isMarketOwner: false, isStoreManager: false, isSeller: false };

export function useCapabilities() {
  const { session } = useAuth();
  const [capabilities, setCapabilities] = useState<Capabilities>(empty);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!session?.user.id) {
        if (active) { setCapabilities(empty); setLoading(false); }
        return;
      }
      setLoading(true);
      const userId = session.user.id;
      const [role, markets, stores, listings] = await Promise.all([
        supabase.from("platform_roles").select("role").eq("user_id", userId).maybeSingle(),
        supabase.from("markets").select("market_id").eq("owner_id", userId).limit(1),
        supabase.from("stores").select("store_id").eq("manager_id", userId).limit(1),
        supabase.from("seller_listings").select("listing_id").eq("seller_id", userId).limit(1),
      ]);
      if (active) {
        setCapabilities({
          isAdmin: role.data?.role === "platform_admin",
          isMarketOwner: Boolean(markets.data?.length),
          isStoreManager: Boolean(stores.data?.length),
          isSeller: Boolean(listings.data?.length),
        });
        setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [session?.user.id]);

  return { ...capabilities, loading };
}
