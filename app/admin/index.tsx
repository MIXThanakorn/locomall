import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AdminGate } from "../../src/components/AdminGate";
import { BorderRadius, Colors, Spacing } from "../../src/constants/theme";
import { useAuth } from "../../src/context/AuthContext";
import { supabase } from "../../src/lib/supabase";

type Stats = { markets: number; stores: number; sellers: number; orders: number };

export default function AdminDashboard() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [stats, setStats] = useState<Stats>({ markets: 0, stores: 0, sellers: 0, orders: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    const [markets, stores, sellers, orders] = await Promise.all([
      supabase.from("markets").select("market_id", { count: "exact", head: true }).eq("approval_status", "pending"),
      supabase.from("stores").select("store_id", { count: "exact", head: true }).eq("approval_status", "pending"),
      supabase.from("store_seller_applications").select("application_id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("orders").select("order_id", { count: "exact", head: true }).neq("status", "delivered").neq("status", "cancelled"),
    ]);
    setStats({ markets: markets.count ?? 0, stores: stores.count ?? 0, sellers: sellers.count ?? 0, orders: orders.count ?? 0 });
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const logout = () => Alert.alert("ออกจากระบบผู้ดูแล", "ยืนยันออกจากระบบ?", [
    { text: "ยกเลิก", style: "cancel" },
    { text: "ออกจากระบบ", style: "destructive", onPress: async () => { await signOut(); router.replace("/(auth)/sign-in" as never); } },
  ]);

  const cards = [
    { label: "Market รออนุมัติ", value: stats.markets, icon: "people-outline", color: Colors.greenPrimary },
    { label: "ร้านรออนุมัติ", value: stats.stores, icon: "storefront-outline", color: Colors.goldDark },
    { label: "ผู้ขายรออนุมัติ", value: stats.sellers, icon: "person-add-outline", color: Colors.info },
    { label: "ออเดอร์กำลังดำเนินการ", value: stats.orders, icon: "cube-outline", color: Colors.warning },
  ];

  return <AdminGate><ScrollView style={styles.root} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={Colors.greenPrimary} />}>
    <View style={styles.header}>
      <View><Text style={styles.eyebrow}>LOCOMALL ADMIN</Text><Text style={styles.title}>ศูนย์ควบคุมระบบ</Text><Text style={styles.role}>ผู้ดูแลแพลตฟอร์ม</Text></View>
      <TouchableOpacity style={styles.logout} onPress={logout}><Ionicons name="log-out-outline" size={22} color={Colors.danger} /></TouchableOpacity>
    </View>
    <View style={styles.grid}>{cards.map((card) => <View key={card.label} style={styles.statCard}><View style={[styles.statIcon, { backgroundColor: `${card.color}18` }]}><Ionicons name={card.icon as any} size={22} color={card.color} /></View><Text style={styles.statValue}>{card.value}</Text><Text style={styles.statLabel}>{card.label}</Text></View>)}</View>
    <Text style={styles.section}>งานที่ใช้บ่อย</Text>
    <TouchableOpacity style={styles.action} onPress={() => router.push("/admin/markets" as never)}><Ionicons name="checkmark-circle-outline" size={24} color={Colors.greenPrimary} /><View style={styles.actionBody}><Text style={styles.actionTitle}>ตรวจคำขอทั้งหมด</Text><Text style={styles.actionDesc}>Market ร้านค้า และผู้ขายร่วมร้าน</Text></View><Ionicons name="chevron-forward" size={20} color={Colors.textMuted} /></TouchableOpacity>
    <TouchableOpacity style={styles.action} onPress={() => router.push("/admin/orders" as never)}><Ionicons name="warning-outline" size={24} color={Colors.warning} /><View style={styles.actionBody}><Text style={styles.actionTitle}>ติดตามออเดอร์</Text><Text style={styles.actionDesc}>ตรวจสถานะและจัดการกรณีผิดปกติ</Text></View><Ionicons name="chevron-forward" size={20} color={Colors.textMuted} /></TouchableOpacity>
    <TouchableOpacity style={styles.action} onPress={() => router.push("/admin/audit" as never)}><Ionicons name="shield-checkmark-outline" size={24} color={Colors.info} /><View style={styles.actionBody}><Text style={styles.actionTitle}>ประวัติการดำเนินการ</Text><Text style={styles.actionDesc}>ตรวจสอบการอนุมัติและ Admin override</Text></View><Ionicons name="chevron-forward" size={20} color={Colors.textMuted} /></TouchableOpacity>
    <View style={styles.notice}><Ionicons name="lock-closed-outline" size={19} color={Colors.greenPrimary} /><Text style={styles.noticeText}>สิทธิ์ผู้ดูแลตรวจจาก Platform Role ในฐานข้อมูล ไม่ใช้การยืนยันผ่านอีเมลหรือ Authenticator</Text></View>
  </ScrollView></AdminGate>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background }, content: { padding: Spacing.lg, paddingTop: 56, paddingBottom: 100 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }, eyebrow: { fontFamily: "Kanit_500Medium", color: Colors.goldDark, fontSize: 12, letterSpacing: 1 },
  title: { fontFamily: "Kanit_700Bold", fontSize: 28, color: Colors.greenPrimary }, role: { fontFamily: "Kanit_400Regular", color: Colors.textMuted },
  logout: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "#FDECEC" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, statCard: { width: "48%", minHeight: 138, backgroundColor: Colors.cardBackground, borderRadius: BorderRadius.lg, padding: 14, borderWidth: 1, borderColor: Colors.inputBorder },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" }, statValue: { fontFamily: "Kanit_700Bold", fontSize: 28, color: Colors.textDark, marginTop: 7 }, statLabel: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, fontSize: 12 },
  section: { fontFamily: "Kanit_700Bold", fontSize: 19, color: Colors.textDark, marginTop: 24, marginBottom: 10 },
  action: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: Colors.cardBackground, borderRadius: BorderRadius.lg, padding: 16, marginBottom: 9 }, actionBody: { flex: 1 }, actionTitle: { fontFamily: "Kanit_500Medium", color: Colors.textDark }, actionDesc: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, fontSize: 12 },
  notice: { flexDirection: "row", alignItems: "flex-start", gap: 9, backgroundColor: "#E8F2EC", borderRadius: BorderRadius.lg, padding: 14, marginTop: 18 }, noticeText: { flex: 1, fontFamily: "Kanit_400Regular", color: Colors.greenDark, fontSize: 12, lineHeight: 19 },
});
