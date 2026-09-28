/* eslint-disable react-hooks/set-state-in-effect */
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { KeyboardAwareScrollView } from "../../src/components/KeyboardAware";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../../src/components/Button";
import { BorderRadius, Colors, Shadows, Spacing } from "../../src/constants/theme";
import { useAuth } from "../../src/context/AuthContext";
import { translateDatabaseError } from "../../src/lib/databaseError";
import { SelectedImage, selectSquareImage, uploadPrivateImage } from "../../src/lib/storage";
import { supabase } from "../../src/lib/supabase";

export default function StoreDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [store, setStore] = useState<any>();
  const [stock, setStock] = useState(0);
  const [sameArea, setSameArea] = useState(false);
  const [application, setApplication] = useState<any>();
  const [isSeller, setSeller] = useState(false);
  const [note, setNote] = useState("");
  const [sellerImage, setSellerImage] = useState<SelectedImage | null>(null);
  const [sending, setSending] = useState(false);
  const [adding, setAdding] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const storeResult = await supabase.rpc("get_store_catalog", { p_store_id: Number(id) });
    const currentStore = storeResult.data as any;
    setStore(currentStore);
    setStock(Number(currentStore?.available_stock ?? 0));
    if (session?.user.id && currentStore) {
      const [applicationResult] = await Promise.all([
        supabase.from("store_seller_applications").select("application_id,status,review_note,note,product_image_url").eq("store_id", Number(id)).eq("applicant_id", session.user.id).maybeSingle(),
      ]);
      setSameArea(Boolean(currentStore.same_area));
      setApplication(applicationResult.data); setSeller(Boolean(currentStore.is_seller));
    }
    setLoading(false);
  }, [id, session]);
  useEffect(() => { void load(); }, [load]);
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
      setToast(`เพิ่ม ${quantity} ${store.unit}แล้ว · ในตะกร้ามี ${data} ${store.unit}`);
      setQuantity(1);
    }
  };
  const chat = async () => {
    if (!session) return router.push("/(auth)/sign-in" as never);
    const { data, error } = await supabase.rpc("get_or_create_chat_room", { p_store_id: Number(id) });
    if (error) Alert.alert("เปิดแชตไม่สำเร็จ", translateDatabaseError(error));
    else router.push(`/chat/${data}` as never);
  };
  const chooseSellerImage = async () => {
    try { setSellerImage(await selectSquareImage()); }
    catch { Alert.alert("เลือกรูปไม่สำเร็จ", "รองรับเฉพาะรูป JPG, PNG และ WebP กรุณาลองใหม่อีกครั้ง"); }
  };
  const applyToSell = async () => {
    if (!session) return router.push("/(auth)/sign-in" as never);
    if (!sellerImage) return Alert.alert("กรุณาแนบรูปสินค้า", "ใช้รูปสินค้าจริงของคุณเพื่อให้เจ้าของตลาดตรวจสอบก่อนอนุมัติ");
    setSending(true);
    let uploadedPath: string | null = null;
    try {
      const uploaded = await uploadPrivateImage("seller-evidence", session.user.id, sellerImage, `seller-product-${id}`);
      uploadedPath = uploaded.path;
      const { error } = await supabase.rpc("apply_to_sell_in_store", { p_store_id: Number(id), p_note: note.trim() || undefined, p_product_image_url: uploaded.path });
      if (error) throw error;
      uploadedPath = null;
      setSellerImage(null);
      Alert.alert("ส่งคำขอร่วมขายแล้ว", "เจ้าของตลาดชุมชนจะตรวจรูปสินค้าและข้อมูลของคุณ");
      await load();
    } catch (error: any) {
      if (uploadedPath) await supabase.storage.from("seller-evidence").remove([uploadedPath]);
      Alert.alert("ส่งคำขอไม่สำเร็จ", translateDatabaseError(error));
    }
    finally { setSending(false); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={Colors.greenPrimary} /></View>;
  if (!store) return <View style={styles.center}><Text>ไม่พบร้านค้า</Text></View>;
  const isManager = Boolean(store.is_manager);
  const cannotBuyOwn = Boolean(session && (isManager || isSeller));
  const sellerImagePicker = <TouchableOpacity style={styles.applicationImagePicker} onPress={chooseSellerImage}>{sellerImage?<Image source={{uri:sellerImage.uri}} style={styles.applicationImage}/>:<View style={styles.applicationImageEmpty}><Ionicons name="camera-outline" size={28} color={Colors.greenPrimary}/><Text style={styles.applicationImageText}>แนบรูปสินค้าของคุณ (จำเป็น)</Text></View>}</TouchableOpacity>;

  return <View style={styles.root}>
    <KeyboardAwareScrollView contentContainerStyle={{ paddingBottom: 150 }}>
      {store.image_url ? <Image source={{ uri: store.image_url }} style={styles.image} /> : <View style={[styles.image, styles.placeholder]}><Ionicons name="basket" size={54} color={Colors.greenPrimary} /></View>}
      <TouchableOpacity style={[styles.back, { top: insets.top + 10 }]} onPress={() => router.back()}><Ionicons name="arrow-back" size={22} /></TouchableOpacity>
      <View style={styles.body}>
        <Text style={styles.market}>{store.markets?.name}</Text><Text style={styles.title}>{store.name}</Text><Text style={styles.product}>{store.product_name}</Text><Text style={styles.desc}>{store.description}</Text>
        <View style={styles.info}><Text style={styles.price}>฿{Number(store.unit_price).toLocaleString()} / {store.unit}</Text><Text style={styles.stock}>พร้อมขาย {stock} {store.unit}</Text></View>
        {cannotBuyOwn ? <View style={styles.ownStoreNotice}><Ionicons name="information-circle-outline" size={22} color={Colors.greenPrimary} /><Text style={styles.ownStoreText}>นี่คือร้านที่คุณดูแลหรือร่วมขาย จึงไม่สามารถสั่งซื้อจากร้านนี้ด้วยบัญชีเดียวกันได้</Text></View> : null}
        {stock > 0 && !cannotBuyOwn ? <View style={styles.quantityBox}>
          <View><Text style={styles.quantityTitle}>เลือกจำนวน</Text><Text style={styles.quantityHint}>จำนวนที่ต้องการใส่ตะกร้า</Text></View>
          <View style={styles.quantityControl}>
            <TouchableOpacity style={styles.quantityButton} onPress={() => changeQuantity(quantity - 1)} disabled={quantity <= 1} accessibilityLabel="ลดจำนวน"><Ionicons name="remove" size={22} color={quantity <= 1 ? Colors.textLight : Colors.greenPrimary} /></TouchableOpacity>
            <TextInput style={styles.quantityInput} value={String(quantity)} onChangeText={(value) => changeQuantity(Number(value.replace(/\D/g, "")) || 1)} keyboardType="number-pad" selectTextOnFocus accessibilityLabel="จำนวนสินค้า" />
            <TouchableOpacity style={styles.quantityButton} onPress={() => changeQuantity(quantity + 1)} disabled={quantity >= stock} accessibilityLabel="เพิ่มจำนวน"><Ionicons name="add" size={22} color={quantity >= stock ? Colors.textLight : Colors.greenPrimary} /></TouchableOpacity>
          </View>
        </View> : null}
        <View style={styles.hub}><Ionicons name="cube-outline" size={20} color={Colors.greenPrimary} /><Text style={styles.hubText}>ผู้ขายหลายรายส่งของมารวมที่ {store.markets?.hub_address} แล้วจัดส่งหรือรอลูกค้ามารับที่จุดรวม</Text></View>
        {isManager ? <Button title="แก้ไขข้อมูลร้าน" variant="outline" onPress={() => router.push({ pathname: "/store/manage/edit", params: { storeId: id } } as never)} style={{ marginTop: 14 }} /> : null}
        {!isManager && !isSeller && session ? <View style={styles.sellerBox}>
          <Text style={styles.sellerTitle}>มีสินค้าชนิดเดียวกัน?</Text>
          {application?.status === "pending" ? <Text style={styles.pending}>คำขอร่วมขายกำลังรอเจ้าของตลาดชุมชนตรวจสอบ</Text>
            : application?.status === "rejected" ? <><Text style={styles.rejected}>คำขอเดิมไม่ผ่าน: {application.review_note || "ไม่ระบุเหตุผล"}</Text>{sellerImagePicker}<TextInput style={styles.note} placeholder="ข้อมูลเพิ่มเติมสำหรับสมัครใหม่" value={note} onChangeText={setNote} multiline /><Button title="ส่งคำขอใหม่" onPress={applyToSell} loading={sending} /></>
              : sameArea ? <>{sellerImagePicker}<TextInput style={styles.note} placeholder="แนะนำตัวหรือรายละเอียดสินค้าของคุณ" value={note} onChangeText={setNote} multiline /><Button title="ขอเป็นผู้ขายร่วม" onPress={applyToSell} loading={sending} /></>
                : <Text style={styles.rejected}>คุณจะร่วมขายได้เมื่อพื้นที่หลักอยู่ตำบลเดียวกับตลาดชุมชนนี้</Text>}
        </View> : null}
        {isSeller ? <TouchableOpacity onPress={() => router.push("/seller/listings" as never)}><Text style={styles.chat}>แก้ไขจำนวนสินค้าที่พร้อมขาย</Text></TouchableOpacity> : null}
        <TouchableOpacity onPress={chat}><Text style={styles.chat}>แชตกับผู้ดูแลร้าน</Text></TouchableOpacity>
      </View>
    </KeyboardAwareScrollView>
    {toast ? <View style={styles.toast} accessibilityLiveRegion="polite"><Ionicons name="checkmark-circle" size={21} color={Colors.textWhite} /><Text style={styles.toastText}>{toast}</Text></View> : null}
    <View style={styles.bottom}><Button title={cannotBuyOwn ? "ไม่สามารถสั่งสินค้าร้านของตนเอง" : stock > 0 ? `เพิ่ม ${quantity} ${store.unit}ลงตะกร้า` : "สินค้าหมด"} disabled={stock <= 0 || cannotBuyOwn} loading={adding} onPress={add} style={{ backgroundColor: Colors.goldPrimary }} /></View>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background }, center: { flex: 1, alignItems: "center", justifyContent: "center" }, image: { width: "100%", height: 280 },
  placeholder: { alignItems: "center", justifyContent: "center", backgroundColor: "#EAF1E9" }, back: { position: "absolute", left: 18, width: 42, height: 42, borderRadius: 21, backgroundColor: "#FFFFFFDD", alignItems: "center", justifyContent: "center" },
  body: { padding: Spacing.lg }, market: { fontFamily: "Kanit_500Medium", color: Colors.goldDark }, title: { fontFamily: "Kanit_700Bold", fontSize: 27, color: Colors.greenPrimary },
  product: { fontFamily: "Kanit_700Bold", fontSize: 18, color: Colors.textDark }, desc: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, lineHeight: 21, marginTop: 8 },
  info: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: 20 }, price: { fontFamily: "Kanit_700Bold", fontSize: 22, color: Colors.greenPrimary }, stock: { fontFamily: "Kanit_500Medium", color: Colors.textMedium },
  ownStoreNotice: { flexDirection: "row", gap: 9, padding: 14, marginBottom: 16, borderRadius: BorderRadius.lg, backgroundColor: "#EAF1E9" }, ownStoreText: { flex: 1, fontFamily: "Kanit_400Regular", color: Colors.greenDark },
  quantityBox: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 14, marginBottom: 16, backgroundColor: Colors.cardBackground, borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: BorderRadius.lg }, quantityTitle: { fontFamily: "Kanit_700Bold", color: Colors.textDark }, quantityHint: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, fontSize: 12 }, quantityControl: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: BorderRadius.round, overflow: "hidden" }, quantityButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center" }, quantityInput: { width: 46, height: 42, textAlign: "center", fontFamily: "Kanit_700Bold", color: Colors.textDark, paddingVertical: 0 },
  hub: { flexDirection: "row", gap: 10, padding: Spacing.md, backgroundColor: "#EAF1E9", borderRadius: BorderRadius.lg }, hubText: { flex: 1, fontFamily: "Kanit_400Regular", color: Colors.greenDark },
  sellerBox: { marginTop: 16, backgroundColor: "white", borderRadius: BorderRadius.lg, padding: 16, borderWidth: 1, borderColor: Colors.inputBorder }, sellerTitle: { fontFamily: "Kanit_700Bold", color: Colors.textDark, fontSize: 17 },
  applicationImagePicker: { height: 150, borderWidth: 1, borderStyle: "dashed", borderColor: Colors.greenPrimary, borderRadius: 12, overflow: "hidden", marginTop: 12 },
  applicationImage: { width: "100%", height: "100%" }, applicationImageEmpty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#F0F7F2" }, applicationImageText: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary },
  note: { minHeight: 76, borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: 12, padding: 12, fontFamily: "Kanit_400Regular", textAlignVertical: "top", marginVertical: 10 },
  pending: { fontFamily: "Kanit_400Regular", color: Colors.goldDark, marginTop: 6 }, rejected: { fontFamily: "Kanit_400Regular", color: Colors.danger, marginTop: 6 },
  chat: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary, textAlign: "center", padding: 18 }, toast: { position: "absolute", left: Spacing.lg, right: Spacing.lg, bottom: 92, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: BorderRadius.round, backgroundColor: Colors.greenPrimary, ...Shadows.toast }, toastText: { flexShrink: 1, fontFamily: "Kanit_500Medium", color: Colors.textWhite, textAlign: "center" }, bottom: { position: "absolute", left: 0, right: 0, bottom: 0, padding: Spacing.md, backgroundColor: "white", borderTopWidth: 1, borderTopColor: Colors.inputBorder },
});
