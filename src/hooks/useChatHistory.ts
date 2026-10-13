import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { type ChatMessage, mergeChatMessages } from "../lib/chatHistory";

const PAGE_SIZE = 40;
export function useChatHistory(roomId: number) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const current = useRef<ChatMessage[]>([]);
  const initialized = useRef(false);
  const pending = useRef<Promise<boolean> | null>(null);
  const olderBusy = useRef(false);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const apply = useCallback((incoming: ChatMessage[]) => {
    if (!active.current) return;
    current.current = mergeChatMessages(current.current, incoming);
    setMessages(current.current);
  }, []);
  const loadMessages = useCallback((): Promise<boolean> => {
    if (pending.current) return pending.current;
    const task = async () => {
      try {
        if (!Number.isSafeInteger(roomId) || roomId <= 0) return false;
        if (!initialized.current || !current.current.length) {
          const { data, error } = await supabase.rpc("get_chat_messages_page", { p_room_id: roomId, p_limit: PAGE_SIZE + 1 });
          if (error) throw error;
          if (!active.current) return false;
          apply((data ?? []).slice(0, PAGE_SIZE));
          setHasOlder((data?.length ?? 0) > PAGE_SIZE);
          initialized.current = true;
        } else {
          // Catch up all missed pages after reconnect, without re-reading history.
          let more = true;
          while (more && active.current) {
            const last = current.current[current.current.length - 1];
            const { data, error } = await supabase.rpc("get_chat_messages_page", { p_room_id: roomId, p_limit: PAGE_SIZE + 1, p_cursor_at: last.created_at, p_cursor_id: last.message_id, p_newer: true });
            if (error) throw error;
            if (!active.current) return false;
            apply((data ?? []).slice(0, PAGE_SIZE));
            more = (data?.length ?? 0) > PAGE_SIZE;
          }
        }
        if (active.current) setError(false);
        return active.current;
      } catch {
        if (active.current) setError(true);
        return false;
      } finally { pending.current = null; }
    };
    pending.current = task();
    return pending.current;
  }, [apply, roomId]);
  const loadOlder = useCallback(async () => {
    if (olderBusy.current || !hasOlder || !current.current.length) return false;
    olderBusy.current = true;
    setLoadingOlder(true);
    try {
      const first = current.current[0];
      const { data, error } = await supabase.rpc("get_chat_messages_page", { p_room_id: roomId, p_limit: PAGE_SIZE + 1, p_cursor_at: first.created_at, p_cursor_id: first.message_id });
      if (error) throw error;
      if (!active.current) return false;
      apply((data ?? []).slice(0, PAGE_SIZE));
      setHasOlder((data?.length ?? 0) > PAGE_SIZE);
      setError(false);
      return !!data?.length;
    } catch { if (active.current) setError(true); return false; }
    finally { olderBusy.current = false; if (active.current) setLoadingOlder(false); }
  }, [apply, hasOlder, roomId]);
  return { messages, error, hasOlder, loadingOlder, loadMessages, loadOlder };
}
