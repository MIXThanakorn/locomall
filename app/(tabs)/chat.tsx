import { Ionicons } from "@expo/vector-icons";
import { Redirect, useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BorderRadius, Colors, Spacing } from "../../src/constants/theme";
import { useAuth } from "../../src/context/AuthContext";
import { formatThaiDateTime } from "../../src/lib/date";
import { supabase } from "../../src/lib/supabase";
import type { Database } from "../../src/types/database";

type ChatInboxRow = Database["public"]["Functions"]["get_my_chat_inbox"]["Returns"][number];

export default function ChatList() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, loading: authLoading } = useAuth();
  const userId = session?.user.id;
  const [rooms, setRooms] = useState<ChatInboxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!userId) { setRooms([]); setLoading(false); return; }
    setLoading(true);
    const result = await supabase.rpc("get_my_chat_inbox");
    setRooms(result.data ?? []);
    setError(Boolean(result.error));
    setLoading(false);
  }, [userId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel(`chat-inbox-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [userId, load]);

  if (authLoading) return <View style={styles.center}><ActivityIndicator color={Colors.greenPrimary} /></View>;
  if (!session) return <Redirect href="/(auth)/sign-in" />;

  return <View style={styles.root}>
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <Text style={styles.title}>แชต</Text>
      <Text style={styles.subtitle}>ดูข้อความและประวัติการคุยกับร้านค้า</Text>
    </View>
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}>
      {error ? <TouchableOpacity onPress={() => void load()}><Text style={styles.error}>โหลดแชตไม่สำเร็จ แตะเพื่อลองใหม่</Text></TouchableOpacity> : null}
      {!loading && !error && rooms.length === 0 ? <View style={styles.empty}><Ionicons name="chatbubbles-outline" size={40} color={Colors.greenPrimary} /><Text style={styles.emptyTitle}>ยังไม่มีบทสนทนา</Text><Text style={styles.emptyText}>เปิดหน้าร้านค้าที่สนใจแล้วกดแชตเพื่อเริ่มคุย</Text></View> : null}
      {rooms.map((room) => <TouchableOpacity key={room.room_id} style={styles.room} activeOpacity={0.8} onPress={() => router.push(`/chat/${room.room_id}` as never)}>
        <View style={styles.avatar}><Ionicons name="chatbubble-ellipses-outline" size={24} color={Colors.greenPrimary} /></View>
        <View style={styles.roomCopy}>
          <View style={styles.row}><Text style={styles.name} numberOfLines={1}>{room.partner_name}</Text>{room.last_message_at ? <Text style={styles.date}>{formatThaiDateTime(room.last_message_at)}</Text> : null}</View>
          <Text style={styles.store} numberOfLines={1}>{room.partner_role} · ร้าน {room.store_name}</Text>
          <Text style={styles.preview} numberOfLines={1}>{room.last_message ? `${room.last_sender_id === userId ? "คุณ: " : ""}${room.last_message}` : `สินค้า ${room.product_name || "จากชุมชน"} · เริ่มสนทนาได้เลย`}</Text>
        </View>
        {room.unread_count > 0 ? <View style={styles.unread}><Text style={styles.unreadText}>{room.unread_count > 99 ? "99+" : room.unread_count}</Text></View> : null}
      </TouchableOpacity>)}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background }, center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, backgroundColor: Colors.goldPrimary, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  title: { fontFamily: "Kanit_700Bold", fontSize: 26, color: Colors.greenPrimary }, subtitle: { fontFamily: "Kanit_400Regular", color: Colors.greenDark },
  content: { padding: Spacing.lg, paddingBottom: 100, flexGrow: 1 },
  room: { flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: Colors.cardBackground, borderWidth: 1, borderColor: Colors.inputBorder, padding: 13, borderRadius: BorderRadius.lg, marginBottom: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "#EAF1E9" },
  roomCopy: { flex: 1 }, row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 6 },
  name: { flex: 1, fontFamily: "Kanit_700Bold", color: Colors.textDark, fontSize: 15 }, date: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, fontSize: 10 },
  store: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary, fontSize: 12 }, preview: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, fontSize: 13, marginTop: 2 },
  unread: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 5, backgroundColor: Colors.danger, alignItems: "center", justifyContent: "center" }, unreadText: { color: Colors.textWhite, fontFamily: "Kanit_700Bold", fontSize: 11 },
  empty: { alignItems: "center", marginTop: 56 }, emptyTitle: { fontFamily: "Kanit_700Bold", fontSize: 18, color: Colors.textDark, marginTop: 10 }, emptyText: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, marginTop: 4, textAlign: "center" },
  error: { fontFamily: "Kanit_400Regular", color: Colors.danger, textAlign: "center", marginBottom: 12 },
});
