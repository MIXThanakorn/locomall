import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppTextInput } from "../../src/components/AppTextInput";
import { KeyboardAwareView } from "../../src/components/KeyboardAware";
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
  const roomId = Number(id);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { refreshBadges } = useBadgeCounts();
  const [header, setHeader] = useState<ChatHeader | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      if (!Number.isSafeInteger(roomId) || roomId <= 0) { setLoading(false); return; }
      const { data, error } = await supabase.rpc("get_chat_room_header", { p_room_id: roomId }).maybeSingle();
      if (!active) return;
      setHeader(error ? null : data);
      if (data) { await loadMessages(); await markRoomRead(); }
      if (active) setLoading(false);
    };
    void load();
    const channel = supabase.channel(`chat-${roomId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `room_id=eq.${roomId}` }, () => { void loadMessages(); void markRoomRead(); }).subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [roomId, loadMessages, markRoomRead]);

  const send = async () => {
    const body = text.trim();
    if (!body || !session || !header) return;
    const { error } = await supabase.from("chat_messages").insert({ room_id: roomId, sender_id: session.user.id, message: body });
    if (error) return Alert.alert("ส่งข้อความไม่สำเร็จ", "กรุณาลองใหม่อีกครั้ง");
    setText("");
    await loadMessages();
  };

  return <KeyboardAwareView><View style={styles.root}>
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <TouchableOpacity onPress={() => router.back()} accessibilityLabel="กลับ"><Ionicons name="arrow-back" size={24} color={Colors.greenPrimary} /></TouchableOpacity>
      <View style={styles.headerCopy}>
        <Text style={styles.headerTitle} numberOfLines={1}>{header ? `แชตกับ ${header.partner_name}` : "ข้อความ"}</Text>
        {header ? <Text style={styles.headerDetail} numberOfLines={2}>{header.partner_role} · ร้าน {header.store_name}{header.product_name ? ` · สินค้า ${header.product_name}` : ""}{header.market_name ? ` · ตลาด ${header.market_name}` : ""}</Text> : null}
      </View>
    </View>
    {loading ? <Text style={styles.info}>กำลังเปิดบทสนทนา...</Text> : !header ? <Text style={styles.info}>ไม่พบบทสนทนานี้ หรือคุณไม่มีสิทธิ์เข้าถึง</Text> : <>
      <ScrollView contentContainerStyle={styles.messages} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
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
      <View style={styles.composer}><AppTextInput value={text} onChangeText={setText} style={styles.input} placeholder="พิมพ์ข้อความ..." /><TouchableOpacity onPress={() => void send()} accessibilityLabel="ส่งข้อความ"><Text style={styles.send}>ส่ง</Text></TouchableOpacity></View>
    </>}
  </View></KeyboardAwareView>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: Spacing.md, paddingBottom: 12, backgroundColor: Colors.cardBackground, borderBottomWidth: 1, borderBottomColor: Colors.inputBorder },
  headerCopy: { flex: 1 }, headerTitle: { fontFamily: "Kanit_700Bold", color: Colors.greenPrimary, fontSize: 17 }, headerDetail: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, fontSize: 12, lineHeight: 17 },
  info: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, textAlign: "center", marginTop: Spacing.xl },
  messages: { padding: Spacing.md, flexGrow: 1 }, bubble: { padding: 12, borderRadius: 16, maxWidth: "80%", marginBottom: 8 }, mine: { backgroundColor: Colors.greenPrimary, alignSelf: "flex-end" }, theirs: { backgroundColor: Colors.cardBackground, alignSelf: "flex-start" }, messageText: { fontFamily: "Kanit_400Regular", color: Colors.textDark }, mineText: { fontFamily: "Kanit_400Regular", color: Colors.textWhite },
  timeDivider: { alignSelf: "center", fontFamily: "Kanit_400Regular", fontSize: 12, color: Colors.textMuted, marginVertical: 14 },
  messageTime: { fontFamily: "Kanit_400Regular", fontSize: 10, alignSelf: "flex-end", marginTop: 4 }, mineTime: { color: "#DFEFE4" }, theirTime: { color: Colors.textMuted },
  composer: { flexDirection: "row", padding: 12, backgroundColor: Colors.cardBackground, alignItems: "center", gap: 10 }, input: { flex: 1, backgroundColor: Colors.inputBackground, borderRadius: 99, paddingHorizontal: 16, fontFamily: "Kanit_400Regular", color: Colors.textDark }, send: { fontFamily: "Kanit_700Bold", color: Colors.greenPrimary },
});
