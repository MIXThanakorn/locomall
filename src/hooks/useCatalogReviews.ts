import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { AppState } from "react-native";
import { useAuth } from "../context/AuthContext";
import { CatalogReviewPage, mergeCatalogReviews, parseCatalogReviewPage, ReviewCursor, ReviewTarget } from "../lib/catalogReviews";
import { supabase } from "../lib/supabase";

export function useCatalogReviews(targetType: ReviewTarget, targetId: number, stars: number | null = null, limit = 10) {
  const { session } = useAuth();
  const catalogKey = `${targetType}:${targetId}:${session?.user.id ?? "guest"}`;
  const key = `${catalogKey}:${stars}:${limit}`;
  const [result, setResult] = useState<{ key: string; catalogKey: string; page: CatalogReviewPage } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const generation = useRef(0);
  const busy = useRef(false);
  const page = result?.key === key ? result.page : null;
  // Keep the same catalog's aggregate visible while changing filters, but never
  // reuse review items (or a different account/target's state) across filters.
  const summary = result?.catalogKey === catalogKey ? result.page : null;
  const request = useCallback(async (append = false, cursor: ReviewCursor | null = null) => {
    if (append && (busy.current || !cursor)) return;
    const version = ++generation.current;
    busy.current = true;
    setError(null);
    setLoading(!append);
    setLoadingMore(append);
    try {
      const { data, error: rpcError } = await supabase.rpc("get_catalog_review_page", {
        p_target_type: targetType, p_target_id: targetId, p_stars: stars, p_limit: limit,
        p_before_created_at: append ? cursor!.created_at : null,
        p_before_review_id: append ? cursor!.review_id : null,
      });
      if (rpcError) throw rpcError;
      const next = parseCatalogReviewPage(data);
      if (generation.current !== version) return;
      setResult((old) => ({ key, catalogKey, page: { ...next,
        items: append && old?.key === key ? mergeCatalogReviews(old.page.items, next.items) : next.items } }));
    } catch {
      if (generation.current === version) setError("โหลดรีวิวไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      if (generation.current === version) { busy.current = false; setLoading(false); setLoadingMore(false); }
    }
  }, [catalogKey, key, limit, stars, targetId, targetType]);
  // Only loadMore depends on the cursor. Loading a page must not re-trigger the
  // focus reset; changing the target, filter or account must reset it.
  const refresh = useCallback(() => request(), [request]);
  const loadMore = useCallback(() => request(true, page?.next_cursor ?? null), [request, page?.next_cursor]);
  useFocusEffect(useCallback(() => {
    void refresh();
    const listener = AppState.addEventListener("change", (state) => { if (state === "active") void refresh(); });
    return () => { generation.current++; busy.current = false; listener.remove(); };
  }, [refresh]));
  return { page, summary, error, loading, loadingMore, refresh, loadMore };
}
