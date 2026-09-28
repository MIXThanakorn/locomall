/* eslint-disable react-hooks/set-state-in-effect */
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../../../src/components/Button";
import { BorderRadius, Colors, Spacing } from "../../../src/constants/theme";
import { useAuth } from "../../../src/context/AuthContext";
import { formatThaiDateTime } from "../../../src/lib/date";
import { translateDatabaseError } from "../../../src/lib/databaseError";
import { sellerAllocationStatusLabel } from "../../../src/lib/displayText";
import { supabase } from "../../../src/lib/supabase";

const steps = ["awaiting_preparation", "preparing", "ready_for_pickup", "collected", "at_hub"];
const stepLabels: Record<string, string> = { awaiting_preparation: "รับออเดอร์", preparing: "เตรียมสินค้า", ready_for_pickup: "พร้อมส่งมอบ", collected: "เจ้าของตลาดรับสินค้า", at_hub: "สินค้าถึงจุดรวม" };

export default function SellerAllocationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const userId = session?.user.id;
  const [allocation, setAllocation] = useState<any>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    if (!userId) { setAllocation(null); setLoading(false); return; }
    const { data, error } = await supabase.from("order_allocations").select("*,order_items(product_name,product_image_url,unit,unit_price,stores(name,image_url,markets(name,hub_address)),orders(order_id,order_number,created_at,fulfillment_method,status))").eq("allocation_id", Number(id)).eq("seller_id", userId).single();
    setAllocation(error ? null : data);
    setLoading(false);
  }, [id, userId]);
  useEffect(() => { void load(); }, [load]);

  const transition = async (name: "accept_allocation" | "mark_allocation_ready", success: string) => {
    setSaving(true);
    const { error } = await supabase.rpc(name, { p_allocation_id: Number(id) });
    setSaving(false);
    if (error) return Alert.alert("ดำเนินการไม่สำเร็จ", translateDatabaseError(error));
    setMessage(success);
    await load();
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={Colors.greenPrimary} /></View>;
  if (!allocation) return <View style={styles.center}><Text style={styles.muted}>ไม่พบงานขายนี้ หรือคุณไม่มีสิทธิ์เข้าถึง</Text></View>;

  const item = allocation.order_items;
  const order = item?.orders;
  const image = item?.product_image_url || item?.stores?.image_url;
  const current = steps.indexOf(allocation.status);
  const subtotal = allocation.quantity * Number(item?.unit_price ?? 0);

  return <ScrollView contentContainerStyle={[styles.root, { paddingTop: insets.top + 16 }]}>
    <TouchableOpacity style={styles.back} onPress={() => router.back()}><Ionicons name="arrow-back" size={22} color={Colors.greenPrimary} /><Text style={styles.backText}>กลับไปรายการที่ขาย</Text></TouchableOpacity>
    <Text style={styles.eyebrow}>งานขายของคุณ</Text>
    <Text style={styles.number}>{order?.order_number}</Text>
    <Text style={styles.status}>{sellerAllocationStatusLabel(allocation.status)}</Text>
    <Text style={styles.date}>ลูกค้าสั่งเมื่อ {formatThaiDateTime(order?.created_at)}</Text>
    {message ? <View style={styles.success}><Ionicons name="checkmark-circle" size={22} color={Colors.greenPrimary} /><Text style={styles.successText}>{message}</Text></View> : null}
    <View style={styles.card}>{image ? <Image source={{ uri: image }} style={styles.image} /> : null}<View style={styles.productBody}><Text style={styles.product}>{item?.product_name}</Text><Text style={styles.meta}>ร้าน {item?.stores?.name} · {item?.stores?.markets?.name}</Text><Text style={styles.quantity}>เตรียม {allocation.quantity} {item?.unit}</Text><Text style={styles.value}>มูลค่าสินค้าส่วนนี้ ฿{subtotal.toLocaleString()}</Text></View></View>
    <View style={styles.method}><Text style={styles.methodLabel}>วิธีรับสินค้า</Text><Text style={styles.methodTitle}>{order?.fulfillment_method === "pickup" ? "ลูกค้านัดรับที่จุดรวม" : "จัดส่งถึงลูกค้า"}</Text><Text style={styles.meta}>เมื่อเตรียมเสร็จ ให้นำสินค้าไปส่งตามขั้นตอนของตลาดที่ {item?.stores?.markets?.hub_address}</Text></View>
    <Text style={styles.section}>ขั้นตอนงานของคุณ</Text>
    <View style={styles.timeline}>{steps.map((step, index) => <View key={step} style={styles.step}><View style={[styles.dot, index <= current && styles.dotDone]} /><Text style={[styles.stepText, index <= current && styles.stepDone]}>{stepLabels[step]}</Text></View>)}</View>
    {allocation.status === "awaiting_preparation" ? <Button title="รับออเดอร์และเริ่มเตรียมสินค้า" loading={saving} onPress={() => transition("accept_allocation", "รับออเดอร์แล้ว เริ่มเตรียมสินค้าได้เลย")} /> : null}
    {allocation.status === "preparing" ? <Button title="สินค้าเสร็จแล้ว พร้อมส่งมอบ" loading={saving} onPress={() => transition("mark_allocation_ready", "บันทึกแล้ว รอเจ้าของตลาดมารับสินค้า")} /> : null}
    {allocation.status === "ready_for_pickup" ? <Text style={styles.waiting}>งานของคุณเสร็จแล้ว รอเจ้าของตลาดรับสินค้าเพื่อนำไปจุดรวม</Text> : null}
    {["collected", "at_hub"].includes(allocation.status) ? <Text style={styles.waiting}>คุณส่งมอบสินค้าเรียบร้อยแล้ว ขั้นตอนถัดไปเป็นหน้าที่ของเจ้าของตลาด</Text> : null}
  </ScrollView>;
}

