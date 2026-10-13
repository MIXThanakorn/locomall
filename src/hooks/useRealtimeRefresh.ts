import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { AppState } from "react-native";
import { supabase } from "../lib/supabase";
import { realtimeChannelName } from "../lib/realtimeChannelName";
import { createRefreshQueue } from "../lib/refreshQueue";

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
    let fallback: ReturnType<typeof setInterval> | undefined;
    let active = true;
    const queue = createRefreshQueue(refresh, () => console.warn("Realtime refresh failed"));
    const schedule = () => {
      if (!active) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { if (active) void queue.run(); }, 180);
    };
    const channel = supabase.channel(realtimeChannelName(channelName));
    for (const watch of watches) {
      channel.on("postgres_changes", { schema: "public", ...watch }, schedule);
    }
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        if (fallback) clearInterval(fallback);
        fallback = undefined;
        schedule(); // Also close the initial fetch -> subscription race.
      } else if (!fallback && active) {
        fallback = setInterval(() => { if (AppState.currentState === "active") schedule(); }, 15000);
      }
    });
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") schedule();
    });
    return () => {
      active = false;
      queue.stop();
      if (timer) clearTimeout(timer);
      if (fallback) clearInterval(fallback);
      appState.remove();
      void supabase.removeChannel(channel);
    };
  }, [channelName, enabled, refresh, watches]));
}
