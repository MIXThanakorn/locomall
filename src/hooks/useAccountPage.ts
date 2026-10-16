import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useAuth } from "../context/AuthContext";

export type PageCursor = { created_at: string; id: number };
export const COMMERCE_PAGE_SIZE = 25;
export function useAccountPage<T>(fetchPage: (userId: string, cursor: PageCursor | null) => Promise<T[]>, cursorOf: (row: T) => PageCursor, scope = "") {
  const { session } = useAuth();
  const userId = session?.user.id;
  const key = `${userId ?? "guest"}:${scope}`;
  const [state, setState] = useState<{ userId?: string; key?: string; rows: T[]; loading: boolean; error: boolean; hasMore: boolean }>({ rows: [], loading: true, error: false, hasMore: false });
  const generation = useRef(0);
  const busy = useRef(false);
  const current = useRef<{ userId?: string; key?: string; rows: T[]; hasMore: boolean }>({ rows: [], hasMore: false });
  const [loadingMore, setLoadingMore] = useState(false);
  const run = useCallback(async (append: boolean) => {
    if (append && (busy.current || current.current.userId !== userId || current.current.key !== key || !current.current.hasMore)) return;
    const version = ++generation.current;
    busy.current = true;
    setLoadingMore(append);
    const previous = current.current.key === key ? current.current.rows : [];
    setState(s => ({ userId, key, rows: s.key === key ? s.rows : [], loading: !append, error: false, hasMore: s.key === key && s.hasMore }));
    try {
      const page = userId ? await fetchPage(userId, append && previous.length ? cursorOf(previous[previous.length - 1]) : null) : [];
      if (version !== generation.current) return;
      const added = page.slice(0, COMMERCE_PAGE_SIZE);
      const known = new Set(previous.map(row => cursorOf(row).id));
      const rows = append ? [...previous, ...added.filter(row => !known.has(cursorOf(row).id))] : added;
      const hasMore = page.length > COMMERCE_PAGE_SIZE;
      current.current = { userId, key, rows, hasMore };
      setState({ userId, key, rows, loading: false, error: false, hasMore });
    } catch {
      if (version === generation.current) setState(s => ({ ...s, loading: false, error: true }));
    } finally { if (version === generation.current) { busy.current = false; setLoadingMore(false); } }
  }, [userId, fetchPage, cursorOf, key]);
  const refresh = useCallback(() => run(false), [run]);
  const loadMore = useCallback(() => run(true), [run]);
  useFocusEffect(useCallback(() => { void refresh(); return () => { generation.current++; busy.current = false; }; }, [refresh]));
  const scoped = state.userId === userId && state.key === key;
  return { rows: scoped ? state.rows : [], loading: !scoped || state.loading, error: scoped && state.error,
    hasMore: scoped && state.hasMore, loadingMore: scoped && loadingMore, refresh, loadMore };
}