const styles = StyleSheet.create({
  root: { padding: Spacing.lg, paddingBottom: 70, backgroundColor: Colors.background, flexGrow: 1 }, center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.background, padding: 24 }, back: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 18 }, backText: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary }, eyebrow: { fontFamily: "Kanit_500Medium", color: Colors.goldDark }, number: { fontFamily: "Kanit_700Bold", fontSize: 24, color: Colors.textDark }, status: { alignSelf: "flex-start", fontFamily: "Kanit_500Medium", color: Colors.greenPrimary, backgroundColor: "#EAF1E9", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9, marginTop: 8 }, date: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, marginTop: 6 }, success: { flexDirection: "row", gap: 8, alignItems: "center", padding: 12, backgroundColor: "#EAF1E9", borderRadius: 12, marginTop: 14 }, successText: { flex: 1, fontFamily: "Kanit_500Medium", color: Colors.greenPrimary }, card: { flexDirection: "row", gap: 12, padding: 14, backgroundColor: "white", borderRadius: BorderRadius.lg, marginTop: 16 }, image: { width: 92, height: 92, borderRadius: 12, backgroundColor: "#EAF1E9" }, productBody: { flex: 1 }, product: { fontFamily: "Kanit_700Bold", fontSize: 18, color: Colors.textDark }, meta: { fontFamily: "Kanit_400Regular", color: Colors.textMuted }, quantity: { fontFamily: "Kanit_700Bold", color: Colors.greenPrimary, marginTop: 8 }, value: { fontFamily: "Kanit_500Medium", color: Colors.textDark }, method: { padding: 14, backgroundColor: "#FFF5D9", borderRadius: BorderRadius.lg, marginTop: 12 }, methodLabel: { fontFamily: "Kanit_500Medium", fontSize: 12, color: Colors.goldDark }, methodTitle: { fontFamily: "Kanit_700Bold", color: Colors.textDark }, section: { fontFamily: "Kanit_700Bold", fontSize: 19, color: Colors.textDark, marginTop: 22 }, timeline: { marginVertical: 14 }, step: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }, dot: { width: 15, height: 15, borderRadius: 8, backgroundColor: Colors.inputBorder }, dotDone: { backgroundColor: Colors.greenPrimary }, stepText: { fontFamily: "Kanit_400Regular", color: Colors.textMuted }, stepDone: { fontFamily: "Kanit_500Medium", color: Colors.textDark }, waiting: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary, backgroundColor: "#EAF1E9", padding: 14, borderRadius: BorderRadius.lg, textAlign: "center" }, muted: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, textAlign: "center" },
});
