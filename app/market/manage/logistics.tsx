import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "../../../src/components/Button";
import { KeyboardAwareScrollView } from "../../../src/components/KeyboardAware";
import { PermissionGate } from "../../../src/components/PermissionGate";
import { Colors, Spacing } from "../../../src/constants/theme";
import { useCapabilities } from "../../../src/hooks/useCapabilities";
import { supabase } from "../../../src/lib/supabase";
import { allocationStatusLabel } from "../../../src/lib/displayText";

export default function Logistics() {
  const permissions = useCapabilities();
  const [orders, setOrders] = useState<any[]>([]);
  const [tracking, setTracking] = useState<Record<number, string>>({});
  const load = async () => {
    if (!permissions.isMarketOwner && !permissions.isAdmin) return;
    const { data } = await supabase.from("orders").select("*,order_items(*,order_allocations(*))").neq("status", "delivered").neq("status", "cancelled").order("created_at");
    setOrders(data ?? []);
  };
  useEffect(() => {
    if (!permissions.isMarketOwner && !permissions.isAdmin) return;
    supabase.from("orders").select("*,order_items(*,order_allocations(*))").neq("status", "delivered").neq("status", "cancelled").order("created_at")
      .then(({ data }) => setOrders(data ?? []));
  }, [permissions.isMarketOwner, permissions.isAdmin]);
  const rpc = async (name: any, args: any) => { const { error } = await supabase.rpc(name, args); if (error) Alert.alert("บันทึกข้อมูลไม่สำเร็จ", "กรุณาตรวจสอบสถานะสินค้าแล้วลองอีกครั้ง"); else await load(); };
  return <PermissionGate allow={permissions.isMarketOwner || permissions.isAdmin} loading={permissions.loading}>
    <KeyboardAwareScrollView contentContainerStyle={styles.root}><Text style={styles.title}>งานที่จุดรวมสินค้า</Text><Text style={styles.sub}>บันทึกเมื่อรับสินค้าจากผู้ขาย แล้วรวมสินค้าเพื่อจัดส่งหรือรอให้ลูกค้ามารับ</Text>
      {orders.map((order) => <View key={order.order_id} style={styles.order}><Text style={styles.number}>{order.order_number}</Text><Text style={styles.method}>{order.fulfillment_method === "pickup" ? "นัดรับที่จุดรวม" : "จัดส่งถึงลูกค้า"}</Text>
        {order.order_items.flatMap((item: any) => item.order_allocations.map((allocation: any) => <View key={allocation.allocation_id} style={styles.alloc}><Text style={styles.item}>{item.product_name} × {allocation.quantity} · {allocationStatusLabel(allocation.status)}</Text>{allocation.status === "ready_for_pickup" ? <Button title="รับสินค้าจากผู้ขายแล้ว" size="sm" onPress={() => rpc("record_allocation_collected", { p_allocation_id: allocation.allocation_id })} /> : null}{allocation.status === "collected" ? <Button title="นำสินค้าถึงจุดรวมแล้ว" size="sm" onPress={() => rpc("record_allocation_at_hub", { p_allocation_id: allocation.allocation_id })} /> : null}</View>))}
        {order.status === "at_hub" && order.fulfillment_method === "pickup" ? <View style={styles.ready}><Text style={styles.readyText}>สินค้าครบแล้ว พร้อมให้ลูกค้ามารับและยืนยันด้วยตนเอง</Text></View> : null}
        {order.status === "at_hub" && order.fulfillment_method !== "pickup" ? <Button title="รวมเป็นพัสดุเดียว" onPress={() => rpc("consolidate_order", { p_order_id: order.order_id })} /> : null}
        {order.status === "consolidated" ? <><TextInput style={styles.input} placeholder="เลขติดตามพัสดุ" value={tracking[order.order_id] ?? ""} onChangeText={(value) => setTracking((current) => ({ ...current, [order.order_id]: value }))} /><Button title="บันทึกการจัดส่ง" onPress={() => rpc("ship_order", { p_order_id: order.order_id, p_tracking_number: tracking[order.order_id] ?? "", p_courier_name: "Locomall Logistics" })} /></> : null}
      </View>)}
    </KeyboardAwareScrollView>
  </PermissionGate>;
}
const styles = StyleSheet.create({ root: { padding: Spacing.lg, paddingTop: 58, backgroundColor: Colors.background, flexGrow: 1 }, title: { fontFamily: "Kanit_700Bold", fontSize: 26, color: Colors.greenPrimary }, sub: { fontFamily: "Kanit_400Regular", color: Colors.textMuted }, order: { backgroundColor: "white", padding: 16, borderRadius: 16, marginTop: 12 }, number: { fontFamily: "Kanit_700Bold" }, method: { fontFamily: "Kanit_500Medium", color: Colors.goldDark }, alloc: { paddingVertical: 10, borderBottomWidth: 1, borderColor: Colors.inputBorder, gap: 6 }, item: { fontFamily: "Kanit_400Regular" }, input: { borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: 10, padding: 12, marginVertical: 10 }, ready: { backgroundColor: "#EAF1E9", padding: 12, borderRadius: 12, marginTop: 10 }, readyText: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary } });
