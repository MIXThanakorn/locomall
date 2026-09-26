import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Button } from "../../src/components/Button";
import { SearchableDropdown } from "../../src/components/SearchableDropdown";
import { BorderRadius, Colors, Spacing } from "../../src/constants/theme";
import { useAuth } from "../../src/context/AuthContext";
import { translateDatabaseError } from "../../src/lib/databaseError";
import { supabase } from "../../src/lib/supabase";

type Fulfillment = "delivery" | "pickup";

export default function Checkout() {
  const router = useRouter(); const { deviceLocation } = useAuth();
  const [addresses, setAddresses] = useState<any[]>([]); const [addressId, setAddressId] = useState<number>(); const [cart, setCart] = useState<any>();
  const [fulfillment, setFulfillment] = useState<Fulfillment>("delivery"); const [pickup, setPickup] = useState<any>(); const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from("user_addresses").select("*,thai_subdistricts(name_th,thai_districts(name_th,thai_provinces(name_th)))").order("is_default", { ascending: false }),
      supabase.from("carts").select("*,cart_items(store_id,quantity,stores(name,product_name,unit_price))").maybeSingle(),
    ]).then(async ([addressResult, cartResult]) => {
      setAddresses(addressResult.data ?? []); setAddressId(addressResult.data?.[0]?.address_id); setCart(cartResult.data);
      if (cartResult.data?.market_id) {
        const { data } = await supabase.rpc("get_pickup_eligibility", { p_market_id: cartResult.data.market_id, p_lat: deviceLocation?.latitude, p_lng: deviceLocation?.longitude }).single();
        setPickup(data);
      }
    });
  }, [deviceLocation?.latitude, deviceLocation?.longitude]);

  const submit = async () => {
    if (!cart) return Alert.alert("ไม่พบสินค้าในตะกร้า");
    if (fulfillment === "delivery" && !addressId) return Alert.alert("กรุณาเลือกที่อยู่จัดส่ง");
    if (fulfillment === "pickup" && !pickup?.eligible) return Alert.alert("ไม่สามารถเลือกนัดรับได้", "นัดรับได้เมื่อคุณอยู่ห่างจุดรวมไม่เกิน 10 กิโลเมตร");
    setLoading(true);
    const items = cart.cart_items.map((item: any) => ({ store_id: item.store_id, quantity: item.quantity }));
    const { data, error } = await supabase.rpc("create_cod_order", {
      p_market_id: cart.market_id, p_address_id: fulfillment === "delivery" ? addressId : null, p_items: items,
      p_fulfillment_method: fulfillment, p_lat: deviceLocation?.latitude, p_lng: deviceLocation?.longitude,
    } as any);
    setLoading(false);
    if (error) return Alert.alert("สั่งซื้อไม่สำเร็จ", translateDatabaseError(error));
    router.replace(`/order/${data}` as never);
  };

  const addressOptions = addresses.map((address) => {
    const sub = address.thai_subdistricts; const district = sub?.thai_districts;
    const fullAddress = `${address.address_line} ${sub?.name_th ?? ""} ${district?.name_th ?? ""} ${district?.thai_provinces?.name_th ?? ""} ${address.postal_code}`.replace(/\s+/g, " ").trim();
    return { value: String(address.address_id), label: `${address.recipient_name} · ${address.phone}`, description: fullAddress };
  });

  return <View style={styles.root}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>วิธีรับสินค้า</Text>
      <TouchableOpacity style={[styles.method, fulfillment === "delivery" && styles.selected]} onPress={() => setFulfillment("delivery")}><Ionicons name="car-outline" size={24} color={Colors.greenPrimary} /><View style={{ flex: 1 }}><Text style={styles.name}>จัดส่งถึงที่อยู่</Text><Text style={styles.detail}>รวมสินค้าจากทุกผู้ขายเป็นพัสดุเดียว</Text></View></TouchableOpacity>
      <TouchableOpacity style={[styles.method, fulfillment === "pickup" && styles.selected, !pickup?.eligible && styles.disabled]} disabled={!pickup?.eligible} onPress={() => setFulfillment("pickup")}><Ionicons name="storefront-outline" size={24} color={pickup?.eligible ? Colors.greenPrimary : Colors.textMuted} /><View style={{ flex: 1 }}><Text style={styles.name}>นัดรับที่จุดรวมสินค้า</Text><Text style={styles.detail}>{pickup?.eligible ? `ห่างประมาณ ${pickup.distance_km} กม. · ${pickup.hub_address}` : "ใช้ได้เมื่ออยู่ห่างจุดรวมไม่เกิน 10 กม."}</Text></View></TouchableOpacity>

      {fulfillment === "delivery" ? <><Text style={styles.title}>ที่อยู่จัดส่ง</Text>
        {!addresses.length ? <TouchableOpacity style={styles.add} onPress={() => router.push("/profile/shipping-address" as never)}><Text style={styles.addText}>+ เพิ่มที่อยู่จัดส่ง</Text></TouchableOpacity> : <><SearchableDropdown placeholder="เลือกที่อยู่จัดส่ง" options={addressOptions} value={addressId ? String(addressId) : undefined} searchPlaceholder="ค้นหาชื่อผู้รับหรือที่อยู่" onChange={(value) => setAddressId(Number(value))} /><TouchableOpacity onPress={() => router.push("/profile/shipping-address" as never)}><Text style={styles.manage}>จัดการที่อยู่จัดส่ง</Text></TouchableOpacity></>}
      </> : <View style={styles.pickupInfo}><Text style={styles.name}>ขั้นตอนนัดรับ</Text><Text style={styles.detail}>รับคำสั่งซื้อ → ผู้ขายกำลังเตรียม → สินค้าถึงจุดรวมพร้อมรับ → คุณกดยืนยันหลังได้รับสินค้า</Text></View>}

      <Text style={styles.title}>การชำระเงิน</Text><View style={styles.cod}><Text style={styles.name}>ชำระเงินเมื่อได้รับสินค้า</Text><Text style={styles.detail}>{fulfillment === "pickup" ? "ชำระเงินเมื่อมารับสินค้าที่จุดรวม" : "ชำระเงินกับผู้จัดส่งเมื่อได้รับสินค้า"}</Text></View>
      <Text style={styles.title}>รายการสินค้า</Text>{cart?.cart_items?.map((item: any) => <View key={item.store_id} style={styles.line}><Text style={styles.detail}>{item.stores.product_name} × {item.quantity}</Text><Text style={styles.name}>฿{(Number(item.stores.unit_price) * item.quantity).toLocaleString()}</Text></View>)}
    </ScrollView>
    <View style={styles.bottom}><Button title={fulfillment === "pickup" ? "ยืนยันคำสั่งซื้อแบบนัดรับ" : "ยืนยันคำสั่งซื้อและชำระเมื่อได้รับสินค้า"} loading={loading} onPress={submit} disabled={fulfillment === "delivery" ? !addressId : !pickup?.eligible} style={styles.button} /></View>
  </View>;
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: Colors.background }, content: { padding: Spacing.lg, paddingTop: 58, paddingBottom: 150 }, title: { fontFamily: "Kanit_700Bold", fontSize: 22, color: Colors.greenPrimary, marginTop: 14, marginBottom: 10 }, method: { flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: "white", borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: BorderRadius.lg, padding: 15, marginBottom: 9 }, selected: { borderColor: Colors.greenPrimary, borderWidth: 2, backgroundColor: "#F0F7F2" }, disabled: { opacity: 0.55 }, add: { backgroundColor: "white", borderWidth: 1, borderStyle: "dashed", borderColor: Colors.greenPrimary, borderRadius: BorderRadius.md, padding: 18 }, addText: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary, textAlign: "center" }, manage: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary, textAlign: "right", marginTop: -8, marginBottom: 8 }, cod: { backgroundColor: "white", borderRadius: BorderRadius.md, padding: 16, borderWidth: 1, borderColor: Colors.goldPrimary }, pickupInfo: { backgroundColor: "#FFF5D9", borderRadius: BorderRadius.lg, padding: 16, marginTop: 12 }, name: { fontFamily: "Kanit_700Bold", color: Colors.textDark }, detail: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, flex: 1 }, line: { flexDirection: "row", justifyContent: "space-between", gap: 12, backgroundColor: "white", padding: 14, borderRadius: BorderRadius.md, marginBottom: 8 }, bottom: { position: "absolute", left: 0, right: 0, bottom: 0, padding: Spacing.lg, backgroundColor: "white", borderTopWidth: 1, borderTopColor: Colors.inputBorder }, button: { backgroundColor: Colors.goldPrimary } });
