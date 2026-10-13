import { ScreenHeader } from "../../src/components/ScreenHeader";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Keyboard, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppTextInput } from "../../src/components/AppTextInput";
import { KeyboardAwareView } from "../../src/components/KeyboardAware";
import { ChatOrderCards } from "../../src/components/ChatOrderCards";
import { type ChatOrderContext } from "../../src/lib/chatOrderContext";
import { type RealtimeWatch, useRealtimeRefresh } from "../../src/hooks/useRealtimeRefresh";
import { Colors, Spacing } from "../../src/constants/theme";
import { useAuth } from "../../src/context/AuthContext";
import { supabase } from "../../src/lib/supabase";
import { formatThaiDateTime } from "../../src/lib/date";
import { formatChatClock, shouldShowChatTimeDivider } from "../../src/lib/chatTime";
import { useBadgeCounts } from "../../src/context/BadgeContext";

type ChatHeader = { store_id: number; store_name: string; product_name: string | null; market_name: string; partner_name: string; partner_role: string };
type ChatMessage = { message_id: number; sender_id: string; message: string; created_at: string };

export default function ChatRoom() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  return <ChatRoomContent key={`${session?.user.id}:${id}`} />;
}

function ChatRoomContent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const roomId = Number(id);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { refreshBadges } = useBadgeCounts();
  const [header, setHeader] = useState<ChatHeader | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orderContext, setOrderContext] = useState<{ key: string; items: ChatOrderContext[]; error: boolean } | null>(null);
  const contextKey = `${session?.user.id}:${roomId}`;
  const loadOrderContext = useCallback(async () => {
    if (!session?.user.id || !Number.isSafeInteger(roomId) || roomId <= 0) return;
    const { data, error } = await supabase.rpc("get_chat_order_context", { p_room_id: roomId });
    setOrderContext({ key: contextKey, items: data ?? [], error: !!error });
  }, [contextKey, roomId, session?.user.id]);
  const orderWatches = useMemo<RealtimeWatch[]>(() => [
    { table: "orders", event: "INSERT" }, { table: "orders", event: "UPDATE" },
    { table: "order_allocations", event: "INSERT" }, { table: "order_allocations", event: "UPDATE" },
  ], []);
  useRealtimeRefresh(`chat-orders-${contextKey}`, loadOrderContext, orderWatches, !!header);
  const [sending, setSending] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(Keyboard.isVisible());
  const messageList = useRef<ScrollView>(null);
  const nearBottom = useRef(true);
  const scrollToLatest = useCallback(() => {
    if (nearBottom.current) messageList.current?.scrollToEnd({ animated: false });
  }, []);
  useEffect(() => {
    const shown = Keyboard.addListener("keyboardDidShow", () => { setKeyboardOpen(true); scrollToLatest(); });
    const hidden = Keyboard.addListener("keyboardDidHide", () => setKeyboardOpen(false));
    return () => { shown.remove(); hidden.remove(); };
  }, [scrollToLatest]);

  const loadMessages = useCallback(async () => {
    if (!Number.isSafeInteger(roomId) || roomId <= 0) return;
    const { data } = await supabase.from("chat_messages").select("message_id,sender_id,message,created_at").eq("room_id", roomId).order("created_at");
    setMessages(data ?? []);
  }, [roomId]);

  const markRoomRead = useCallback(async () => {
    if (!Number.isSafeInteger(roomId) || roomId <= 0) return;
    const { error } = await supabase.rpc("mark_my_chat_room_read", { p_room_id: roomId });
    if (!error) await refreshBadges();
  }, [roomId, refreshBadges]);

  const messageWatches = useMemo<RealtimeWatch[]>(() => [
    { event: "INSERT", table: "chat_messages", filter: `room_id=eq.${roomId}` },
  ], [roomId]);
  const refreshMessages = useCallback(async () => {
    await loadMessages();
    await markRoomRead();
  }, [loadMessages, markRoomRead]);
  useRealtimeRefresh(`chat-messages-${contextKey}`, refreshMessages, messageWatches, !!header);
  useFocusEffect(useCallback(() => {
    if (header) void refreshMessages();
  }, [header, refreshMessages]));

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      if (!Number.isSafeInteger(roomId) || roomId <= 0) { setLoading(false); return; }
      const { data, error } = await supabase.rpc("get_chat_room_header", { p_room_id: roomId }).maybeSingle();
      if (!active) return;
      setHeader(error ? null : data);
      if (data) { await Promise.all([loadMessages(), loadOrderContext()]); await markRoomRead(); }
      if (active) setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [roomId, loadMessages, markRoomRead, loadOrderContext]);

  const send = async () => {
    const body = text.trim();
    if (!body || !session || !header || sending) return;
    setSending(true);
    try {
      const { error } = await supabase.from("chat_messages").insert({ room_id: roomId, sender_id: session.user.id, message: body });
      if (error) return Alert.alert("ส่งข้อความไม่สำเร็จ", "กรุณาลองใหม่อีกครั้ง");
      setText((current) => current.trim() === body ? "" : current);
      nearBottom.current = true;
      await loadMessages();
    } finally { setSending(false); }
  };

  return <KeyboardAwareView><View style={styles.root}>
    <ScreenHeader contentInset={0} title={header?.partner_name ?? "ข้อความ"} titleStyle={styles.headerTitle}
      style={{ backgroundColor: Colors.cardBackground, borderBottomWidth: 1, borderBottomColor: Colors.inputBorder }}>
        {header?.product_name ? <Text style={styles.headerDetail} numberOfLines={2}>{header.product_name}</Text> : null}
        <View style={styles.contextLinks}>
        {header ? <TouchableOpacity accessibilityRole="button" onPress={() => router.push(`/store/${header.store_id}` as never)} style={styles.productLink}>
          <Text style={styles.send}>เปิดหน้าสินค้า</Text>
        </TouchableOpacity> : null}
        {orderContext?.key === contextKey && orderContext.items.length > 0 ? <TouchableOpacity accessibilityRole="button" style={styles.productLink}
          onPress={() => { nearBottom.current = false; messageList.current?.scrollTo({ y: 0, animated: true }); }}>
          <Text style={styles.send}>ออเดอร์ ({orderContext.items.length})</Text>
        </TouchableOpacity> : null}
        </View>
    </ScreenHeader>
    {loading ? <Text style={styles.info}>กำลังเปิดบทสนทนา...</Text> : !header ? <Text style={styles.info}>ไม่พบบทสนทนานี้ หรือคุณไม่มีสิทธิ์เข้าถึง</Text> : <>
      <ScrollView ref={messageList} style={styles.messageList} contentContainerStyle={styles.messages}
        onContentSizeChange={scrollToLatest} onLayout={scrollToLatest} scrollEventThrottle={16}
        onScroll={({ nativeEvent: { contentOffset, layoutMeasurement, contentSize } }) => {
          nearBottom.current = contentSize.height - contentOffset.y - layoutMeasurement.height < 80;
        }}
        keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void Promise.all([loadMessages(), loadOrderContext(), markRoomRead()]).finally(() => setRefreshing(false)); }} tintColor={Colors.greenPrimary} />}>
        <ChatOrderCards key={contextKey} items={orderContext?.key === contextKey ? orderContext.items : []}
          error={orderContext?.key === contextKey && orderContext.error} onRetry={() => void loadOrderContext()} />
        {messages.map((message, index) => {
          const mine = message.sender_id === session?.user.id;
          return <React.Fragment key={message.message_id}>
            {shouldShowChatTimeDivider(messages, index) ? <Text style={styles.timeDivider}>{formatThaiDateTime(message.created_at)}</Text> : null}
            <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
              <Text style={mine ? styles.mineText : styles.messageText}>{message.message}</Text>
              <Text style={[styles.messageTime, mine ? styles.mineTime : styles.theirTime]}>{formatChatClock(message.created_at)}</Text>
            </View>
          </React.Fragment>;
        })}
      </ScrollView>
      <View style={[styles.composer, { paddingBottom: keyboardOpen ? 12 : Math.max(insets.bottom, 12) }]}>
        <AppTextInput value={text} onChangeText={setText} style={styles.input} placeholder="พิมพ์ข้อความ..."
          multiline maxLength={2000} scrollIntoViewOnFocus={false}
          onFocus={() => { nearBottom.current = true; scrollToLatest(); }} />
        <TouchableOpacity onPress={() => void send()} accessibilityRole="button" accessibilityLabel="ส่งข้อความ"
          disabled={sending || !text.trim()} style={styles.sendButton}><Text style={styles.send}>{sending ? "…" : "ส่ง"}</Text></TouchableOpacity>
      </View>
    </>}
  </View></KeyboardAwareView>;
}

