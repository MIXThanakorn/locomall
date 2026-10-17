import { useBottomActionLayout } from "../../src/hooks/useBottomActionLayout";
import { useResponsiveStyles } from "../../src/hooks/useResponsiveStyles";
import { ScreenHeader } from "../../src/components/ScreenHeader";
import { LoadNotice } from "../../src/components/LoadNotice";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { parseCartSelection, selectedCartItems } from "../../src/lib/cartSelection";
import { groupCartByMarket } from "../../src/lib/cartMarkets";
import * as Crypto from "expo-crypto";
import React, { useCallback, useRef, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Button } from "../../src/components/Button";
import { ContextHelp } from "../../src/components/ContextHelp";
import { SearchableDropdown } from "../../src/components/SearchableDropdown";
import { BorderRadius, Colors, Spacing } from "../../src/constants/theme";
import { useAuth } from "../../src/context/AuthContext";
import { translateDatabaseError } from "../../src/lib/databaseError";
import { supabase } from "../../src/lib/supabase";
import { formatSaleQuantity } from "../../src/lib/productUnit";

type Fulfillment = "delivery" | "pickup";
type Payment = "cod" | "demo_wallet";

export default function Checkout() {
  const { session } = useAuth();
  const { marketId, itemIds } = useLocalSearchParams<{ marketId?: string; itemIds?: string }>();
  return <CheckoutContent key={`${session?.user.id ?? "guest"}:${marketId ?? ""}:${itemIds ?? ""}`} />;
}

