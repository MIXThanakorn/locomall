/* eslint-disable react-hooks/set-state-in-effect */
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "../../../src/components/Button";
import { PermissionGate } from "../../../src/components/PermissionGate";
import { BorderRadius, Colors, Spacing } from "../../../src/constants/theme";
import { useCapabilities } from "../../../src/hooks/useCapabilities";
import { formatThaiDateTime } from "../../../src/lib/date";
import { allocationStatusLabel } from "../../../src/lib/displayText";
import { supabase } from "../../../src/lib/supabase";

export default function Allocations() {
  const router = useRouter();
  const permissions = useCapabilities();
  const [list, setList] = useState<any[]>([]);
  const load = useCallback(async () => {
    const { data } = await supabase.from("order_allocations").select("*,order_items(product_name,unit,unit_price,stores(name,markets(name)),orders(order_id,order_number,created_at,fulfillment_method,status))").order("created_at", { ascending: false });
    setList(data ?? []);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const ready = async (id: number) => {
    const { error } = await supabase.rpc("mark_allocation_ready", { p_allocation_id: id });
    if (error) Alert.alert("แจ้งว่าสินค้าพร้อมไม่สำเร็จ", "กรุณาลองใหม่อีกครั้ง");
    else await load();
  };
  const accept = async (id: number) => {
    const { error } = await supabase.rpc("accept_allocation", { p_allocation_id: id });
    if (error) Alert.alert("รับออเดอร์ไม่สำเร็จ", "ออเดอร์นี้อาจถูกรับหรือยกเลิกไปแล้ว กรุณาลองรีเฟรชอีกครั้ง");
    else await load();
  };

  return <PermissionGate allow={permissions.isSeller} loading={permissions.loading}>
    <ScrollView contentContainerStyle={styles.root}>
      <Text style={styles.title}>ออเดอร์และประวัติการขาย</Text>
      <Text style={styles.help}>ตรวจจำนวน วันที่ และสถานะของสินค้าที่คุณต้องเตรียม</Text>
      {!list.length ? <Text style={styles.empty}>ยังไม่มีออเดอร์ที่จัดสรรให้คุณ</Text> : null}
      {list.map((allocation) => {
        const item = allocation.order_items;
        const order = item?.orders;
        const subtotal = allocation.quantity * Number(item?.unit_price ?? 0);
        return <View key={allocation.allocation_id} style={styles.card}>
          <View style={styles.row}><Text style={styles.number}>{order?.order_number}</Text><Text style={styles.status}>{allocationStatusLabel(allocation.status)}</Text></View>
          <Text style={styles.date}>วันที่สั่ง {formatThaiDateTime(order?.created_at)}</Text>
          <Text style={styles.name}>{item?.product_name}</Text>
          <Text style={styles.meta}>ร้าน {item?.stores?.name ?? "ร้านค้า"} · {item?.stores?.markets?.name ?? "ตลาดชุมชน"}</Text>
          <View style={styles.detailRow}><Text style={styles.detail}>จำนวนที่คุณต้องเตรียม</Text><Text style={styles.quantity}>{allocation.quantity} {item?.unit}</Text></View>
          <View style={styles.detailRow}><Text style={styles.detail}>ราคากลาง</Text><Text style={styles.detailValue}>฿{Number(item?.unit_price ?? 0).toLocaleString()} / {item?.unit}</Text></View>
          <View style={styles.detailRow}><Text style={styles.detail}>มูลค่าสินค้าส่วนนี้</Text><Text style={styles.subtotal}>฿{subtotal.toLocaleString()}</Text></View>
          <Text style={styles.method}>วิธีรับสินค้า: {order?.fulfillment_method === "pickup" ? "ลูกค้านัดรับที่จุดรวม" : "จัดส่งถึงที่อยู่ลูกค้า"}</Text>
          {allocation.status === "awaiting_preparation" ? <Button title="รับออเดอร์และเริ่มเตรียมสินค้า" size="sm" onPress={() => accept(allocation.allocation_id)} style={styles.action} /> : null}
          {allocation.status === "preparing" ? <Button title="เตรียมเสร็จแล้ว พร้อมให้มารับ" size="sm" onPress={() => ready(allocation.allocation_id)} style={styles.action} /> : null}
          {order?.order_id ? <Button title="ดูรายละเอียดออเดอร์" variant="outline" size="sm" onPress={() => router.push(`/order/${order.order_id}` as never)} style={styles.action} /> : null}
        </View>;
      })}
    </ScrollView>
  </PermissionGate>;
}

const styles = StyleSheet.create({
  root: { padding: Spacing.lg, paddingTop: 60, paddingBottom: 80, backgroundColor: Colors.background, flexGrow: 1 },
  title: { fontFamily: "Kanit_700Bold", fontSize: 25, color: Colors.greenPrimary },
  help: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, marginTop: 4, marginBottom: 8 },
  empty: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, textAlign: "center", marginTop: 40 },
  card: { padding: Spacing.md, backgroundColor: "white", borderRadius: BorderRadius.lg, marginTop: 12, borderWidth: 1, borderColor: Colors.inputBorder },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  number: { fontFamily: "Kanit_700Bold", color: Colors.textDark, flex: 1 },
  status: { fontFamily: "Kanit_500Medium", fontSize: 11, color: Colors.greenPrimary, backgroundColor: "#EAF1E9", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
  date: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, fontSize: 12, marginBottom: 10 },
  name: { fontFamily: "Kanit_700Bold", fontSize: 18, color: Colors.textDark },
  meta: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, marginBottom: 10 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 5, gap: 10 },
  detail: { fontFamily: "Kanit_400Regular", color: Colors.textMedium },
  detailValue: { fontFamily: "Kanit_500Medium", color: Colors.textDark },
  quantity: { fontFamily: "Kanit_700Bold", color: Colors.greenPrimary },
  subtotal: { fontFamily: "Kanit_700Bold", color: Colors.greenPrimary, fontSize: 17 },
  method: { fontFamily: "Kanit_400Regular", color: Colors.textMedium, backgroundColor: "#FFF5D9", padding: 10, borderRadius: 10, marginTop: 8 },
  action: { marginTop: 10 },
});
