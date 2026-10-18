import { LoadNotice } from "../../src/components/LoadNotice";
import { useResponsiveLayout } from "../../src/components/ResponsiveFrame";
import { useResponsiveStyles } from "../../src/hooks/useResponsiveStyles";
import { ScreenHeader } from "../../src/components/ScreenHeader";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AdminGate } from "../../src/components/AdminGate";
import { BorderRadius, Colors, Spacing } from "../../src/constants/theme";
import { useAuth } from "../../src/context/AuthContext";
import { supabase } from "../../src/lib/supabase";
import { RealtimeWatch, useRealtimeRefresh } from "../../src/hooks/useRealtimeRefresh";

const DASHBOARD_WATCHES: RealtimeWatch[] = [
  { table: "markets", event: "INSERT" }, { table: "markets", event: "UPDATE" },
  { table: "stores", event: "INSERT" }, { table: "stores", event: "UPDATE" },
  { table: "store_seller_applications", event: "INSERT" }, { table: "store_seller_applications", event: "UPDATE" },
  { table: "orders", event: "INSERT" }, { table: "orders", event: "UPDATE" },
];

type Stats = { markets: number | null; stores: number | null; sellers: number | null; orders: number | null };

export default function AdminDashboard() {
  const styles = useResponsiveStyles(baseStyles, {});
  const router = useRouter();
  const { signOut, isAdmin } = useAuth();
  const layout = useResponsiveLayout();
  const generation = useRef(0);
  const [loadError, setLoadError] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({ markets: null, stores: null, sellers: null, orders: null });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    const request = ++generation.current;
    setRefreshing(true);
    try {
    const [markets, stores, sellers, orders] = await Promise.all([
      supabase.from("markets").select("market_id", { count: "exact", head: true }).eq("approval_status", "pending"),
      supabase.from("stores").select("store_id", { count: "exact", head: true }).eq("approval_status", "pending"),
      supabase.from("store_seller_applications").select("application_id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("orders").select("order_id", { count: "exact", head: true }).neq("status", "delivered").neq("status", "cancelled"),
    ]);
    if (request !== generation.current) return;
    if ([markets, stores, sellers, orders].some((result) => result.error)) throw new Error("dashboard unavailable");
    setStats({ markets: markets.count, stores: stores.count, sellers: sellers.count, orders: orders.count });
    setLoadError(false); setUpdatedAt(new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }));
    } catch { if (request === generation.current) setLoadError(true); }
    finally { if (request === generation.current) setRefreshing(false); }
  }, [isAdmin]);

  useFocusEffect(useCallback(() => { void load(); return () => { generation.current++; }; }, [load]));
  useRealtimeRefresh("admin-dashboard", load, DASHBOARD_WATCHES, Boolean(isAdmin));

  const logout = () => Alert.alert("ออกจากระบบผู้ดูแล", "ยืนยันออกจากระบบ?", [
    { text: "ยกเลิก", style: "cancel" },
    { text: "ออกจากระบบ", style: "destructive", onPress: async () => { await signOut(); router.replace("/(auth)/sign-in" as never); } },
  ]);

  const cards = [
    { label: "ตลาดชุมชนรอตรวจสอบ", value: stats.markets, icon: "people-outline", color: Colors.greenPrimary, route: "/admin/markets", kind: "market" },
    { label: "ร้านรออนุมัติ", value: stats.stores, icon: "storefront-outline", color: Colors.goldDark, route: "/admin/markets", kind: "store" },
    { label: "ผู้ขายรออนุมัติ", value: stats.sellers, icon: "person-add-outline", color: Colors.info, route: "/admin/markets", kind: "seller" },
    { label: "คำสั่งซื้อที่กำลังดำเนินการ", value: stats.orders, icon: "cube-outline", color: Colors.warning, route: "/admin/orders", kind: undefined },
  ];

  return <AdminGate><ScrollView style={styles.root} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={Colors.greenPrimary} />}>
    <ScreenHeader title="ศูนย์ควบคุมระบบ" titleStyle={styles.title}
      rightAction={<TouchableOpacity accessibilityLabel="ออกจากระบบ" style={styles.logout} onPress={logout}><Ionicons name="log-out-outline" size={22} color={Colors.danger} /></TouchableOpacity>}>
      <Text style={styles.eyebrow}>สำหรับผู้ดูแลระบบ</Text><Text style={styles.role}>ตรวจคำขอและติดตามการทำงานของระบบ</Text>
    </ScreenHeader>
    {loadError ? <LoadNotice onRetry={() => void load()} /> : null}
    <Text style={styles.role}>{refreshing ? "กำลังอัปเดตยอดงาน…" : updatedAt ? `ข้อมูลล่าสุด ${updatedAt}${loadError ? " · อัปเดตไม่สำเร็จ" : ""}` : "กำลังโหลดข้อมูล"}</Text>
    <Text style={styles.section}>งานที่ต้องติดตาม</Text>
    <View style={styles.grid}>{cards.map((card) => <TouchableOpacity key={card.label} accessibilityRole="button" accessibilityLabel={`${card.label} ${card.value ?? "ยังไม่ทราบจำนวน"}`} onPress={() => router.push({ pathname: card.route, params: card.kind ? { kind: card.kind } : {} } as never)} style={[styles.statCard, { width: layout.width < 320 || layout.fontScale >= 1.5 ? "100%" : "48%" }]}><View style={[styles.statIcon, { backgroundColor: `${card.color}18` }]}><Ionicons name={card.icon as any} size={22} color={card.color} /></View><Text style={styles.statValue}>{card.value ?? "—"}</Text><Text style={styles.statLabel}>{card.label} ›</Text></TouchableOpacity>)}</View>
    <Text style={styles.section}>คำขอและร้านค้า</Text>
    <TouchableOpacity style={styles.action} onPress={() => router.push("/admin/stores" as never)}><Ionicons name="storefront-outline" size={24} color={Colors.danger} /><View style={styles.actionBody}><Text style={styles.actionTitle}>ดูแลร้านค้า</Text><Text style={styles.actionDesc}>ระงับและคืนสิทธิ์เปิดขาย พร้อมเหตุผลและประวัติ</Text></View><Ionicons name="chevron-forward" size={20} color={Colors.textMuted} /></TouchableOpacity>
    <TouchableOpacity style={styles.action} onPress={() => router.push("/admin/markets" as never)}><Ionicons name="checkmark-circle-outline" size={24} color={Colors.greenPrimary} /><View style={styles.actionBody}><Text style={styles.actionTitle}>ตรวจคำขอทั้งหมด</Text><Text style={styles.actionDesc}>ตลาดชุมชน ร้านค้า และผู้สมัครร่วมขาย</Text></View><Ionicons name="chevron-forward" size={20} color={Colors.textMuted} /></TouchableOpacity>
    <Text style={styles.section}>การซื้อขายและรีวิว</Text>
    <TouchableOpacity style={styles.action} onPress={() => router.push("/admin/orders" as never)}><Ionicons name="warning-outline" size={24} color={Colors.warning} /><View style={styles.actionBody}><Text style={styles.actionTitle}>ติดตามคำสั่งซื้อ</Text><Text style={styles.actionDesc}>ตรวจสถานะและจัดการกรณีผิดปกติ</Text></View><Ionicons name="chevron-forward" size={20} color={Colors.textMuted} /></TouchableOpacity>
    <TouchableOpacity style={styles.action} onPress={() => router.push("/admin/reviews" as never)}><Ionicons name="star-outline" size={24} color={Colors.goldDark} /><View style={styles.actionBody}><Text style={styles.actionTitle}>ดูแลรีวิว</Text><Text style={styles.actionDesc}>ซ่อนรีวิวที่ไม่เหมาะสมพร้อมเหตุผล</Text></View><Ionicons name="chevron-forward" size={20} color={Colors.textMuted} /></TouchableOpacity>
    <Text style={styles.section}>ยอดเงินและประวัติ</Text>
    <TouchableOpacity style={styles.action} onPress={() => router.push("/admin/finance" as never)}><Ionicons name="wallet-outline" size={24} color={Colors.greenPrimary} /><View style={styles.actionBody}><Text style={styles.actionTitle}>ยอดเงินจำลอง</Text><Text style={styles.actionDesc}>อนุมัติคำขอทดสอบและบันทึกยอดรอโอนผู้ขาย</Text></View><Ionicons name="chevron-forward" size={20} color={Colors.textMuted} /></TouchableOpacity>
    <TouchableOpacity style={styles.action} onPress={() => router.push("/admin/audit" as never)}><Ionicons name="shield-checkmark-outline" size={24} color={Colors.info} /><View style={styles.actionBody}><Text style={styles.actionTitle}>ประวัติการดำเนินการ</Text><Text style={styles.actionDesc}>ตรวจสอบการอนุมัติและการแก้ไขกรณีพิเศษ</Text></View><Ionicons name="chevron-forward" size={20} color={Colors.textMuted} /></TouchableOpacity>

  </ScrollView></AdminGate>;
}

const baseStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background }, content: { padding: Spacing.lg, paddingTop: 0, paddingBottom: 100 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }, eyebrow: { fontFamily: "Kanit_500Medium", color: Colors.goldDark, fontSize: 12, letterSpacing: 1 },
  title: { fontFamily: "Kanit_700Bold", fontSize: 28, color: Colors.greenPrimary }, role: { fontFamily: "Kanit_400Regular", color: Colors.textMuted },
  logout: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "#FDECEC" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, statCard: { width: "48%", minHeight: 118, backgroundColor: Colors.cardBackground, borderRadius: BorderRadius.lg, padding: 14, borderWidth: 1, borderColor: Colors.inputBorder },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" }, statValue: { fontFamily: "Kanit_700Bold", fontSize: 28, color: Colors.textDark, marginTop: 7 }, statLabel: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, fontSize: 12 },
  section: { fontFamily: "Kanit_700Bold", fontSize: 19, color: Colors.textDark, marginTop: 24, marginBottom: 10 },
  action: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: Colors.cardBackground, borderRadius: BorderRadius.lg, padding: 16, marginBottom: 9 }, actionBody: { flex: 1 }, actionTitle: { fontFamily: "Kanit_500Medium", color: Colors.textDark }, actionDesc: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, fontSize: 12 },
  notice: { flexDirection: "row", alignItems: "flex-start", gap: 9, backgroundColor: "#E8F2EC", borderRadius: BorderRadius.lg, padding: 14, marginTop: 18 }, noticeText: { flex: 1, fontFamily: "Kanit_400Regular", color: Colors.greenDark, fontSize: 12, lineHeight: 19 },
});
