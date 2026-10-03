/* eslint-disable react-hooks/set-state-in-effect */
import { usePathname } from "expo-router";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { useAuth } from "./AuthContext";
import { supabase } from "../lib/supabase";

type BadgeCounts = {
  cartCount: number;
  unreadCount: number;
  unreadChatCount: number;
  refreshBadges: () => Promise<void>;
};

const BadgeContext = createContext<BadgeCounts | null>(null);

export function BadgeProvider({ children }: React.PropsWithChildren) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const pathname = usePathname();
  const requestId = useRef(0);
  const [cartCount, setCartCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  const refreshBadges = useCallback(async () => {
    const currentRequest = ++requestId.current;
    if (!userId) {
      setCartCount(0);
      setUnreadCount(0);
      setUnreadChatCount(0);
      return;
    }
    const [cartResult, notificationResult, chatResult] = await Promise.all([
      supabase.from("carts").select("cart_items(cart_item_id)").eq("buyer_id", userId).maybeSingle(),
      supabase.from("notifications").select("notification_id", { count: "exact", head: true })
        .eq("user_id", userId).neq("category", "chat").is("read_at", null),
      supabase.from("notifications").select("notification_id", { count: "exact", head: true })
        .eq("user_id", userId).eq("category", "chat").is("read_at", null),
    ]);
    if (currentRequest !== requestId.current) return;
    if (!cartResult.error) setCartCount(cartResult.data?.cart_items?.length ?? 0);
    if (!notificationResult.error) setUnreadCount(notificationResult.count ?? 0);
    if (!chatResult.error) setUnreadChatCount(chatResult.count ?? 0);
  }, [userId]);

  useEffect(() => { void refreshBadges(); }, [refreshBadges, pathname]);
  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel(`badge-notifications-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => void refreshBadges()).subscribe();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshBadges();
    });
    return () => { subscription.remove(); void supabase.removeChannel(channel); };
  }, [userId, refreshBadges]);

  const value = useMemo(() => ({ cartCount, unreadCount, unreadChatCount, refreshBadges }),
    [cartCount, unreadCount, unreadChatCount, refreshBadges]);
  return <BadgeContext.Provider value={value}>{children}</BadgeContext.Provider>;
}

export function useBadgeCounts() {
  const value = useContext(BadgeContext);
  if (!value) throw new Error("useBadgeCounts must be used inside BadgeProvider");
  return value;
}
