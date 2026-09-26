import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AdminGate } from "../../src/components/AdminGate";
import { Button } from "../../src/components/Button";
import { BorderRadius, Colors, Spacing } from "../../src/constants/theme";
import { translateDatabaseError } from "../../src/lib/databaseError";
import { formatThaiDateTime } from "../../src/lib/date";
import { supabase } from "../../src/lib/supabase";

const statusLabels: Record<string, string> = { awaiting_preparation: "รอผู้ขายรับออเดอร์", preparing: "กำลังเตรียม", at_hub: "ถึงจุดรวม", consolidated: "รวมพัสดุแล้ว", shipped: "จัดส่งแล้ว", cancelled: "ยกเลิกแล้ว" };

export default function AdminOrders() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [working, setWorking] = useState<number | null>(null);
  const load = useCallback(async () => {
    setRefreshing(true);
    const { data, error } = await supabase.from("orders").select("order_id,order_number,buyer_id,status,payment_status,total_amount,created_at,markets(name),order_items(order_item_id)").neq("status", "delivered").order("created_at", { ascending: false });
    if (error) Alert.alert("โหลดคำสั่งซื้อไม่สำเร็จ", translateDatabaseError(error));
    setOrders(data ?? []); setRefreshing(false);
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const cancel = (order: any) => Alert.alert("ผู้ดูแลระบบยกเลิกคำสั่งซื้อ", `ต้องการยกเลิก ${order.order_number} ใช่หรือไม่? ระบบจะคืนจำนวนสินค้าให้ผู้ขายเพียงครั้งเดียว`, [
    { text: "กลับ", style: "cancel" },
    { text: "ยืนยันการยกเลิก", style: "destructive", onPress: async () => { setWorking(order.order_id); const { error } = await supabase.rpc("cancel_order", { p_order_id: order.order_id, p_reason: "ยกเลิกโดยผู้ดูแลระบบ", p_admin_override: true }); setWorking(null); if (error) return Alert.alert("ยกเลิกไม่สำเร็จ", translateDatabaseError(error)); await load(); } },
  ]);
  const remove = (order: any) => Alert.alert("ลบออเดอร์ผิดพลาด", `ลบ ${order.order_number} ออกจากระบบถาวรใช่หรือไม่? ทำได้เฉพาะออเดอร์ที่ยกเลิกแล้ว และระบบจะเก็บหลักฐานไว้ในประวัติผู้ดูแล`, [
    { text: "กลับ", style: "cancel" },
    { text: "ลบออเดอร์", style: "destructive", onPress: async () => { setWorking(order.order_id); const { error } = await supabase.rpc("delete_cancelled_order", { p_order_id: order.order_id, p_reason: "ออเดอร์ผิดพลาด ลบโดยผู้ดูแลระบบ" }); setWorking(null); if (error) return Alert.alert("ลบออเดอร์ไม่สำเร็จ", translateDatabaseError(error)); await load(); } },
  ]);
  return <AdminGate><ScrollView style={styles.root} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={Colors.greenPrimary} />}>
    <Text style={styles.eyebrow}>ติดตามการสั่งซื้อ</Text><Text style={styles.title}>จัดการคำสั่งซื้อ</Text><Text style={styles.sub}>ยกเลิกออเดอร์ที่มีปัญหาก่อน แล้วจึงลบออเดอร์ผิดพลาดได้ การดำเนินการทุกครั้งจะถูกบันทึกไว้</Text>
    {!orders.length ? <Text style={styles.empty}>ไม่มีคำสั่งซื้อ</Text> : orders.map((order) => <TouchableOpacity key={order.order_id} style={styles.card} onPress={() => router.push(`/order/${order.order_id}` as never)}>
      <View style={styles.row}><Text style={styles.number}>{order.order_number}</Text><Text style={styles.status}>{statusLabels[order.status] ?? order.status}</Text></View>
      <Text style={styles.market}>{order.markets?.name ?? "ไม่พบชื่อตลาดชุมชน"}</Text><Text style={styles.meta}>ผู้ซื้อ {order.buyer_id.slice(0, 8)}… · {order.order_items?.length ?? 0} รายการ</Text>
      <View style={styles.row}><Text style={styles.date}>{formatThaiDateTime(order.created_at)}</Text><Text style={styles.total}>฿{Number(order.total_amount).toLocaleString()}</Text></View>
      {order.status === "cancelled" ? <Button title="ลบออเดอร์ผิดพลาด" variant="outline" size="sm" loading={working === order.order_id} onPress={() => remove(order)} style={styles.cancel} /> : <Button title="ผู้ดูแลระบบยกเลิกคำสั่งซื้อ" variant="outline" size="sm" loading={working === order.order_id} onPress={() => cancel(order)} style={styles.cancel} />}
    </TouchableOpacity>)}
  </ScrollView></AdminGate>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background }, content: { padding: Spacing.lg, paddingTop: 54, paddingBottom: 110 }, eyebrow: { fontFamily: "Kanit_500Medium", color: Colors.goldDark, fontSize: 12, letterSpacing: 1 }, title: { fontFamily: "Kanit_700Bold", fontSize: 26, color: Colors.greenPrimary }, sub: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, lineHeight: 20, marginBottom: 14 },
  card: { backgroundColor: Colors.cardBackground, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.inputBorder, padding: 16, marginTop: 10 }, row: { flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "center" }, number: { fontFamily: "Kanit_700Bold", color: Colors.textDark }, status: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary, fontSize: 12, backgroundColor: "#E8F2EC", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 99 }, market: { fontFamily: "Kanit_500Medium", marginTop: 7 }, meta: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, fontSize: 12 }, date: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, fontSize: 11, marginTop: 8 }, total: { fontFamily: "Kanit_700Bold", color: Colors.goldDark, marginTop: 8 }, cancel: { borderColor: Colors.danger, marginTop: 12 }, empty: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, textAlign: "center", marginTop: 60 },
});
