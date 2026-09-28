import { Ionicons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, AppState, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BorderRadius, Colors, Spacing } from "../../src/constants/theme";
import { useAuth } from "../../src/context/AuthContext";
import { useNotifications } from "../../src/hooks/useCommerce";
import { getPushPermissionState, notificationPath, openNotificationSettings, PushPermissionState, registerForPushNotifications } from "../../src/lib/pushNotifications";
import { supabase } from "../../src/lib/supabase";

type Category = "all" | "order" | "approval" | "chat" | "system";
const FILTERS: { key: Category; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "all", label: "ทั้งหมด", icon: "apps-outline" },
  { key: "order", label: "คำสั่งซื้อ", icon: "cube-outline" },
  { key: "approval", label: "คำขอ", icon: "checkmark-circle-outline" },
  { key: "chat", label: "แชต", icon: "chatbubble-outline" },
  { key: "system", label: "ระบบ", icon: "information-circle-outline" },
];

function categoryOf(item: { category?: string; type: string; entity_type: string | null }): Exclude<Category, "all"> {
  if (["order", "approval", "chat", "system"].includes(item.category ?? "")) return item.category as Exclude<Category, "all">;
  if (item.type.includes("approval") || ["market", "store", "seller"].includes(item.entity_type ?? "")) return "approval";
  if (item.type.includes("chat") || item.entity_type === "chat") return "chat";
  if (item.type.includes("order") || item.entity_type === "order") return "order";
  return "system";
}

const CATEGORY_UI = {
  order: { label: "คำสั่งซื้อ", icon: "cube-outline" as const, color: Colors.info, background: "#EAF2FF" },
  approval: { label: "คำขอ", icon: "checkmark-circle-outline" as const, color: Colors.success, background: "#EAF6EE" },
  chat: { label: "แชต", icon: "chatbubble-outline" as const, color: "#7C3AED", background: "#F1EAFE" },
  system: { label: "ระบบ", icon: "information-circle-outline" as const, color: Colors.goldDark, background: "#FFF6D8" },
};

export default function NotificationScreen() {
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const router = useRouter();
  const { items, loading, refresh } = useNotifications();
  const [category, setCategory] = useState<Category>("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [pushState, setPushState] = useState<PushPermissionState>("unavailable");
  const [pushBusy, setPushBusy] = useState(false);

  const refreshPermission = useCallback(() => {
    void getPushPermissionState().then(setPushState).catch(() => setPushState("unavailable"));
  }, []);
  useEffect(() => {
    refreshPermission();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshPermission();
    });
    return () => subscription.remove();
  }, [refreshPermission]);

  const filtered = useMemo(() => items.filter((item) => {
    if (category !== "all" && categoryOf(item) !== category) return false;
    return !unreadOnly || !item.read_at;
  }), [category, items, unreadOnly]);
  const unreadCount = items.filter((item) => !item.read_at).length;

  const read = async (id: number) => {
    await supabase.rpc("mark_notification_read", { p_notification_id: id });
    await refresh();
  };
  const openItem = async (item: (typeof items)[number]) => {
    if (!item.read_at) await read(item.notification_id);
    router.push(notificationPath({ entity_type: item.entity_type ?? undefined, entity_id: item.entity_id ?? undefined }));
  };
  const markAllRead = async () => {
    const { error } = await supabase.rpc("mark_all_notifications_read");
    if (error) return Alert.alert("ทำรายการไม่สำเร็จ", "กรุณาลองใหม่อีกครั้ง");
    await refresh();
  };
  const enablePush = async () => {
    if (pushState === "denied") return openNotificationSettings();
    setPushBusy(true);
    try {
      const next = await registerForPushNotifications(true);
      setPushState(next);
      if (next === "not_configured") Alert.alert("อนุญาตการแจ้งเตือนแล้ว", "เครื่องนี้พร้อมรับแจ้งเตือนหลังติดตั้งแอปเวอร์ชัน Development หรือ Production Build");
    } catch {
      Alert.alert("เปิดการแจ้งเตือนไม่สำเร็จ", "ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง");
    } finally { setPushBusy(false); }
  };

  if (auth.loading) return <View style={[styles.root, styles.center]}><ActivityIndicator color={Colors.greenPrimary} /></View>;
  if (!auth.session) return <Redirect href="/(auth)/sign-in" />;

  const pushGranted = pushState === "granted";
  const pushPermissionOnly = pushState === "not_configured";
  return <View style={styles.root}>
    <View style={[styles.head, { paddingTop: insets.top + 12 }]}>
      <View style={styles.titleRow}>
        <View><Text style={styles.title}>การแจ้งเตือน</Text><Text style={styles.sub}>ติดตามเรื่องสำคัญ แยกตามหมวดหมู่</Text></View>
        {unreadCount > 0 ? <TouchableOpacity onPress={markAllRead}><Text style={styles.readAll}>อ่านทั้งหมด</Text></TouchableOpacity> : null}
      </View>
    </View>
    <ScrollView contentContainerStyle={styles.content}>
      {Platform.OS !== "web" ? <View style={[styles.pushCard, pushGranted && styles.pushCardOn]}>
        <View style={[styles.pushIcon, pushGranted && styles.pushIconOn]}><Ionicons name={pushGranted ? "notifications" : "notifications-outline"} size={22} color={Colors.greenPrimary} /></View>
        <View style={styles.pushCopy}><Text style={styles.pushTitle}>{pushGranted ? "แจ้งเตือนนอกแอปเปิดอยู่" : pushPermissionOnly ? "อนุญาตแล้ว — รอแอปเวอร์ชัน Build" : "รับแจ้งเตือนแม้ไม่ได้เปิดแอป"}</Text><Text style={styles.pushBody}>{pushState === "denied" ? "สิทธิ์ถูกปิดอยู่ แตะเพื่อเปิดในการตั้งค่าเครื่อง" : pushGranted ? "คุณจะไม่พลาดคำสั่งซื้อ คำขอ และข้อความสำคัญ" : pushPermissionOnly ? "Expo Go รับ Push บน Android ไม่ได้ กรุณาใช้ Development หรือ Production Build" : "อนุญาตเพื่อรับคำสั่งซื้อ คำขอ และข้อความสำคัญ"}</Text></View>
        {!pushGranted && !pushPermissionOnly ? <TouchableOpacity disabled={pushBusy} style={styles.enableButton} onPress={enablePush}><Text style={styles.enableText}>{pushBusy ? "กำลังเปิด..." : pushState === "denied" ? "ตั้งค่า" : "เปิดใช้"}</Text></TouchableOpacity> : null}
      </View> : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {FILTERS.map((filter) => <TouchableOpacity key={filter.key} onPress={() => setCategory(filter.key)} style={[styles.filter, category === filter.key && styles.filterActive]}>
          <Ionicons name={filter.icon} size={17} color={category === filter.key ? Colors.textWhite : Colors.textMedium} />
          <Text style={[styles.filterText, category === filter.key && styles.filterTextActive]}>{filter.label}</Text>
        </TouchableOpacity>)}
      </ScrollView>
      <TouchableOpacity style={styles.unreadToggle} onPress={() => setUnreadOnly((value) => !value)}>
        <Ionicons name={unreadOnly ? "checkbox" : "square-outline"} size={21} color={Colors.greenPrimary} />
        <Text style={styles.unreadToggleText}>แสดงเฉพาะที่ยังไม่ได้อ่าน</Text>
        {unreadCount > 0 ? <View style={styles.count}><Text style={styles.countText}>{unreadCount}</Text></View> : null}
      </TouchableOpacity>

      {loading ? <ActivityIndicator style={{ marginTop: 28 }} color={Colors.greenPrimary} /> : null}
      {!loading && !filtered.length ? <View style={styles.empty}><Ionicons name="notifications-off-outline" size={38} color={Colors.textMuted} /><Text style={styles.emptyTitle}>ไม่มีรายการในหมวดนี้</Text><Text style={styles.emptyText}>เมื่อมีความคืบหน้า รายการจะแสดงที่นี่</Text></View> : null}
      {filtered.map((item) => {
        const kind = categoryOf(item); const ui = CATEGORY_UI[kind];
        return <TouchableOpacity key={item.notification_id} style={[styles.card, !item.read_at && styles.unread]} onPress={() => void openItem(item)}>
          <View style={[styles.icon, { backgroundColor: ui.background }]}><Ionicons name={ui.icon} size={22} color={ui.color} /></View>
          <View style={styles.cardCopy}>
            <View style={styles.cardTop}><Text style={styles.categoryLabel}>{ui.label}</Text>{!item.read_at ? <View style={styles.dot} /> : null}</View>
            <Text style={styles.itemTitle}>{item.title}</Text><Text style={styles.body}>{item.body}</Text>
            <Text style={styles.date}>{new Date(item.created_at).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}</Text>
          </View><Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
        </TouchableOpacity>;
      })}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background }, center: { alignItems: "center", justifyContent: "center" },
  head: { padding: Spacing.lg, backgroundColor: Colors.goldPrimary, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }, title: { fontFamily: "Kanit_700Bold", fontSize: 26, color: Colors.greenPrimary }, sub: { fontFamily: "Kanit_400Regular", color: Colors.greenDark }, readAll: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary, textDecorationLine: "underline" },
  content: { padding: Spacing.lg, paddingBottom: 110 }, pushCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: BorderRadius.lg, backgroundColor: "#FFF7DD", borderWidth: 1, borderColor: "#F4D572", marginBottom: 16 }, pushCardOn: { backgroundColor: "#ECF6EF", borderColor: "#B8D9C3" }, pushIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }, pushIconOn: { backgroundColor: "#D9EDDF" }, pushCopy: { flex: 1 }, pushTitle: { fontFamily: "Kanit_700Bold", color: Colors.textDark, fontSize: 14 }, pushBody: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, fontSize: 12, lineHeight: 18 }, enableButton: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: BorderRadius.round, backgroundColor: Colors.greenPrimary }, enableText: { fontFamily: "Kanit_500Medium", color: Colors.textWhite, fontSize: 12 },
  filters: { gap: 8, paddingRight: 16, marginBottom: 13 }, filter: { flexDirection: "row", gap: 6, alignItems: "center", paddingHorizontal: 14, paddingVertical: 9, borderRadius: BorderRadius.round, borderWidth: 1, borderColor: Colors.inputBorder, backgroundColor: Colors.cardBackground }, filterActive: { backgroundColor: Colors.greenPrimary, borderColor: Colors.greenPrimary }, filterText: { fontFamily: "Kanit_500Medium", color: Colors.textMedium, fontSize: 13 }, filterTextActive: { color: Colors.textWhite },
  unreadToggle: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }, unreadToggleText: { fontFamily: "Kanit_400Regular", color: Colors.textMedium, flex: 1 }, count: { minWidth: 24, height: 24, paddingHorizontal: 7, borderRadius: 12, backgroundColor: Colors.goldPrimary, alignItems: "center", justifyContent: "center" }, countText: { fontFamily: "Kanit_700Bold", color: Colors.greenDark, fontSize: 11 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "white", padding: Spacing.md, borderRadius: BorderRadius.lg, marginBottom: 10, borderWidth: 1, borderColor: Colors.inputBorder }, unread: { borderLeftWidth: 4, borderLeftColor: Colors.goldPrimary }, icon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" }, cardCopy: { flex: 1 }, cardTop: { flexDirection: "row", alignItems: "center", gap: 7 }, categoryLabel: { fontFamily: "Kanit_500Medium", fontSize: 11, color: Colors.textMuted }, dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.goldPrimary }, itemTitle: { fontFamily: "Kanit_700Bold", color: Colors.textDark }, body: { fontFamily: "Kanit_400Regular", color: Colors.textMedium, lineHeight: 21 }, date: { fontFamily: "Kanit_400Regular", fontSize: 11, color: Colors.textMuted, marginTop: 5 }, empty: { alignItems: "center", marginTop: 54 }, emptyTitle: { fontFamily: "Kanit_700Bold", color: Colors.textMedium, marginTop: 9 }, emptyText: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, marginTop: 2 },
});
