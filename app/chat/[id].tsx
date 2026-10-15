import { ScreenHeader } from "../../src/components/ScreenHeader";
import { LoadNotice } from "../../src/components/LoadNotice";
import { useChatHistory } from "../../src/hooks/useChatHistory";
import { Ionicons } from "@expo/vector-icons";
import { ContextImage } from "../../src/components/ContextImage";
import { chatIsNearBottom, sameChatGroup } from "../../src/lib/chatPresentation";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Keyboard, Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppTextInput } from "../../src/components/AppTextInput";
import { KeyboardAwareView } from "../../src/components/KeyboardAware";
import { ChatOrderCards } from "../../src/components/ChatOrderCards";
import { type ChatOrderContext } from "../../src/lib/chatOrderContext";
import { type RealtimeWatch, useRealtimeRefresh } from "../../src/hooks/useRealtimeRefresh";
import { Colors, Spacing } from "../../src/constants/theme";
import { useAuth } from "../../src/context/AuthContext";
import { supabase } from "../../src/lib/supabase";
import { translateDatabaseError } from "../../src/lib/databaseError";
import { formatThaiDateTime } from "../../src/lib/date";
import { formatChatClock, shouldShowChatTimeDivider } from "../../src/lib/chatTime";
import { useBadgeCounts } from "../../src/context/BadgeContext";