function CheckoutContent() {
  const styles = useResponsiveStyles(baseStyles, {"wrap":["line"]});
  const router = useRouter();
  const bottomAction = useBottomActionLayout(); const { deviceLocation, session } = useAuth();
  const { marketId, itemIds } = useLocalSearchParams<{ marketId?: string; itemIds?: string }>();
  const userId = session?.user.id;
  const [addresses, setAddresses] = useState<any[]>([]); const [addressId, setAddressId] = useState<number>(); const [cart, setCart] = useState<any>();
  const [fulfillment, setFulfillment] = useState<Fulfillment>("delivery"); const [pickup, setPickup] = useState<any>(); const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState<Payment>("cod");
  const [demoBalance, setDemoBalance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const submitting = useRef(false);
  const generation = useRef(0);
  const retry = useRef<{ fingerprint: string; requestId: string } | null>(null);

  useFocusEffect(useCallback(() => {
    if (!userId) { setDemoBalance(0); return; }
    void (supabase as any).from("demo_accounts").select("wallet_balance").eq("user_id", userId).maybeSingle()
      .then(({ data }: any) => setDemoBalance(Number(data?.wallet_balance ?? 0)));
  }, [userId]));

  const loadCheckout = useCallback(async () => {
    const request = ++generation.current;
    try {
    const [addressResult, cartResult] = await Promise.all([
      supabase.from("user_addresses").select("*,thai_subdistricts(name_th,thai_districts(name_th,thai_provinces(name_th)))").eq("user_id", userId!).order("is_default", { ascending: false }),
      supabase.from("carts").select("*,cart_items(cart_item_id,store_id,quantity,stores(name,product_name,unit,unit_price,market_id,markets(name)))").eq("buyer_id", userId!).maybeSingle(),
    ]);
    if (request !== generation.current) return;
    if (addressResult.error || cartResult.error) throw addressResult.error || cartResult.error;
    const nextAddresses = addressResult.data ?? [];
    setAddresses(nextAddresses);
    setAddressId((current) => nextAddresses.some((address) => address.address_id === current) ? current : nextAddresses[0]?.address_id);
    const groups = groupCartByMarket(cartResult.data?.cart_items ?? [], cartResult.data?.market_id).filter((group) => group.marketId > 0);
    const selected = marketId ? groups.find((group) => group.marketId === Number(marketId)) : groups.length === 1 ? groups[0] : undefined;
    const chosen = selectedCartItems<any>(cartResult.data?.cart_items ?? [], parseCartSelection(itemIds), Number(marketId));
    setCart(selected && chosen.length ? { ...cartResult.data, market_id: selected.marketId, market_name: selected.marketName, cart_items: chosen } : null);
    if (selected) {
      const { data, error } = await supabase.rpc("get_pickup_eligibility", { p_market_id: selected.marketId, p_lat: deviceLocation?.latitude, p_lng: deviceLocation?.longitude }).single();
      if (request !== generation.current) return;
      if (error) throw error;
      setPickup(data);
    } else setPickup(null);
    setLoadError(false);
    } catch { if (request === generation.current) setLoadError(true); }
    finally { if (request === generation.current) setInitialLoading(false); }
  }, [deviceLocation, userId, marketId, itemIds]);
  useFocusEffect(useCallback(() => {
    if (userId) void loadCheckout();
    const counter = generation;
    return () => { counter.current++; };
  }, [loadCheckout, userId]));
  const refreshCheckout = async () => {
    setRefreshing(true);
    try {
      await loadCheckout();
      if (userId) {
        const { data } = await (supabase as any).from("demo_accounts").select("wallet_balance").eq("user_id", userId).maybeSingle();
        setDemoBalance(Number(data?.wallet_balance ?? 0));
      }
    } finally { setRefreshing(false); }
  };

  const submit = async () => {
    if (submitting.current || initialLoading || loadError) return;
    if (!cart) return Alert.alert("ไม่พบสินค้าในตะกร้า");
    if (fulfillment === "delivery" && !addressId) return Alert.alert("กรุณาเลือกที่อยู่จัดส่ง");
    if (fulfillment === "pickup" && !pickup?.eligible) return Alert.alert("ไม่สามารถเลือกนัดรับได้", "นัดรับได้เมื่อคุณอยู่ห่างจุดรวมไม่เกิน 10 กิโลเมตร");
    const total = cart.cart_items.reduce((sum: number, item: any) => sum + Number(item.stores.unit_price) * item.quantity, 0);
    if (payment === "demo_wallet" && demoBalance < total) return Alert.alert("ยอดจำลองไม่พอ", "กรุณาเติมยอดสาธิตหรือเลือกชำระเมื่อได้รับสินค้า", [
      { text: "เลือก COD", onPress: () => setPayment("cod") },
      { text: "ไปหน้า Wallet", onPress: () => router.push("/profile/wallet" as never) },
    ]);
    setLoading(true);
    submitting.current = true;
    try {
    const items = cart.cart_items.map((item: any) => ({ store_id: item.store_id, quantity: item.quantity }));
    const args = {
      p_market_id: cart.market_id, p_address_id: fulfillment === "delivery" ? addressId! : null, p_items: items,
      p_fulfillment_method: fulfillment, p_lat: deviceLocation?.latitude, p_lng: deviceLocation?.longitude,
    };
    const fingerprint = JSON.stringify({ userId, marketId: cart.market_id, addressId: args.p_address_id, items, fulfillment, payment });
    if (!retry.current || retry.current.fingerprint !== fingerprint) retry.current = { fingerprint, requestId: Crypto.randomUUID() };
    const { data, error } = payment === "demo_wallet"
      ? await (supabase as any).rpc("create_demo_wallet_order", { ...args, p_request_id: retry.current.requestId })
      : await supabase.rpc("create_cod_order_once", { ...args, p_request_id: retry.current.requestId });
    if (error) return Alert.alert("สั่งซื้อไม่สำเร็จ", translateDatabaseError(error));
    retry.current = null;
    router.replace(`/order/${data}` as never);
    } catch { Alert.alert("สั่งซื้อไม่สำเร็จ", "การเชื่อมต่อขัดข้อง กรุณาลองใหม่โดยไม่เปลี่ยนรายการสินค้า"); }
    finally { submitting.current = false; setLoading(false); }
  };

  const addressOptions = addresses.map((address) => {
    const sub = address.thai_subdistricts; const district = sub?.thai_districts;
    const fullAddress = `${address.address_line} ${sub?.name_th ?? ""} ${district?.name_th ?? ""} ${district?.thai_provinces?.name_th ?? ""} ${address.postal_code}`.replace(/\s+/g, " ").trim();
    return { value: String(address.address_id), label: `${address.recipient_name} · ${address.phone}`, description: fullAddress };
  });

  return <View style={styles.root}>
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomAction.contentBottom }]} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refreshCheckout()} tintColor={Colors.greenPrimary} />}>
    <ScreenHeader title={"วิธีรับสินค้า"} titleStyle={styles.title} />
      {initialLoading ? <Text style={styles.detail}>กำลังโหลดตะกร้าและที่อยู่...</Text> : null}
      {loadError ? <LoadNotice onRetry={() => void refreshCheckout()} /> : null}
      {!initialLoading && !loadError && !cart?.cart_items?.length ? <Button title="กลับไปเลือกสินค้ารายตลาดในตะกร้า" variant="outline" onPress={() => router.replace("/order/cart" as never)} /> : null}
      {cart ? <Text style={styles.name}>สั่งซื้อจาก {cart.market_name}</Text> : null}
      <ContextHelp title="เลือกวิธีรับสินค้าแบบไหนดี?" steps={["เลือกจัดส่งถึงที่อยู่ หากต้องการให้ส่งสินค้าถึงบ้าน", "เลือกนัดรับ เมื่ออยู่ห่างจุดรวมไม่เกิน 10 กิโลเมตร", "เลือกชำระเมื่อรับสินค้า หรือใช้ยอดจำลองสำหรับการสาธิต"]} />
      <TouchableOpacity style={[styles.method, fulfillment === "delivery" && styles.selected]} onPress={() => setFulfillment("delivery")}><Ionicons name="car-outline" size={24} color={Colors.greenPrimary} /><View style={{ flex: 1 }}><Text style={styles.name}>จัดส่งถึงที่อยู่</Text><Text style={styles.detail}>รวมสินค้าจากผู้ขายในตลาดนี้เป็นพัสดุเดียว</Text></View></TouchableOpacity>
      <TouchableOpacity style={[styles.method, fulfillment === "pickup" && styles.selected, !pickup?.eligible && styles.disabled]} disabled={!pickup?.eligible} onPress={() => setFulfillment("pickup")}><Ionicons name="storefront-outline" size={24} color={pickup?.eligible ? Colors.greenPrimary : Colors.textMuted} /><View style={{ flex: 1 }}><Text style={styles.name}>นัดรับที่จุดรวมสินค้า</Text><Text style={styles.detail}>{pickup?.eligible ? `ห่างประมาณ ${pickup.distance_km} กม. · ${pickup.hub_address}` : "ใช้ได้เมื่ออยู่ห่างจุดรวมไม่เกิน 10 กม."}</Text></View></TouchableOpacity>

      {fulfillment === "delivery" ? <><Text style={styles.title}>ที่อยู่จัดส่ง</Text>
        {!addresses.length ? <TouchableOpacity style={styles.add} onPress={() => router.push("/profile/shipping-address" as never)}><Text style={styles.addText}>+ เพิ่มที่อยู่จัดส่ง</Text></TouchableOpacity> : <><SearchableDropdown placeholder="เลือกที่อยู่จัดส่ง" options={addressOptions} value={addressId ? String(addressId) : undefined} searchPlaceholder="ค้นหาชื่อผู้รับหรือที่อยู่" onChange={(value) => setAddressId(Number(value))} /><TouchableOpacity onPress={() => router.push("/profile/shipping-address" as never)}><Text style={styles.manage}>จัดการที่อยู่จัดส่ง</Text></TouchableOpacity></>}
      </> : <View style={styles.pickupInfo}><Text style={styles.name}>ขั้นตอนนัดรับ</Text><Text style={styles.detail}>รับคำสั่งซื้อ → ผู้ขายกำลังเตรียม → สินค้าถึงจุดรวมพร้อมรับ → คุณกดยืนยันหลังได้รับสินค้า</Text></View>}

      <Text style={styles.title}>การชำระเงิน</Text>
      <TouchableOpacity style={[styles.cod, payment === "cod" && styles.selected]} onPress={() => setPayment("cod")}><Text style={styles.name}>ชำระเงินเมื่อได้รับสินค้า (COD)</Text><Text style={styles.detail}>{fulfillment === "pickup" ? "ชำระเงินเมื่อมารับสินค้าที่จุดรวม" : "ชำระเงินกับผู้จัดส่งเมื่อได้รับสินค้า"}</Text></TouchableOpacity>
      <TouchableOpacity style={[styles.cod, payment === "demo_wallet" && styles.selected]} onPress={() => setPayment("demo_wallet")}><Text style={styles.name}>ใช้ยอดจำลอง · ไม่ใช่เงินจริง</Text><Text style={styles.detail}>ยอดคงเหลือสาธิต ฿{demoBalance.toLocaleString()} · ไม่มีการตัดเงินจริง</Text></TouchableOpacity>
      {payment === "demo_wallet" ? <TouchableOpacity onPress={() => router.push("/profile/wallet" as never)}><Text style={styles.manage}>ดู Wallet / ขอยอดสาธิต</Text></TouchableOpacity> : null}
      <Text style={styles.title}>รายการสินค้า</Text>{cart?.cart_items?.map((item: any) => <View key={item.store_id} style={styles.line}><Text style={styles.detail}>{item.stores.product_name} × {formatSaleQuantity(item.quantity, item.stores.unit)}</Text><Text style={styles.name}>฿{(Number(item.stores.unit_price) * item.quantity).toLocaleString()}</Text></View>)}
    </ScrollView>
    <View onLayout={bottomAction.onLayout} style={[styles.bottom, { paddingBottom: bottomAction.paddingBottom }]}><Button title={payment === "demo_wallet" ? "ยืนยันและหักยอดจำลอง" : fulfillment === "pickup" ? "ยืนยันคำสั่งซื้อแบบนัดรับ" : "ยืนยันคำสั่งซื้อและชำระเมื่อได้รับสินค้า"} loading={loading} onPress={submit} disabled={initialLoading || loadError || !cart?.cart_items?.length || (fulfillment === "delivery" ? !addressId : !pickup?.eligible)} style={styles.button} /></View>
  </View>;
}

