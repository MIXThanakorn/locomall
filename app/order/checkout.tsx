import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Button } from "../../src/components/Button";
import { SearchableDropdown } from "../../src/components/SearchableDropdown";
import { BorderRadius, Colors, Spacing } from "../../src/constants/theme";
import { supabase } from "../../src/lib/supabase";

export default function Checkout() {
  const router = useRouter();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [addressId, setAddressId] = useState<number>();
  const [cart, setCart] = useState<any>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from("user_addresses").select("*,thai_subdistricts(name_th,thai_districts(name_th,thai_provinces(name_th)))").order("is_default", { ascending: false }),
      supabase.from("carts").select("*,cart_items(store_id,quantity,stores(name,product_name,unit_price))").maybeSingle(),
    ]).then(([addressResult, cartResult]) => {
      setAddresses(addressResult.data ?? []);
      setAddressId(addressResult.data?.[0]?.address_id);
      setCart(cartResult.data);
    });
  }, []);

  const submit = async () => {
    if (!addressId || !cart) return Alert.alert("กรุณาเลือกที่อยู่");
    setLoading(true);
    const items = cart.cart_items.map((item: any) => ({ store_id: item.store_id, quantity: item.quantity }));
    const { data, error } = await supabase.rpc("create_cod_order", { p_market_id: cart.market_id, p_address_id: addressId, p_items: items });
    setLoading(false);
    if (error) return Alert.alert("สั่งซื้อไม่สำเร็จ", error.message);
    router.replace(`/order/${data}` as never);
  };

  const addressOptions = addresses.map((address) => {
    const sub = address.thai_subdistricts;
    const district = sub?.thai_districts;
    const fullAddress = `${address.address_line} ${sub?.name_th ?? ""} ${district?.name_th ?? ""} ${district?.thai_provinces?.name_th ?? ""} ${address.postal_code}`.replace(/\s+/g, " ").trim();
    return { value: String(address.address_id), label: `${address.recipient_name} · ${address.phone}`, description: fullAddress };
  });

  return <View style={styles.root}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>ที่อยู่จัดส่ง</Text>
      {!addresses.length
        ? <TouchableOpacity style={styles.add} onPress={() => router.push("/profile/shipping-address" as never)}><Text style={styles.addText}>+ เพิ่มที่อยู่จัดส่ง</Text></TouchableOpacity>
        : <>
          <SearchableDropdown placeholder="เลือกที่อยู่จัดส่ง" options={addressOptions} value={addressId ? String(addressId) : undefined} searchPlaceholder="ค้นหาชื่อผู้รับหรือที่อยู่" onChange={(value) => setAddressId(Number(value))} />
          <TouchableOpacity onPress={() => router.push("/profile/shipping-address" as never)}><Text style={styles.manage}>จัดการที่อยู่จัดส่ง</Text></TouchableOpacity>
        </>}

      <Text style={styles.title}>ชำระเงิน</Text>
      <View style={styles.cod}><Text style={styles.name}>เก็บเงินปลายทาง (COD)</Text><Text style={styles.detail}>V1 ยืนยันการรับเงินโดยเจ้าหน้าที่ ไม่มี Wallet หรือ Payment Gateway</Text></View>
      <Text style={styles.title}>รายการสินค้า</Text>
      {cart?.cart_items?.map((item: any) => <View key={item.store_id} style={styles.line}><Text style={styles.detail}>{item.stores.product_name} × {item.quantity}</Text><Text style={styles.name}>฿{(Number(item.stores.unit_price) * item.quantity).toLocaleString()}</Text></View>)}
    </ScrollView>
    <View style={styles.bottom}><Button title="ยืนยันคำสั่งซื้อ COD" loading={loading} onPress={submit} disabled={!addressId} style={styles.button} /></View>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingTop: 58, paddingBottom: 130 },
  title: { fontFamily: "Kanit_700Bold", fontSize: 22, color: Colors.greenPrimary, marginTop: 14, marginBottom: 10 },
  add: { backgroundColor: "white", borderWidth: 1, borderStyle: "dashed", borderColor: Colors.greenPrimary, borderRadius: BorderRadius.md, padding: 18 },
  addText: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary, textAlign: "center" },
  manage: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary, textAlign: "right", marginTop: -8, marginBottom: 8 },
  cod: { backgroundColor: "white", borderRadius: BorderRadius.md, padding: 16, borderWidth: 1, borderColor: Colors.goldPrimary },
  name: { fontFamily: "Kanit_700Bold", color: Colors.textDark },
  detail: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, flex: 1 },
  line: { flexDirection: "row", justifyContent: "space-between", gap: 12, backgroundColor: "white", padding: 14, borderRadius: BorderRadius.md, marginBottom: 8 },
  bottom: { position: "absolute", left: 0, right: 0, bottom: 0, padding: Spacing.lg, backgroundColor: "white", borderTopWidth: 1, borderTopColor: Colors.inputBorder },
  button: { backgroundColor: Colors.goldPrimary },
});
