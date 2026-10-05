import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { AppState } from "react-native";
import { supabase } from "../lib/supabase";

export type RealtimeWatch = {
  table: string;
  event: "INSERT" | "UPDATE";
  filter?: string;
};

// Realtime is an invalidation signal: always re-read through the existing RLS
// query instead of trusting event payloads or maintaining a second data cache.
export function useRealtimeRefresh(
  channelName: string,
  refresh: () => Promise<unknown> | void,
  watches: readonly RealtimeWatch[],
  enabled = true,
) {
  useFocusEffect(useCallback(() => {
    if (!enabled || watches.length === 0) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let subscribedOnce = false;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { void Promise.resolve().then(refresh).catch((error) => console.warn("Realtime refresh failed", error)); }, 180);
    };
    const channel = supabase.channel(channelName);
    for (const watch of watches) {
      channel.on("postgres_changes", { schema: "public", ...watch }, schedule);
    }
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED" && subscribedOnce) schedule();
      if (status === "SUBSCRIBED") subscribedOnce = true;
    });
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") schedule();
    });
    return () => {
      if (timer) clearTimeout(timer);
      appState.remove();
      void supabase.removeChannel(channel);
    };
  }, [channelName, enabled, refresh, watches]));
}