type ChatHeader = { store_id: number; store_name: string; product_name: string | null; market_name: string; partner_name: string; partner_role: string };

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
  const [visuals, setVisuals] = useState<{ partner_image_url: string | null; product_image_url: string | null } | null>(null);
  const { messages, error: messagesError, hasOlder, loadingOlder, loadMessages, loadOlder } = useChatHistory(roomId);
  const [headerError, setHeaderError] = useState(false);
  const [headerRetry, setHeaderRetry] = useState(0);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orderContext, setOrderContext] = useState<{ key: string; items: ChatOrderContext[]; error: boolean } | null>(null);
  const contextKey = `${session?.user.id}:${roomId}`;
  const loadVisuals = useCallback(async () => {
    if (!session?.user.id || !Number.isSafeInteger(roomId) || roomId <= 0) return;
    const { data } = await supabase.rpc("get_my_chat_visuals", { p_room_ids: [roomId] });
    setVisuals(data?.[0] ?? null);
  }, [roomId, session?.user.id]);
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
  const userScrolling = useRef(false);
  const [showLatest, setShowLatest] = useState(false);
  const listMetrics = useRef({ height: 0, offset: 0 });
  const prependAnchor = useRef<{ height: number; offset: number } | null>(null);
  const requestOlder = () => {
    if (!hasOlder || loadingOlder || prependAnchor.current) return;
    nearBottom.current = false;
    prependAnchor.current = { ...listMetrics.current };
    void loadOlder().then((changed) => { if (!changed) prependAnchor.current = null; });
  };
  const scrollToLatest = useCallback(() => {
    // Layout / keyboard scrolling must not overwrite the user's near-bottom intent.
    if (nearBottom.current) messageList.current?.scrollToEnd({ animated: false });
  }, []);
  const goToLatest = () => {
    nearBottom.current = true;
    userScrolling.current = false;
    setShowLatest(false);
    messageList.current?.scrollToEnd({ animated: true });
  };
  useEffect(() => {
    const shown = Keyboard.addListener("keyboardDidShow", () => { setKeyboardOpen(true); scrollToLatest(); });
    const hidden = Keyboard.addListener("keyboardDidHide", () => { setKeyboardOpen(false); scrollToLatest(); });
    return () => { shown.remove(); hidden.remove(); };
  }, [scrollToLatest]);

  const markRoomRead = useCallback(async () => {
    if (!Number.isSafeInteger(roomId) || roomId <= 0) return;
    const { error } = await supabase.rpc("mark_my_chat_room_read", { p_room_id: roomId });
    if (!error) await refreshBadges();
  }, [roomId, refreshBadges]);

  const messageWatches = useMemo<RealtimeWatch[]>(() => [
    { event: "INSERT", table: "chat_messages", filter: `room_id=eq.${roomId}` },
  ], [roomId]);
  const refreshMessages = useCallback(async () => {
    if (await loadMessages()) await markRoomRead();
  }, [loadMessages, markRoomRead]);
  useRealtimeRefresh(`chat-messages-${contextKey}`, refreshMessages, messageWatches, !!header);
  useFocusEffect(useCallback(() => {
    if (header) { void refreshMessages(); void loadVisuals(); }
  }, [header, refreshMessages, loadVisuals]));

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      if (!Number.isSafeInteger(roomId) || roomId <= 0) { setLoading(false); return; }
      try {
      const { data, error } = await supabase.rpc("get_chat_room_header", { p_room_id: roomId }).maybeSingle();
      if (!active) return;
      setHeaderError(!!error);
      setHeader(error ? null : data);
      if (data) { await Promise.all([refreshMessages(), loadOrderContext(), loadVisuals()]); }
      } catch { if (active) setHeaderError(true); }
      if (active) setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [roomId, refreshMessages, loadOrderContext, loadVisuals, headerRetry]);

  const send = async () => {
    const body = text.trim();
    if (!body || !session || !header || sending) return;
    setSending(true);
    try {
      const { error } = await supabase.from("chat_messages").insert({ room_id: roomId, sender_id: session.user.id, message: body });
      if (error) return Alert.alert("ส่งข้อความไม่สำเร็จ", translateDatabaseError(error));
      setText((current) => current.trim() === body ? "" : current);
      nearBottom.current = true;
      userScrolling.current = false;
      setShowLatest(false);
      await loadMessages();
    } catch { Alert.alert("ส่งข้อความไม่สำเร็จ", "ตรวจสอบการเชื่อมต่อแล้วลองใหม่"); }
    finally { setSending(false); }
  };

  return <KeyboardAwareView><View style={styles.root}>
    <ScreenHeader contentInset={0} title={header?.partner_name ?? "ข้อความ"} titleStyle={styles.headerTitle}
      leading={header ? <ContextImage uri={visuals?.partner_image_url} name={header.partner_name} person size={36} /> : null}
      rightAction={orderContext?.key === contextKey && orderContext.items.length > 0 ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="ดูออเดอร์ที่เกี่ยวข้อง" style={styles.sendButton}
        onPress={() => { nearBottom.current = false; setShowLatest(true); messageList.current?.scrollTo({ y: 0, animated: true }); }}><Ionicons name="receipt-outline" size={22} color={Colors.greenPrimary} /></TouchableOpacity> : null}
      style={{ backgroundColor: Colors.cardBackground, borderBottomWidth: 1, borderBottomColor: Colors.inputBorder }}>
        {header ? <TouchableOpacity accessibilityRole="button" accessibilityLabel={`เปิดหน้าสินค้า ${header.product_name || "สินค้า"}`} onPress={() => router.push(`/store/${header.store_id}` as never)} style={styles.productLink}>
          <ContextImage uri={visuals?.product_image_url} name={header.product_name || "สินค้า"} size={40} />
          <View style={styles.productCopy}><Text style={styles.productName} numberOfLines={1}>{header.product_name || "สินค้า"}</Text><Text style={styles.headerDetail}>เปิดหน้าสินค้า</Text></View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </TouchableOpacity> : null}
    </ScreenHeader>
    {loading ? <Text style={styles.info}>กำลังเปิดบทสนทนา...</Text> : headerError ? <LoadNotice onRetry={() => setHeaderRetry((value) => value + 1)} /> : !header ? <Text style={styles.info}>ไม่พบบทสนทนานี้ หรือคุณไม่มีสิทธิ์เข้าถึง</Text> : <>
      <ScrollView ref={messageList} style={styles.messageList} contentContainerStyle={styles.messages}
        onContentSizeChange={(_, height) => {
          const anchor = prependAnchor.current;
          listMetrics.current.height = height;
          if (anchor) { messageList.current?.scrollTo({ y: anchor.offset + height - anchor.height, animated: false }); prependAnchor.current = null; }
          else scrollToLatest();
        }} onLayout={scrollToLatest} scrollEventThrottle={16}
        onScrollBeginDrag={() => { userScrolling.current = true; }}
        onMomentumScrollBegin={() => { userScrolling.current = true; }}
        onScrollEndDrag={() => { userScrolling.current = false; }}
        onMomentumScrollEnd={() => { userScrolling.current = false; }}
        onScroll={({ nativeEvent: { contentOffset, layoutMeasurement, contentSize } }) => {
          listMetrics.current.offset = contentOffset.y;
          if (!userScrolling.current) return;
          nearBottom.current = chatIsNearBottom(contentOffset.y, layoutMeasurement.height, contentSize.height);
          setShowLatest(!nearBottom.current);
          if (contentOffset.y < 60) requestOlder();
        }}
        keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void Promise.all([loadMessages(), loadOrderContext(), loadVisuals(), markRoomRead()]).finally(() => setRefreshing(false)); }} tintColor={Colors.greenPrimary} />}>
        <ChatOrderCards key={contextKey} items={orderContext?.key === contextKey ? orderContext.items : []}
          error={orderContext?.key === contextKey && orderContext.error} onRetry={() => void loadOrderContext()} />
        {messagesError ? <LoadNotice onRetry={() => void refreshMessages()} /> : null}
        {hasOlder ? <TouchableOpacity accessibilityRole="button" style={styles.latest} disabled={loadingOlder} onPress={requestOlder}><Text style={styles.send}>{loadingOlder ? "กำลังโหลด..." : "ดูข้อความก่อนหน้า"}</Text></TouchableOpacity> : null}
        {!messages.length && !messagesError ? <Text style={styles.info}>ยังไม่มีข้อความ เริ่มสนทนาได้เลย</Text> : null}
        {messages.map((message, index) => {
          const mine = message.sender_id === session?.user.id;
          const grouped = sameChatGroup(messages[index - 1], message);
          const groupEnd = !sameChatGroup(message, messages[index + 1]);
          return <React.Fragment key={message.message_id}>
            {shouldShowChatTimeDivider(messages, index) ? <Text style={styles.timeDivider}>{formatThaiDateTime(message.created_at)}</Text> : null}
            <View style={[styles.messageRow, mine && styles.mineRow, { marginTop: grouped ? 0 : 8 }]}>
              {!mine ? <View style={styles.messageAvatar}>{groupEnd ? <ContextImage uri={visuals?.partner_image_url} name={header.partner_name} person size={28} /> : null}</View> : null}
              <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
              <Text style={mine ? styles.mineText : styles.messageText}>{message.message}</Text>
              <Text style={[styles.messageTime, mine ? styles.mineTime : styles.theirTime]}>{formatChatClock(message.created_at)}</Text>
              </View>
            </View>
          </React.Fragment>;
        })}
      </ScrollView>
      {showLatest ? <TouchableOpacity accessibilityRole="button" onPress={goToLatest} style={styles.latest}><Ionicons name="arrow-down" size={16} color={Colors.greenPrimary} /><Text style={styles.send}>ข้อความล่าสุด</Text></TouchableOpacity> : null}
      <View style={[styles.composer, { paddingBottom: keyboardOpen ? 12 : Math.max(insets.bottom, 12) }]}>
        <AppTextInput value={text} onChangeText={setText} style={styles.input} placeholder="พิมพ์ข้อความ..."
          multiline maxLength={2000} scrollIntoViewOnFocus={false}
          onFocus={scrollToLatest} />
        <TouchableOpacity onPress={() => void send()} accessibilityRole="button" accessibilityLabel="ส่งข้อความ"
          disabled={sending || !text.trim()} style={[styles.sendButton, styles.sendCircle, (!text.trim() || sending) && styles.sendDisabled]}>{sending ? <Text style={styles.mineText}>…</Text> : <Ionicons name="send" size={20} color={Colors.textWhite} />}</TouchableOpacity>
      </View>
    </>}
  </View></KeyboardAwareView>;
}

