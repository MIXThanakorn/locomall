/* eslint-disable react-hooks/set-state-in-effect */
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { KeyboardAwareScrollView } from "../../src/components/KeyboardAware";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../../src/components/Button";
import { BorderRadius, Colors, Spacing } from "../../src/constants/theme";
import { useAuth } from "../../src/context/AuthContext";
import { translateDatabaseError } from "../../src/lib/databaseError";
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
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const storeResult = await supabase.from("stores").select("*,markets(name,hub_address,subdistrict_code),seller_listings(stock_quantity,reserved_quantity,status)").eq("store_id", Number(id)).single();
    const currentStore = storeResult.data;
    setStore(currentStore);
    setStock((currentStore?.seller_listings ?? []).filter((item: any) => item.status === "active").reduce((sum: number, item: any) => sum + item.stock_quantity - item.reserved_quantity, 0));
    if (session?.user.id && currentStore) {
      const [locationResult, applicationResult, listingResult] = await Promise.all([
        supabase.from("user_locations").select("subdistrict_code").eq("user_id", session.user.id).maybeSingle(),
        supabase.from("store_seller_applications").select("application_id,status,review_note,note").eq("store_id", Number(id)).eq("applicant_id", session.user.id).maybeSingle(),
        supabase.from("seller_listings").select("listing_id").eq("store_id", Number(id)).eq("seller_id", session.user.id).maybeSingle(),
      ]);
      setSameArea(locationResult.data?.subdistrict_code === currentStore.markets?.subdistrict_code);
      setApplication(applicationResult.data); setSeller(Boolean(listingResult.data));
    }
    setLoading(false);
  };
  useEffect(() => { void load(); }, [id, session?.user.id]);

  const add = async () => {
    if (!session) return router.push("/(auth)/sign-in" as never);
    const { data, error } = await supabase.rpc("increment_cart_item", { p_store_id: Number(id), p_increment: 1 });
    if (error) Alert.alert("เพิ่มไม่ได้", translateDatabaseError(error));
    else Alert.alert("เพิ่มลงตะกร้าแล้ว", `ขณะนี้มี ${data} ${store.unit}`);
  };
  const chat = async () => {
    if (!session) return router.push("/(auth)/sign-in" as never);
    const { data, error } = await supabase.from("chat_rooms").upsert({ buyer_id: session.user.id, store_id: Number(id) }, { onConflict: "buyer_id,store_id" }).select("room_id").single();
    if (error) Alert.alert("เปิดแชตไม่สำเร็จ", translateDatabaseError(error));
    else router.push(`/chat/${data.room_id}` as never);
  };
  const applyToSell = async () => {
    if (!session) return router.push("/(auth)/sign-in" as never);
    setSending(true);
    const { error } = await supabase.rpc("apply_to_sell_in_store", { p_store_id: Number(id), p_note: note.trim() || undefined });
    setSending(false);
    if (error) return Alert.alert("ส่งคำขอไม่สำเร็จ", translateDatabaseError(error));
    Alert.alert("ส่งคำขอร่วมขายแล้ว", "เจ้าของตลาดชุมชนจะตรวจสอบข้อมูลของคุณ");
    await load();
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={Colors.greenPrimary} /></View>;
  if (!store) return <View style={styles.center}><Text>ไม่พบร้านค้า</Text></View>;
  const isManager = session?.user.id === store.manager_id;

  return <View style={styles.root}>
    <KeyboardAwareScrollView contentContainerStyle={{ paddingBottom: 150 }}>
      {store.image_url ? <Image source={{ uri: store.image_url }} style={styles.image} /> : <View style={[styles.image, styles.placeholder]}><Ionicons name="basket" size={54} color={Colors.greenPrimary} /></View>}
      <TouchableOpacity style={[styles.back, { top: insets.top + 10 }]} onPress={() => router.back()}><Ionicons name="arrow-back" size={22} /></TouchableOpacity>
      <View style={styles.body}>
        <Text style={styles.market}>{store.markets?.name}</Text><Text style={styles.title}>{store.name}</Text><Text style={styles.product}>{store.product_name}</Text><Text style={styles.desc}>{store.description}</Text>
        <View style={styles.info}><Text style={styles.price}>฿{Number(store.unit_price).toLocaleString()} / {store.unit}</Text><Text style={styles.stock}>พร้อมขาย {stock} {store.unit}</Text></View>
        <View style={styles.hub}><Ionicons name="cube-outline" size={20} color={Colors.greenPrimary} /><Text style={styles.hubText}>ผู้ขายหลายรายส่งของมารวมที่ {store.markets?.hub_address} แล้วจัดส่งหรือรอลูกค้ามารับที่จุดรวม</Text></View>
        {isManager ? <Button title="แก้ไขข้อมูลร้าน" variant="outline" onPress={() => router.push({ pathname: "/store/manage/edit", params: { storeId: id } } as never)} style={{ marginTop: 14 }} /> : null}
        {!isManager && !isSeller && session ? <View style={styles.sellerBox}>
          <Text style={styles.sellerTitle}>มีสินค้าชนิดเดียวกัน?</Text>
          {application?.status === "pending" ? <Text style={styles.pending}>คำขอร่วมขายกำลังรอเจ้าของตลาดชุมชนตรวจสอบ</Text>
            : application?.status === "rejected" ? <><Text style={styles.rejected}>คำขอเดิมไม่ผ่าน: {application.review_note || "ไม่ระบุเหตุผล"}</Text><TextInput style={styles.note} placeholder="ข้อมูลเพิ่มเติมสำหรับสมัครใหม่" value={note} onChangeText={setNote} multiline /><Button title="ส่งคำขอใหม่" onPress={applyToSell} loading={sending} /></>
              : sameArea ? <><TextInput style={styles.note} placeholder="แนะนำตัวหรือรายละเอียดสินค้าของคุณ" value={note} onChangeText={setNote} multiline /><Button title="ขอเป็นผู้ขายร่วม" onPress={applyToSell} loading={sending} /></>
                : <Text style={styles.rejected}>คุณจะร่วมขายได้เมื่อพื้นที่หลักอยู่ตำบลเดียวกับตลาดชุมชนนี้</Text>}
        </View> : null}
        {isSeller ? <TouchableOpacity onPress={() => router.push("/seller/listings" as never)}><Text style={styles.chat}>แก้ไขจำนวนสินค้าที่พร้อมขาย</Text></TouchableOpacity> : null}
        <TouchableOpacity onPress={chat}><Text style={styles.chat}>แชตกับผู้ดูแลร้าน</Text></TouchableOpacity>
      </View>
    </KeyboardAwareScrollView>
    <View style={styles.bottom}><Button title={stock > 0 ? "เพิ่มลงตะกร้า" : "สินค้าหมด"} disabled={stock <= 0} onPress={add} style={{ backgroundColor: Colors.goldPrimary }} /></View>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background }, center: { flex: 1, alignItems: "center", justifyContent: "center" }, image: { width: "100%", height: 280 },
  placeholder: { alignItems: "center", justifyContent: "center", backgroundColor: "#EAF1E9" }, back: { position: "absolute", left: 18, width: 42, height: 42, borderRadius: 21, backgroundColor: "#FFFFFFDD", alignItems: "center", justifyContent: "center" },
  body: { padding: Spacing.lg }, market: { fontFamily: "Kanit_500Medium", color: Colors.goldDark }, title: { fontFamily: "Kanit_700Bold", fontSize: 27, color: Colors.greenPrimary },
  product: { fontFamily: "Kanit_700Bold", fontSize: 18, color: Colors.textDark }, desc: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, lineHeight: 21, marginTop: 8 },
  info: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: 20 }, price: { fontFamily: "Kanit_700Bold", fontSize: 22, color: Colors.greenPrimary }, stock: { fontFamily: "Kanit_500Medium", color: Colors.textMedium },
  hub: { flexDirection: "row", gap: 10, padding: Spacing.md, backgroundColor: "#EAF1E9", borderRadius: BorderRadius.lg }, hubText: { flex: 1, fontFamily: "Kanit_400Regular", color: Colors.greenDark },
  sellerBox: { marginTop: 16, backgroundColor: "white", borderRadius: BorderRadius.lg, padding: 16, borderWidth: 1, borderColor: Colors.inputBorder }, sellerTitle: { fontFamily: "Kanit_700Bold", color: Colors.textDark, fontSize: 17 },
  note: { minHeight: 76, borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: 12, padding: 12, fontFamily: "Kanit_400Regular", textAlignVertical: "top", marginVertical: 10 },
  pending: { fontFamily: "Kanit_400Regular", color: Colors.goldDark, marginTop: 6 }, rejected: { fontFamily: "Kanit_400Regular", color: Colors.danger, marginTop: 6 },
  chat: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary, textAlign: "center", padding: 18 }, bottom: { position: "absolute", left: 0, right: 0, bottom: 0, padding: Spacing.md, backgroundColor: "white", borderTopWidth: 1, borderTopColor: Colors.inputBorder },
});