const baseStyles = StyleSheet.create({ root: { flex: 1, backgroundColor: Colors.background }, content: { padding: Spacing.lg, paddingTop: 0, paddingBottom: 150 }, title: { fontFamily: "Kanit_700Bold", fontSize: 22, color: Colors.greenPrimary, marginTop: 14, marginBottom: 10 }, method: { flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: "white", borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: BorderRadius.lg, padding: 15, marginBottom: 9 }, selected: { borderColor: Colors.greenPrimary, borderWidth: 2, backgroundColor: "#F0F7F2" }, disabled: { opacity: 0.55 }, add: { backgroundColor: "white", borderWidth: 1, borderStyle: "dashed", borderColor: Colors.greenPrimary, borderRadius: BorderRadius.md, padding: 18 }, addText: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary, textAlign: "center" }, manage: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary, textAlign: "right", marginTop: -8, marginBottom: 8 }, cod: { backgroundColor: "white", borderRadius: BorderRadius.md, padding: 16, borderWidth: 1, borderColor: Colors.goldPrimary, marginBottom: 9 }, pickupInfo: { backgroundColor: "#FFF5D9", borderRadius: BorderRadius.lg, padding: 16, marginTop: 12 }, name: { fontFamily: "Kanit_700Bold", color: Colors.textDark }, detail: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, flex: 1 }, line: { flexDirection: "row", justifyContent: "space-between", gap: 12, backgroundColor: "white", padding: 14, borderRadius: BorderRadius.md, marginBottom: 8 }, bottom: { position: "absolute", left: 0, right: 0, bottom: 0, padding: Spacing.lg, backgroundColor: "white", borderTopWidth: 1, borderTopColor: Colors.inputBorder }, button: { backgroundColor: Colors.goldPrimary } });
