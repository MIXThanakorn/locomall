import { ScreenHeader } from "../../src/components/ScreenHeader";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { BorderRadius, Colors, Spacing } from "../../src/constants/theme";
import { useAuth } from "../../src/context/AuthContext";
import { supabase } from "../../src/lib/supabase";

export default function SavedCatalog() {
  const router = useRouter();
  const { session } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    if (!session) return;
      const { data } = await (supabase as any).from("user_catalog_links").select("kind,target_type,target_id,created_at")
        .eq("user_id", session.user.id).order("created_at", { ascending: false }).limit(100);
      const found = await Promise.all((data ?? []).map(async (link: any) => {
        const table = link.target_type === "market" ? "markets" : "stores";
        const column = link.target_type === "market" ? "market_id" : "store_id";
        const { data: entry } = await (supabase as any).from(table).select("name,description,approval_status")
          .eq(column, link.target_id).eq("approval_status", "approved").maybeSingle();
        return entry ? { ...link, ...entry } : null;
      }));
    setItems(found.filter(Boolean));
  }, [session]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  return <ScrollView style={styles.root} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load().finally(() => setRefreshing(false)); }} tintColor={Colors.greenPrimary} />}>
    <ScreenHeader title={"บันทึกและติดตาม"} titleStyle={styles.title} />
    <Text style={styles.hint}>บันทึกไว้ดูภายหลังจะไม่แจ้งเตือน ส่วนติดตามจะแจ้งเมื่อมีร้านใหม่ที่อนุมัติหรือสินค้ากลับมาพร้อมขาย</Text>
    {items.map((item, index) => <TouchableOpacity key={`${item.kind}-${item.target_type}-${item.target_id}-${index}`} style={styles.card}
      onPress={() => router.push(`/${item.target_type}/${item.target_id}` as never)}>
      <Ionicons name={item.kind === "favorite" ? "heart" : "notifications"} size={23} color={Colors.greenPrimary} />
      <View style={styles.body}><Text style={styles.name}>{item.name}</Text><Text style={styles.hint}>{item.kind === "favorite" ? "บันทึกไว้" : "ติดตาม"} · {item.target_type === "market" ? "ตลาดชุมชน" : "ร้านค้า"}</Text></View>
      <Ionicons name="chevron-forward" size={19} color={Colors.textMuted} />
    </TouchableOpacity>)}
    {!items.length ? <Text style={styles.empty}>ยังไม่มีตลาดหรือร้านที่บันทึกไว้</Text> : null}
  </ScrollView>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: Colors.background }, content: { padding: Spacing.lg, paddingTop: 0, paddingBottom: 80 }, back: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary }, title: { fontFamily: "Kanit_700Bold", fontSize: 27, color: Colors.greenPrimary, marginTop: 14 }, hint: { fontFamily: "Kanit_400Regular", color: Colors.textMuted }, card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "white", padding: 14, borderRadius: BorderRadius.lg, marginTop: 10 }, body: { flex: 1 }, name: { fontFamily: "Kanit_700Bold", color: Colors.textDark }, empty: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, textAlign: "center", marginTop: 30 } });