const styles = StyleSheet.create({
  productLink: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8, padding: 6, borderRadius: 12, backgroundColor: Colors.inputBackground },
  productCopy: { flex: 1 }, productName: { fontFamily: "Kanit_500Medium", color: Colors.textDark, fontSize: 13 },
  messageRow: { flexDirection: "row", alignItems: "flex-end", gap: 6, marginBottom: 3 }, mineRow: { justifyContent: "flex-end" }, messageAvatar: { width: 28 },
  latest: { alignSelf: "center", flexDirection: "row", gap: 6, alignItems: "center", minHeight: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: Colors.cardBackground, borderWidth: 1, borderColor: Colors.inputBorder, marginVertical: 4 },
  sendCircle: { borderRadius: 22, backgroundColor: Colors.greenPrimary }, sendDisabled: { opacity: 0.4 },
  messageList: { flex: 1 },
  sendButton: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  root: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: Spacing.md, paddingBottom: 12, backgroundColor: Colors.cardBackground, borderBottomWidth: 1, borderBottomColor: Colors.inputBorder },
  headerCopy: { flex: 1 }, headerTitle: { fontFamily: "Kanit_700Bold", color: Colors.greenPrimary, fontSize: 17 }, headerDetail: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, fontSize: 12, lineHeight: 17 },
  info: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, textAlign: "center", marginTop: Spacing.xl },
  messages: { padding: Spacing.md, flexGrow: 1 }, bubble: { padding: 12, borderRadius: 16, maxWidth: "80%" }, mine: { backgroundColor: Colors.greenPrimary, alignSelf: "flex-end" }, theirs: { backgroundColor: Colors.cardBackground, alignSelf: "flex-start" }, messageText: { fontFamily: "Kanit_400Regular", color: Colors.textDark }, mineText: { fontFamily: "Kanit_400Regular", color: Colors.textWhite },
  timeDivider: { alignSelf: "center", fontFamily: "Kanit_400Regular", fontSize: 12, color: Colors.textMuted, marginVertical: 14 },
  messageTime: { fontFamily: "Kanit_400Regular", fontSize: 10, alignSelf: "flex-end", marginTop: 4 }, mineTime: { color: "#DFEFE4" }, theirTime: { color: Colors.textMuted },
  composer: { flexDirection: "row", padding: 12, backgroundColor: Colors.cardBackground, alignItems: "flex-end", gap: 10 }, input: { flex: 1, minHeight: 44, maxHeight: 120, backgroundColor: Colors.inputBackground, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontFamily: "Kanit_400Regular", color: Colors.textDark }, send: { fontFamily: "Kanit_700Bold", color: Colors.greenPrimary },
});