const styles = StyleSheet.create({
  contextLinks: { flexDirection: "row", gap: 16, flexWrap: "wrap" },
  productLink: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  messageList: { flex: 1 },
  sendButton: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  root: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: Spacing.md, paddingBottom: 12, backgroundColor: Colors.cardBackground, borderBottomWidth: 1, borderBottomColor: Colors.inputBorder },
  headerCopy: { flex: 1 }, headerTitle: { fontFamily: "Kanit_700Bold", color: Colors.greenPrimary, fontSize: 17 }, headerDetail: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, fontSize: 12, lineHeight: 17 },
  info: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, textAlign: "center", marginTop: Spacing.xl },
  messages: { padding: Spacing.md, flexGrow: 1 }, bubble: { padding: 12, borderRadius: 16, maxWidth: "80%", marginBottom: 8 }, mine: { backgroundColor: Colors.greenPrimary, alignSelf: "flex-end" }, theirs: { backgroundColor: Colors.cardBackground, alignSelf: "flex-start" }, messageText: { fontFamily: "Kanit_400Regular", color: Colors.textDark }, mineText: { fontFamily: "Kanit_400Regular", color: Colors.textWhite },
  timeDivider: { alignSelf: "center", fontFamily: "Kanit_400Regular", fontSize: 12, color: Colors.textMuted, marginVertical: 14 },
  messageTime: { fontFamily: "Kanit_400Regular", fontSize: 10, alignSelf: "flex-end", marginTop: 4 }, mineTime: { color: "#DFEFE4" }, theirTime: { color: Colors.textMuted },
  composer: { flexDirection: "row", padding: 12, backgroundColor: Colors.cardBackground, alignItems: "flex-end", gap: 10 }, input: { flex: 1, minHeight: 44, maxHeight: 120, backgroundColor: Colors.inputBackground, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontFamily: "Kanit_400Regular", color: Colors.textDark }, send: { fontFamily: "Kanit_700Bold", color: Colors.greenPrimary },
});
