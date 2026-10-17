import { useBottomActionLayout } from "../../src/hooks/useBottomActionLayout";
import { useResponsiveStyles } from "../../src/hooks/useResponsiveStyles";
import { BackButton } from "../../src/components/BackButton";
import { ScreenHeader } from "../../src/components/ScreenHeader";
import { LoadNotice } from "../../src/components/LoadNotice";
import { useRealtimeRefresh, type RealtimeWatch } from "../../src/hooks/useRealtimeRefresh";
import { ContextImage } from "../../src/components/ContextImage";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AppTextInput } from "../../src/components/AppTextInput";
import { KeyboardAwareScrollView } from "../../src/components/KeyboardAware";
import { Button } from "../../src/components/Button";
import { CatalogActions } from "../../src/components/CatalogActions";
import { BorderRadius, Colors, Shadows, Spacing } from "../../src/constants/theme";
import { useAuth } from "../../src/context/AuthContext";
import { translateDatabaseError } from "../../src/lib/databaseError";
import { sellerJoinAction } from "../../src/lib/sellerJoin";
import { supabase } from "../../src/lib/supabase";
import { formatSaleQuantity } from "../../src/lib/productUnit";

export default function StoreDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  return <StoreDetailContent key={`${session?.user.id}:${id}`} />;
}
function StoreDetailContent() {
  const styles = useResponsiveStyles(baseStyles, {});
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const bottomAction = useBottomActionLayout();
  const { session } = useAuth();
  const [store, setStore] = useState<any>();
  const [stock, setStock] = useState(0);
  const [sameArea, setSameArea] = useState(false);
  const [application, setApplication] = useState<{ status: string } | null>(null);
  const [isSeller, setSeller] = useState(false);
  const [adding, setAdding] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const generation = useRef(0);

  const load = useCallback(async () => {
    const request = ++generation.current;
    try {
    const storeResult = await supabase.rpc("get_store_catalog", { p_store_id: Number(id) });
    if (request !== generation.current) return;
    if (storeResult.error) throw storeResult.error;
    const currentStore = storeResult.data as any;
    if (session?.user.id && currentStore) {
      const [applicationResult] = await Promise.all([
        supabase.from("store_seller_applications").select("status").eq("store_id", Number(id)).eq("applicant_id", session.user.id).maybeSingle(),
      ]);
      if (request !== generation.current) return;
      if (applicationResult.error) throw applicationResult.error;
      setSameArea(Boolean(currentStore.same_area));
      setApplication(applicationResult.data); setSeller(Boolean(currentStore.is_seller));
    }
    setStore(currentStore);
    setStock(Number(currentStore?.available_stock ?? 0));
    setQuantity((current) => Math.min(current, Math.max(1, Number(currentStore?.available_stock ?? 0))));
    setLoadError(false);
    setRefreshVersion((value) => value + 1);
    } catch { if (request === generation.current) setLoadError(true); }
    finally { if (request === generation.current) setLoading(false); }
  }, [id, session]);
  useFocusEffect(useCallback(() => { void load(); return () => { generation.current++; }; }, [load]));
  const watches = useMemo<RealtimeWatch[]>(() => [
    { table: "stores", event: "UPDATE", filter: `store_id=eq.${id}` },
    { table: "seller_listings", event: "INSERT", filter: `store_id=eq.${id}` },
    { table: "seller_listings", event: "UPDATE", filter: `store_id=eq.${id}` },
    { table: "store_seller_applications", event: "UPDATE", filter: `store_id=eq.${id}` },
  ], [id]);
  useRealtimeRefresh(`store-detail-${id}`, load, watches);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(timer);
  }, [toast]);

  const changeQuantity = (next: number) => setQuantity(Math.min(Math.max(stock, 1), Math.max(1, next)));

  const add = async () => {
    if (!session) return router.push("/(auth)/sign-in" as never);
    if (store.is_manager || isSeller) return Alert.alert("ไม่สามารถสั่งร้านของตนเอง", "บัญชีเจ้าของร้านและผู้ขายร่วมไม่สามารถซื้อสินค้าจากร้านที่ตนขายอยู่ได้");
    setAdding(true);
    const { data, error } = await supabase.rpc("increment_cart_item", { p_store_id: Number(id), p_increment: quantity });
    setAdding(false);
    if (error) Alert.alert("เพิ่มไม่ได้", translateDatabaseError(error));
    else {
      setToast(`เพิ่ม ${formatSaleQuantity(quantity, store.unit)}แล้ว · ในตะกร้ามี ${formatSaleQuantity(Number(data), store.unit)}`);
      setQuantity(1);
    }
  };
  const chat = async () => {
    if (!session) return router.push("/(auth)/sign-in" as never);
    const { data, error } = await supabase.rpc("get_or_create_chat_room", { p_store_id: Number(id) });
    if (error) Alert.alert("เปิดแชตไม่สำเร็จ", translateDatabaseError(error));
    else router.push(`/chat/${data}` as never);
  };


  if (loading) return <View style={styles.center}><BackButton floating /><ActivityIndicator color={Colors.greenPrimary} /></View>;
  if (!store) return <View style={styles.center}><BackButton floating />{loadError ? <LoadNotice onRetry={() => void load()} /> : <Text>ไม่พบร้านค้า</Text>}</View>;
  const isManager = Boolean(store.is_manager);
  const cannotBuyOwn = Boolean(session && (isManager || isSeller));
  const joinLabel = sellerJoinAction({ signedIn: !!session, sameArea, isManager, isSeller, status: application?.status });

  return <View style={styles.root}>
    <KeyboardAwareScrollView contentContainerStyle={{ paddingBottom: bottomAction.contentBottom }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load().then(() => setRefreshVersion((value) => value + 1)).finally(() => setRefreshing(false)); }} tintColor={Colors.greenPrimary} />}>
      {loadError ? <LoadNotice onRetry={() => void load()} /> : null}
      <ScreenHeader contentInset={0} title={store.name} titleStyle={styles.title} />
      <ContextImage uri={store.image_url} name={store.product_name || store.name} size={280} style={styles.image} />
      <View style={styles.body}>
        <TouchableOpacity accessibilityRole="link" accessibilityLabel={`ดูตลาด ${store.markets?.name ?? "ชุมชน"}`} onPress={() => router.push(`/market/${store.market_id}` as never)} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8 }}><Ionicons name="storefront-outline" size={18} color={Colors.goldDark} /><Text style={styles.market}>{store.markets?.name} · ดูตลาด</Text><Ionicons name="chevron-forward" size={17} color={Colors.goldDark} /></TouchableOpacity><Text style={styles.product}>{store.product_name}</Text>
        <View style={styles.info}><Text style={styles.price}>฿{Number(store.unit_price).toLocaleString()} / {store.unit}</Text><Text style={styles.stock}>พร้อมขาย {formatSaleQuantity(stock, store.unit)}</Text></View>
        <CatalogActions targetType="store" targetId={Number(id)} refreshVersion={refreshVersion}>
        {stock > 0 && !cannotBuyOwn ? <View style={styles.quantityBox}>
          <View><Text style={styles.quantityTitle}>เลือกจำนวน</Text><Text style={styles.quantityHint}>จำนวนที่ต้องการใส่ตะกร้า</Text></View>
          <View style={styles.quantityControl}>
            <TouchableOpacity style={styles.quantityButton} onPress={() => changeQuantity(quantity - 1)} disabled={quantity <= 1} accessibilityLabel="ลดจำนวน"><Ionicons name="remove" size={22} color={quantity <= 1 ? Colors.textLight : Colors.greenPrimary} /></TouchableOpacity>
            <AppTextInput style={styles.quantityInput} value={String(quantity)} onChangeText={(value) => changeQuantity(Number(value.replace(/\D/g, "")) || 1)} keyboardType="number-pad" selectTextOnFocus accessibilityLabel="จำนวนสินค้า" />
            <TouchableOpacity style={styles.quantityButton} onPress={() => changeQuantity(quantity + 1)} disabled={quantity >= stock} accessibilityLabel="เพิ่มจำนวน"><Ionicons name="add" size={22} color={quantity >= stock ? Colors.textLight : Colors.greenPrimary} /></TouchableOpacity>
          </View>
        </View> : null}
        {stock > 0 && !cannotBuyOwn ? <Text style={styles.subtotal}>รวม ฿{(Number(store.unit_price) * quantity).toLocaleString("th-TH")}</Text> : null}
        <TouchableOpacity accessibilityRole="button" style={styles.contact} onPress={chat}><Ionicons name="chatbubble-ellipses-outline" size={20} color={Colors.greenPrimary} /><Text style={styles.contactLabel}>สอบถามผู้ดูแลร้าน</Text></TouchableOpacity>
        {joinLabel ? <Button title={joinLabel} variant="outline" onPress={() => router.push({ pathname: "/seller/listings/apply", params: { storeId: id } } as never)} style={{ marginBottom: 20 }} /> : null}
        {store.description?.trim() ? <><Text style={styles.sectionHeading}>รายละเอียดสินค้า</Text><Text style={styles.desc}>{store.description}</Text></> : null}
        <View style={styles.hub}><Ionicons name="cube-outline" size={20} color={Colors.greenPrimary} /><Text style={styles.hubText}>จุดรวมสินค้า: {store.markets?.hub_address}</Text></View>
        </CatalogActions>
        {isManager ? <Button title="แก้ไขข้อมูลร้าน" variant="outline" onPress={() => router.push({ pathname: "/store/manage/edit", params: { storeId: id } } as never)} style={{ marginTop: 14 }} /> : null}
        {isSeller ? <TouchableOpacity onPress={() => router.push("/seller/listings" as never)}><Text style={styles.chat}>แก้ไขจำนวนสินค้าที่พร้อมขาย</Text></TouchableOpacity> : null}
      </View>
    </KeyboardAwareScrollView>
    {toast ? <View style={[styles.toast, { bottom: bottomAction.height + 12 }]} accessibilityLiveRegion="polite"><Ionicons name="checkmark-circle" size={21} color={Colors.textWhite} /><Text style={styles.toastText}>{toast}</Text></View> : null}
    <View onLayout={bottomAction.onLayout} style={[styles.bottom, { paddingBottom: bottomAction.paddingBottom }]}><Button title={cannotBuyOwn ? "สั่งซื้อร้านของตนเองไม่ได้" : stock > 0 ? `เพิ่ม ${formatSaleQuantity(quantity, store.unit)}ลงตะกร้า` : "สินค้าหมด"} disabled={stock <= 0 || cannotBuyOwn} loading={adding} onPress={add} style={{ backgroundColor: Colors.goldPrimary }} /></View>
  </View>;
}

const baseStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background }, center: { flex: 1, alignItems: "center", justifyContent: "center" }, image: { width: "100%", height: 280 },
  placeholder: { alignItems: "center", justifyContent: "center", backgroundColor: "#EAF1E9" }, back: { position: "absolute", left: 18, width: 42, height: 42, borderRadius: 21, backgroundColor: "#FFFFFFDD", alignItems: "center", justifyContent: "center" },
  body: { padding: Spacing.lg }, market: { fontFamily: "Kanit_500Medium", color: Colors.goldDark }, title: { fontFamily: "Kanit_700Bold", fontSize: 27, color: Colors.greenPrimary },
  product: { fontFamily: "Kanit_700Bold", fontSize: 18, color: Colors.textDark }, desc: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, lineHeight: 21, marginTop: 8 },
  info: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "space-between", alignItems: "center", marginVertical: 20 }, price: { fontFamily: "Kanit_700Bold", fontSize: 22, color: Colors.greenPrimary }, stock: { fontFamily: "Kanit_500Medium", color: Colors.textMedium },
  ownStoreNotice: { flexDirection: "row", gap: 9, padding: 14, marginBottom: 16, borderRadius: BorderRadius.lg, backgroundColor: "#EAF1E9" }, ownStoreText: { flex: 1, fontFamily: "Kanit_400Regular", color: Colors.greenDark },
  quantityBox: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 14, marginBottom: 16, backgroundColor: Colors.cardBackground, borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: BorderRadius.lg }, quantityTitle: { fontFamily: "Kanit_700Bold", color: Colors.textDark }, quantityHint: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, fontSize: 12 }, quantityControl: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: BorderRadius.round, overflow: "hidden" }, quantityButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center" }, quantityInput: { width: 46, height: 42, textAlign: "center", fontFamily: "Kanit_700Bold", color: Colors.textDark, paddingVertical: 0 },
  subtotal: { fontFamily: "Kanit_700Bold", color: Colors.greenPrimary, fontSize: 20, marginBottom: 12 },
  contact: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: 12, padding: 12, marginBottom: 18 },
  contactLabel: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary, flexShrink: 1 },
  sectionHeading: { fontFamily: "Kanit_700Bold", fontSize: 18, color: Colors.textDark },
  hub: { flexDirection: "row", gap: 10, padding: Spacing.md, marginTop: 16, backgroundColor: "#EAF1E9", borderRadius: BorderRadius.lg }, hubText: { flex: 1, fontFamily: "Kanit_400Regular", color: Colors.greenDark },
  sellerBox: { marginTop: 16, backgroundColor: "white", borderRadius: BorderRadius.lg, padding: 16, borderWidth: 1, borderColor: Colors.inputBorder }, sellerTitle: { fontFamily: "Kanit_700Bold", color: Colors.textDark, fontSize: 17 },
  applicationImagePicker: { height: 150, borderWidth: 1, borderStyle: "dashed", borderColor: Colors.greenPrimary, borderRadius: 12, overflow: "hidden", marginTop: 12 },
  applicationImage: { width: "100%", height: "100%" }, applicationImageEmpty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#F0F7F2" }, applicationImageText: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary },
  note: { minHeight: 76, borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: 12, padding: 12, fontFamily: "Kanit_400Regular", textAlignVertical: "top", marginVertical: 10 },
  pending: { fontFamily: "Kanit_400Regular", color: Colors.goldDark, marginTop: 6 }, rejected: { fontFamily: "Kanit_400Regular", color: Colors.danger, marginTop: 6 },
  chat: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary, textAlign: "center", padding: 18 }, toast: { position: "absolute", left: Spacing.lg, right: Spacing.lg, bottom: 92, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: BorderRadius.round, backgroundColor: Colors.greenPrimary, ...Shadows.toast }, toastText: { flexShrink: 1, fontFamily: "Kanit_500Medium", color: Colors.textWhite, textAlign: "center" }, bottom: { position: "absolute", left: 0, right: 0, bottom: 0, padding: Spacing.md, backgroundColor: "white", borderTopWidth: 1, borderTopColor: Colors.inputBorder },
});
