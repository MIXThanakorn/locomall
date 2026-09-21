import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "../../../src/components/Button";
import { PermissionGate } from "../../../src/components/PermissionGate";
import { Colors, Spacing } from "../../../src/constants/theme";
import { useCapabilities } from "../../../src/hooks/useCapabilities";
import { supabase } from "../../../src/lib/supabase";

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
  const rpc = async (name: any, args: any) => { const { error } = await supabase.rpc(name, args); if (error) Alert.alert(error.message); else await load(); };
  return <PermissionGate allow={permissions.isMarketOwner || permissions.isAdmin} loading={permissions.loading}>
    <ScrollView contentContainerStyle={styles.root}><Text style={styles.title}>จุดรวมสินค้า</Text><Text style={styles.sub}>รับสินค้าจากรถ รวบรวม และส่งเป็นพัสดุเดียว</Text>
      {orders.map((order) => <View key={order.order_id} style={styles.order}><Text style={styles.number}>{order.order_number}</Text>
        {order.order_items.flatMap((item: any) => item.order_allocations.map((allocation: any) => <View key={allocation.allocation_id} style={styles.alloc}><Text style={styles.item}>{item.product_name} × {allocation.quantity} · {allocation.status}</Text>{allocation.status === "ready_for_pickup" ? <Button title="บันทึกรับจากผู้ขาย" size="sm" onPress={() => rpc("record_allocation_collected", { p_allocation_id: allocation.allocation_id })} /> : null}{allocation.status === "collected" ? <Button title="ถึงจุดรวมแล้ว" size="sm" onPress={() => rpc("record_allocation_at_hub", { p_allocation_id: allocation.allocation_id })} /> : null}</View>))}
        {order.status === "at_hub" ? <Button title="รวมเป็นพัสดุเดียว" onPress={() => rpc("consolidate_order", { p_order_id: order.order_id })} /> : null}
        {order.status === "consolidated" ? <><TextInput style={styles.input} placeholder="เลขติดตามพัสดุ" value={tracking[order.order_id] ?? ""} onChangeText={(value) => setTracking((current) => ({ ...current, [order.order_id]: value }))} /><Button title="บันทึกการจัดส่ง" onPress={() => rpc("ship_order", { p_order_id: order.order_id, p_tracking_number: tracking[order.order_id] ?? "", p_courier_name: "Locomall Logistics" })} /></> : null}
      </View>)}
    </ScrollView>
  </PermissionGate>;
}
const styles = StyleSheet.create({ root: { padding: Spacing.lg, paddingTop: 58, backgroundColor: Colors.background, flexGrow: 1 }, title: { fontFamily: "Kanit_700Bold", fontSize: 26, color: Colors.greenPrimary }, sub: { fontFamily: "Kanit_400Regular", color: Colors.textMuted }, order: { backgroundColor: "white", padding: 16, borderRadius: 16, marginTop: 12 }, number: { fontFamily: "Kanit_700Bold" }, alloc: { paddingVertical: 10, borderBottomWidth: 1, borderColor: Colors.inputBorder, gap: 6 }, item: { fontFamily: "Kanit_400Regular" }, input: { borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: 10, padding: 12, marginVertical: 10 } });
