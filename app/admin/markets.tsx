import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Image, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "../../src/components/KeyboardAware";
import { AdminGate } from "../../src/components/AdminGate";
import { Button } from "../../src/components/Button";
import { BorderRadius, Colors, Spacing } from "../../src/constants/theme";
import { translateDatabaseError } from "../../src/lib/databaseError";
import { supabase } from "../../src/lib/supabase";

type QueueKind = "market" | "store" | "seller";

export default function AdminApprovals() {
  const [markets, setMarkets] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [working, setWorking] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    const [marketResult, storeResult, sellerResult] = await Promise.all([
      supabase.from("markets").select("market_id,name,description,hub_address,owner_id,created_at").eq("approval_status", "pending").order("created_at"),
      supabase.from("stores").select("store_id,name,product_name,image_url,unit,unit_price,manager_id,created_at,markets(name,owner_id)").eq("approval_status", "pending").order("created_at"),
      supabase.from("store_seller_applications").select("application_id,applicant_id,note,product_image_url,created_at,stores(name,product_name,image_url,markets(name,owner_id))").eq("status", "pending").order("created_at"),
    ]);
    setMarkets(marketResult.data ?? []);
    setStores(storeResult.data ?? []);
    setSellers(sellerResult.data ?? []);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const review = async (kind: QueueKind, id: number, approve: boolean) => {
    const key = `${kind}-${id}`;
    setWorking(key);
    const note = notes[key]?.trim() || undefined;
    const result = kind === "market"
      ? await supabase.rpc("review_market", { p_market_id: id, p_approve: approve, p_note: note })
      : kind === "store"
        ? await supabase.rpc("review_store", { p_store_id: id, p_approve: approve, p_note: note })
        : await supabase.rpc("review_store_seller", { p_application_id: id, p_approve: approve, p_note: note });
    setWorking(null);
    if (result.error) return Alert.alert("ดำเนินการไม่สำเร็จ", translateDatabaseError(result.error));
    Alert.alert(approve ? "อนุมัติแล้ว" : "ปฏิเสธแล้ว", "ระบบบันทึกประวัติการดำเนินการเรียบร้อย");
    await load();
  };

  const queueCard = (kind: QueueKind, item: any) => {
    const id = kind === "market" ? item.market_id : kind === "store" ? item.store_id : item.application_id;
    const key = `${kind}-${id}`;
    const title = kind === "market" ? item.name : kind === "store" ? `${item.name} · ${item.product_name}` : `${item.stores?.name} · ${item.stores?.product_name}`;
    const detail = kind === "market"
      ? `${item.description || "ไม่มีรายละเอียด"}\nจุดรวม: ${item.hub_address}`
      : kind === "store"
        ? `ตลาดชุมชน: ${item.markets?.name} · ฿${Number(item.unit_price).toLocaleString()} / ${item.unit}`
        : `ตลาดชุมชน: ${item.stores?.markets?.name}\nหมายเหตุ: ${item.note || "-"}`;
    return <View key={key} style={styles.card}>
      <View style={styles.cardHeader}><View style={styles.typeIcon}><Ionicons name={kind === "market" ? "people" : kind === "store" ? "storefront" : "person-add"} size={19} color={Colors.greenPrimary} /></View><View style={styles.cardTitleWrap}><Text style={styles.name}>{title}</Text><Text style={styles.date}>{new Date(item.created_at).toLocaleString("th-TH")}</Text></View></View>
      {kind!=="market"&&(item.image_url||item.product_image_url||item.stores?.image_url)?<Image source={{uri:item.image_url||item.product_image_url||item.stores?.image_url}} style={styles.productImage}/>:null}
      <Text style={styles.detail}>{detail}</Text>
      <Text style={styles.userId}>ผู้ยื่น: {(item.owner_id ?? item.manager_id ?? item.applicant_id)?.slice(0, 8)}…</Text>
      <TextInput style={styles.note} placeholder="หมายเหตุสำหรับผู้ยื่นคำขอ (ไม่บังคับ)" value={notes[key] ?? ""} onChangeText={(value) => setNotes((current) => ({ ...current, [key]: value }))} />
      <View style={styles.actions}><Button title="อนุมัติ" size="sm" loading={working === key} onPress={() => review(kind, id, true)} style={styles.approve} /><Button title="ปฏิเสธ" variant="outline" size="sm" disabled={working === key} onPress={() => review(kind, id, false)} style={styles.reject} /></View>
    </View>;
  };

  const section = (title: string, subtitle: string, data: any[], kind: QueueKind) => <View style={styles.sectionBlock}>
    <Text style={styles.section}>{title} <Text style={styles.count}>({data.length})</Text></Text><Text style={styles.sectionSub}>{subtitle}</Text>
    {data.length ? data.map((item) => queueCard(kind, item)) : <Text style={styles.empty}>ไม่มีรายการรอตรวจสอบ</Text>}
  </View>;

  return <AdminGate><KeyboardAwareScrollView style={styles.root} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={Colors.greenPrimary} />}>
    <Text style={styles.eyebrow}>ตรวจสอบคำขอ</Text><Text style={styles.title}>คำขอที่รอตรวจสอบ</Text><Text style={styles.sub}>ตรวจทุกคำขอจากจุดเดียว ทุกการอนุมัติและปฏิเสธจะถูกบันทึกไว้เพื่อตรวจสอบย้อนหลัง</Text>
    {section("คำขอเปิดตลาดชุมชน", "ตรวจข้อมูลชุมชนและที่อยู่จุดรวมสินค้า", markets, "market")}
    {section("คำขอเปิดร้านค้า", "ตรวจชื่อร้าน สินค้า ราคา และข้อมูลผู้สมัคร", stores, "store")}
    {section("ผู้ขายร่วมร้าน", "ตรวจสิทธิ์และพื้นที่ของผู้สมัคร", sellers, "seller")}
  </KeyboardAwareScrollView></AdminGate>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background }, content: { padding: Spacing.lg, paddingTop: 54, paddingBottom: 110 },
  eyebrow: { fontFamily: "Kanit_500Medium", color: Colors.goldDark, fontSize: 12, letterSpacing: 1 }, title: { fontFamily: "Kanit_700Bold", fontSize: 28, color: Colors.greenPrimary }, sub: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, lineHeight: 20 },
  sectionBlock: { marginTop: 24 }, section: { fontFamily: "Kanit_700Bold", fontSize: 19, color: Colors.textDark }, count: { color: Colors.goldDark }, sectionSub: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, fontSize: 12 },
  card: { backgroundColor: Colors.cardBackground, padding: 16, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.inputBorder, marginTop: 10 }, cardHeader: { flexDirection: "row", gap: 10, alignItems: "center" }, typeIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#E8F2EC", alignItems: "center", justifyContent: "center" }, cardTitleWrap: { flex: 1 }, productImage: { width: "100%", height: 170, borderRadius: 12, backgroundColor: "#EAF1E9", marginTop: 12 },
  name: { fontFamily: "Kanit_700Bold", color: Colors.textDark }, date: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, fontSize: 11 }, detail: { fontFamily: "Kanit_400Regular", color: Colors.textMedium, marginTop: 10, lineHeight: 20 }, userId: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, fontSize: 11, marginTop: 5 },
  note: { backgroundColor: Colors.inputBackground, borderRadius: BorderRadius.md, padding: 11, marginTop: 12, fontFamily: "Kanit_400Regular" }, actions: { flexDirection: "row", gap: 8, marginTop: 10 }, approve: { flex: 1, backgroundColor: Colors.greenPrimary }, reject: { flex: 1, borderColor: Colors.danger }, empty: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, backgroundColor: Colors.cardBackground, borderRadius: BorderRadius.md, padding: 16, marginTop: 9, textAlign: "center" },
});
