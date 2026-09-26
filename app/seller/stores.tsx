import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { BorderRadius, Colors, Spacing } from "../../src/constants/theme";
import { useAuth } from "../../src/context/AuthContext";
import { supabase } from "../../src/lib/supabase";
import { approvalStatusLabel } from "../../src/lib/displayText";

export default function MyStores() {
  const router = useRouter(); const { session } = useAuth(); const [stores, setStores] = useState<any[]>([]);
  useEffect(() => { if (!session?.user.id) return; supabase.from("stores").select("store_id,name,product_name,approval_status,approval_note,markets(name)").eq("manager_id", session.user.id).order("created_at").then(({ data }) => setStores(data ?? [])); }, [session?.user.id]);
  return <ScrollView contentContainerStyle={styles.root}><Text style={styles.title}>ร้านของฉัน</Text><Text style={styles.sub}>หากคุณเป็นเจ้าของตลาดชุมชน คุณยังซื้อสินค้าได้ตามปกติ หน้านี้ใช้สำหรับดูแลร้านของคุณ</Text>
    {!stores.length ? <View style={styles.empty}><Text style={styles.muted}>ยังไม่มีร้านค้า</Text></View> : null}
    {stores.map((store) => <TouchableOpacity key={store.store_id} style={styles.card} onPress={() => router.push({ pathname: "/store/manage/edit", params: { storeId: store.store_id } } as never)}>
      <View style={{ flex: 1 }}><Text style={styles.name}>{store.name}</Text><Text style={styles.muted}>{store.product_name} · {store.markets?.name}</Text><Text style={styles.status}>สถานะ: {approvalStatusLabel(store.approval_status)}</Text>{store.approval_note ? <Text style={styles.note}>หมายเหตุ: {store.approval_note}</Text> : null}</View><Ionicons name="create-outline" size={24} color={Colors.greenPrimary} />
    </TouchableOpacity>)}
  </ScrollView>;
}
const styles = StyleSheet.create({ root: { padding: Spacing.lg, paddingTop: 58, backgroundColor: Colors.background, flexGrow: 1 }, title: { fontFamily: "Kanit_700Bold", fontSize: 27, color: Colors.greenPrimary }, sub: { fontFamily: "Kanit_400Regular", color: Colors.textMuted }, card: { flexDirection: "row", alignItems: "center", backgroundColor: "white", padding: 16, borderRadius: BorderRadius.lg, marginTop: 12 }, name: { fontFamily: "Kanit_700Bold", color: Colors.textDark }, muted: { fontFamily: "Kanit_400Regular", color: Colors.textMuted }, status: { fontFamily: "Kanit_500Medium", color: Colors.goldDark, marginTop: 4 }, note: { fontFamily: "Kanit_400Regular", color: Colors.danger }, empty: { backgroundColor: "white", padding: 18, borderRadius: 16, marginTop: 16 } });
