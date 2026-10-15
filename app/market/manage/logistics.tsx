import { ScreenHeader } from "../../../src/components/ScreenHeader";
/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LoadNotice } from "../../../src/components/LoadNotice";
import { Alert, RefreshControl, StyleSheet, Text, View } from "react-native";
import { AppTextInput } from "../../../src/components/AppTextInput";
import { Button } from "../../../src/components/Button";
import { KeyboardAwareScrollView } from "../../../src/components/KeyboardAware";
import { PermissionGate } from "../../../src/components/PermissionGate";
import { Colors, Spacing } from "../../../src/constants/theme";
import { useCapabilities } from "../../../src/hooks/useCapabilities";
import { supabase } from "../../../src/lib/supabase";
import { translateDatabaseError } from "../../../src/lib/databaseError";
import { allocationStatusLabel } from "../../../src/lib/displayText";
import { RealtimeWatch, useRealtimeRefresh } from "../../../src/hooks/useRealtimeRefresh";
import { formatSaleQuantity } from "../../../src/lib/productUnit";

const LOGISTICS_WATCHES: RealtimeWatch[] = [
  { table: "orders", event: "INSERT" }, { table: "orders", event: "UPDATE" },
  { table: "order_allocations", event: "UPDATE" },
];

export default function Logistics() {
  const permissions = useCapabilities();
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [contacts, setContacts] = useState<Record<number, { seller_name: string; seller_username: string | null; seller_phone: string | null }>>({});
  const [loadError, setLoadError] = useState(false);
  const generation = useRef(0);
  const [tracking, setTracking] = useState<Record<number, string>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const load = useCallback(async () => {
    if (!permissions.isMarketOwner && !permissions.isAdmin) return;
    const request = ++generation.current;
    try {
      const [result, people] = await Promise.all([
        supabase.from("orders").select("*,order_items(*,order_allocations(*))").neq("status", "delivered").neq("status", "cancelled").order("created_at"),
        supabase.rpc("get_market_seller_contacts"),
      ]);
      if (request !== generation.current) return;
      if (result.error || people.error) throw result.error || people.error;
      setOrders(result.data ?? []);
      setContacts(Object.fromEntries((people.data ?? []).map((person) => [person.allocation_id, person])));
      setLoadError(false);
    } catch { if (request === generation.current) setLoadError(true); }
  }, [permissions.isMarketOwner, permissions.isAdmin]);
  useEffect(() => { void load(); const counter = generation; return () => { counter.current++; }; }, [load]);
  useRealtimeRefresh("market-logistics", load, LOGISTICS_WATCHES, permissions.isMarketOwner || permissions.isAdmin);
  const rpc = async (name: any, args: any) => {
    if (submitting.current) return;
    submitting.current = true; setSaving(true);
    try {
      const { error } = await supabase.rpc(name, args);
      if (error) Alert.alert("บันทึกข้อมูลไม่สำเร็จ", translateDatabaseError(error));
      await load();
    } catch { Alert.alert("บันทึกข้อมูลไม่สำเร็จ", "กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่"); }
    finally { submitting.current = false; setSaving(false); }
  };
  return <PermissionGate allow={permissions.isMarketOwner || permissions.isAdmin} loading={permissions.loading}>
    <KeyboardAwareScrollView contentContainerStyle={styles.root} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load().finally(() => setRefreshing(false)); }} tintColor={Colors.greenPrimary} />}>
    <ScreenHeader title={"งานที่จุดรวมสินค้า"} titleStyle={styles.title} /><Text style={styles.sub}>บันทึกเมื่อรับสินค้าจากผู้ขาย แล้วรวมสินค้าเพื่อจัดส่งหรือรอให้ลูกค้ามารับ</Text>
      {loadError ? <LoadNotice onRetry={() => void load()} /> : null}
      {orderId ? <Button disabled={saving} title="ดูงานทั้งหมด" variant="outline" onPress={() => router.replace("/market/manage/logistics" as never)} /> : null}
      {!loadError && orderId && !orders.some((order) => String(order.order_id) === orderId) ? <Text style={styles.sub}>ออเดอร์นี้ไม่มีงานคงค้างที่จุดรวมแล้ว หรือคุณไม่มีสิทธิ์ดูงานนี้</Text> : null}
      {orders.filter((order) => !orderId || String(order.order_id) === orderId).map((order) => <View key={order.order_id} style={styles.order}><Text style={styles.number}>{order.order_number}</Text><Text style={styles.method}>{order.fulfillment_method === "pickup" ? "นัดรับที่จุดรวม" : "จัดส่งถึงลูกค้า"}</Text>
        {order.order_items.flatMap((item: any) => item.order_allocations.map((allocation: any) => <View key={allocation.allocation_id} style={styles.alloc}><Text style={styles.number}>ผู้ขาย: {contacts[allocation.allocation_id]?.seller_name ?? "กำลังโหลดข้อมูลผู้ขาย"}{contacts[allocation.allocation_id]?.seller_username ? ` (@${contacts[allocation.allocation_id].seller_username})` : ""}</Text><Text style={styles.sub}>เบอร์ติดต่อ: {contacts[allocation.allocation_id]?.seller_phone || "ไม่ระบุ"} · งาน #{allocation.allocation_id}</Text><Text style={styles.item}>{item.product_name} × {formatSaleQuantity(allocation.quantity, item.unit)} · {allocationStatusLabel(allocation.status)}</Text>{allocation.status === "ready_for_pickup" ? <Button disabled={saving} title="รับสินค้าจากผู้ขายแล้ว" size="sm" onPress={() => rpc("record_allocation_collected", { p_allocation_id: allocation.allocation_id })} /> : null}{allocation.status === "collected" ? <Button disabled={saving} title="นำสินค้าถึงจุดรวมแล้ว" size="sm" onPress={() => rpc("record_allocation_at_hub", { p_allocation_id: allocation.allocation_id })} /> : null}</View>))}
        {order.status === "at_hub" && order.fulfillment_method === "pickup" ? <View style={styles.ready}><Text style={styles.readyText}>สินค้าครบแล้ว พร้อมให้ลูกค้ามารับและยืนยันด้วยตนเอง</Text></View> : null}
        {order.status === "at_hub" && order.fulfillment_method !== "pickup" ? <Button disabled={saving} title="รวมเป็นพัสดุเดียว" onPress={() => rpc("consolidate_order", { p_order_id: order.order_id })} /> : null}
        {order.status === "consolidated" ? <><AppTextInput style={styles.input} placeholder="เลขติดตามพัสดุ" maxLength={120} editable={!saving} value={tracking[order.order_id] ?? ""} onChangeText={(value) => setTracking((current) => ({ ...current, [order.order_id]: value }))} /><Button disabled={saving} title="บันทึกการจัดส่ง" onPress={() => rpc("ship_order", { p_order_id: order.order_id, p_tracking_number: tracking[order.order_id] ?? "", p_courier_name: "Locomall Logistics" })} /></> : null}
      </View>)}
    </KeyboardAwareScrollView>
  </PermissionGate>;
}
const styles = StyleSheet.create({ root: { padding: Spacing.lg, paddingTop: 0, backgroundColor: Colors.background, flexGrow: 1 }, title: { fontFamily: "Kanit_700Bold", fontSize: 26, color: Colors.greenPrimary }, sub: { fontFamily: "Kanit_400Regular", color: Colors.textMuted }, order: { backgroundColor: "white", padding: 16, borderRadius: 16, marginTop: 12 }, number: { fontFamily: "Kanit_700Bold" }, method: { fontFamily: "Kanit_500Medium", color: Colors.goldDark }, alloc: { paddingVertical: 10, borderBottomWidth: 1, borderColor: Colors.inputBorder, gap: 6 }, item: { fontFamily: "Kanit_400Regular" }, input: { borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: 10, padding: 12, marginVertical: 10 }, ready: { backgroundColor: "#EAF1E9", padding: 12, borderRadius: 12, marginTop: 10 }, readyText: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary } });
