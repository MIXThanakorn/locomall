/* eslint-disable react-hooks/set-state-in-effect */
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../../src/components/Button";
import { BorderRadius, Colors, Spacing } from "../../src/constants/theme";
import { formatThaiDateTime } from "../../src/lib/date";
import { supabase } from "../../src/lib/supabase";

export default function Cart() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [cart, setCart] = useState<any>();
  const load = useCallback(async () => {
    const result = await supabase.from("carts").select("*,markets(name),cart_items(*,stores(name,product_name,unit,unit_price))").maybeSingle();
    setCart(result.data);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const change = async (storeId: number, quantity: number) => {
    const { error } = quantity <= 0
      ? await supabase.rpc("remove_cart_item", { p_store_id: storeId })
      : await supabase.rpc("upsert_cart_item", { p_store_id: storeId, p_quantity: quantity });
    if (error) Alert.alert("แก้ไขจำนวนสินค้าไม่สำเร็จ", "กรุณาลองใหม่อีกครั้ง");
    await load();
  };

  const items = cart?.cart_items ?? [];
  const totalQuantity = items.reduce((sum: number, item: any) => sum + item.quantity, 0);
  const total = items.reduce((sum: number, item: any) => sum + item.quantity * Number(item.stores.unit_price), 0);

  return <View style={styles.root}>
    <View style={[styles.head, { paddingTop: insets.top + 10 }]}>
      <TouchableOpacity onPress={() => router.back()} accessibilityLabel="ย้อนกลับ"><Ionicons name="arrow-back" size={24} /></TouchableOpacity>
      <Text style={styles.title}>ตะกร้าสินค้า</Text><View style={{ width: 24 }} />
    </View>
    <ScrollView contentContainerStyle={styles.content}>
      {items.length ? <View style={styles.summary}>
        <Text style={styles.summaryTitle}>{cart.markets?.name ?? "ตลาดชุมชน"}</Text>
        <Text style={styles.summaryText}>{items.length} รายการ · รวม {totalQuantity} ชิ้น</Text>
        <Text style={styles.updated}>แก้ไขล่าสุด {formatThaiDateTime(cart.updated_at)}</Text>
        <Text style={styles.summaryHint}>สินค้าทั้งหมดมาจากตลาดชุมชนเดียวกัน เพื่อรวมส่งหรือรับที่จุดรวมครั้งเดียว</Text>
      </View> : <Text style={styles.empty}>ยังไม่มีสินค้าในตะกร้า</Text>}
      {items.map((item: any) => {
        const subtotal = item.quantity * Number(item.stores.unit_price);
        return <View key={item.cart_item_id} style={styles.card}>
          <View style={styles.itemTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.stores.product_name}</Text>
              <Text style={styles.store}>ร้าน {item.stores.name}</Text>
              <Text style={styles.price}>฿{Number(item.stores.unit_price).toLocaleString()} / {item.stores.unit}</Text>
            </View>
            <Text style={styles.subtotal}>฿{subtotal.toLocaleString()}</Text>
          </View>
          <View style={styles.itemBottom}>
            <Text style={styles.quantityLabel}>จำนวน {item.quantity} {item.stores.unit}</Text>
            <View style={styles.qty}>
              <TouchableOpacity onPress={() => change(item.store_id, item.quantity - 1)} accessibilityLabel="ลดจำนวน"><Ionicons name="remove-circle-outline" size={28} /></TouchableOpacity>
              <Text style={styles.count}>{item.quantity}</Text>
              <TouchableOpacity onPress={() => change(item.store_id, item.quantity + 1)} accessibilityLabel="เพิ่มจำนวน"><Ionicons name="add-circle" size={28} color={Colors.greenPrimary} /></TouchableOpacity>
            </View>
          </View>
        </View>;
      })}
    </ScrollView>
    {items.length ? <View style={styles.bottom}>
      <View style={styles.totalRow}><Text style={styles.totalLabel}>ยอดรวม {totalQuantity} ชิ้น</Text><Text style={styles.total}>฿{total.toLocaleString()}</Text></View>
      <Button title="เลือกวิธีรับสินค้าและสั่งซื้อ" onPress={() => router.push("/order/checkout" as never)} style={{ backgroundColor: Colors.goldPrimary }} />
    </View> : null}
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  head: { padding: Spacing.lg, flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: Colors.goldPrimary },
  title: { fontFamily: "Kanit_700Bold", fontSize: 21, color: Colors.greenPrimary },
  content: { padding: Spacing.lg, paddingBottom: 190 },
  summary: { backgroundColor: "#EAF1E9", borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md },
  summaryTitle: { fontFamily: "Kanit_700Bold", fontSize: 18, color: Colors.greenPrimary },
  summaryText: { fontFamily: "Kanit_500Medium", color: Colors.textDark, marginTop: 2 },
  updated: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  summaryHint: { fontFamily: "Kanit_400Regular", color: Colors.textMedium, fontSize: 13, marginTop: 8 },
  card: { backgroundColor: "white", padding: Spacing.md, borderRadius: BorderRadius.lg, marginBottom: 12, borderWidth: 1, borderColor: Colors.inputBorder },
  itemTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  name: { fontFamily: "Kanit_700Bold", fontSize: 17, color: Colors.textDark },
  store: { fontFamily: "Kanit_400Regular", color: Colors.textMuted },
  price: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary, marginTop: 2 },
  subtotal: { fontFamily: "Kanit_700Bold", color: Colors.greenPrimary, fontSize: 18 },
  itemBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: Colors.inputBorder, marginTop: 12, paddingTop: 12 },
  quantityLabel: { fontFamily: "Kanit_500Medium", color: Colors.textMedium },
  qty: { flexDirection: "row", alignItems: "center", gap: 10 },
  count: { fontFamily: "Kanit_700Bold", minWidth: 24, textAlign: "center" },
  empty: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, textAlign: "center", marginTop: 50 },
  bottom: { position: "absolute", bottom: 0, left: 0, right: 0, padding: Spacing.md, backgroundColor: "white", borderTopWidth: 1, borderTopColor: Colors.inputBorder },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  totalLabel: { fontFamily: "Kanit_500Medium" },
  total: { fontFamily: "Kanit_700Bold", fontSize: 21, color: Colors.greenPrimary },
});
