/* eslint-disable react-hooks/set-state-in-effect */
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AppTextInput } from "../../../src/components/AppTextInput";
import { KeyboardAwareScrollView } from "../../../src/components/KeyboardAware";
import { Button } from "../../../src/components/Button";
import { PermissionGate } from "../../../src/components/PermissionGate";
import { BorderRadius, Colors, Spacing } from "../../../src/constants/theme";
import { useCapabilities } from "../../../src/hooks/useCapabilities";
import { translateDatabaseError } from "../../../src/lib/databaseError";
import { signedPrivateImageUrl } from "../../../src/lib/storage";
import { supabase } from "../../../src/lib/supabase";

export default function ApprovalQueue() {
  const permissions = useCapabilities(); const router = useRouter();
  const [stores, setStores] = useState<any[]>([]); const [sellers, setSellers] = useState<any[]>([]); const [notes, setNotes] = useState<Record<number, string>>({});
  const load = useCallback(async () => {
    if (!permissions.isMarketOwner && !permissions.isAdmin) return;
    const [storeResult, sellerResult] = await Promise.all([
      supabase.from("stores").select("store_id,name,product_name,image_url,unit,unit_price,created_at,markets(name)").eq("approval_status", "pending").order("created_at"),
      supabase.from("store_seller_applications").select("application_id,note,product_image_url,created_at,stores(name,product_name,image_url)").eq("status", "pending").order("created_at"),
    ]);
    const sellerRows = await Promise.all((sellerResult.data ?? []).map(async (item: any) => ({
      ...item,
      evidence_url: item.product_image_url ? await signedPrivateImageUrl("seller-evidence", item.product_image_url).catch(() => null) : null,
    })));
    setStores(storeResult.data ?? []); setSellers(sellerRows);
  }, [permissions.isAdmin, permissions.isMarketOwner]);
  useEffect(() => { void load(); }, [load]);
  const reviewSeller = async (id: number, approve: boolean) => {
    const note = notes[id]?.trim(); if (!approve && !note) return Alert.alert("กรุณาระบุเหตุผลที่ปฏิเสธ");
    const { error } = await supabase.rpc("review_store_seller", { p_application_id: id, p_approve: approve, p_note: note || undefined });
    if (error) Alert.alert("ดำเนินการไม่สำเร็จ", translateDatabaseError(error)); else { setNotes((current) => ({ ...current, [id]: "" })); await load(); }
  };
  return <PermissionGate allow={permissions.isMarketOwner || permissions.isAdmin} loading={permissions.loading}>
    <KeyboardAwareScrollView contentContainerStyle={styles.root}>
      <Text style={styles.title}>คิวอนุมัติ</Text><Text style={styles.sub}>แตะคำขอร้านค้าเพื่อดูผู้สมัคร สินค้า ราคา และรายละเอียดทั้งหมด</Text>
      <Text style={styles.section}>ร้านใหม่</Text>
      {!stores.length ? <Text style={styles.empty}>ไม่มีร้านรอตรวจสอบ</Text> : null}
      {stores.map((item) => <TouchableOpacity style={styles.card} key={item.store_id} onPress={() => router.push(`/market/manage/request/${item.store_id}` as never)}>
        {item.image_url?<Image source={{uri:item.image_url}} style={styles.thumbnail}/>:<View style={styles.thumbnailPlaceholder}><Ionicons name="image-outline" size={22} color={Colors.textMuted}/></View>}<View style={{ flex: 1 }}><Text style={styles.name}>{item.name}</Text><Text style={styles.detail}>{item.product_name} · ฿{Number(item.unit_price).toLocaleString()}/{item.unit}</Text><Text style={styles.detail}>{item.markets?.name}</Text></View><Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
      </TouchableOpacity>)}
      <Text style={styles.section}>ผู้ขายร่วมร้าน</Text>
      {!sellers.length ? <Text style={styles.empty}>ไม่มีผู้ขายร่วมรอตรวจสอบ</Text> : null}
      {sellers.map((item) => <View style={styles.cardColumn} key={item.application_id}>
        {item.evidence_url||item.stores?.image_url?<Image source={{uri:item.evidence_url||item.stores?.image_url}} style={styles.applicationImage}/>:<View style={styles.missingImage}><Ionicons name="image-outline" size={28} color={Colors.textMuted}/><Text style={styles.detail}>ผู้สมัครเดิมไม่ได้แนบรูปสินค้า</Text></View>}
        <Text style={styles.name}>{item.stores?.name} · {item.stores?.product_name}</Text>{item.note ? <Text style={styles.detail}>ข้อความจากผู้สมัคร: {item.note}</Text> : null}
        <AppTextInput style={styles.note} placeholder="ความคิดเห็น/เหตุผลกรณีปฏิเสธ" value={notes[item.application_id] ?? ""} onChangeText={(value) => setNotes((current) => ({ ...current, [item.application_id]: value }))} multiline />
        <View style={styles.actions}><Button title="อนุมัติ" size="sm" onPress={() => reviewSeller(item.application_id, true)} /><Button title="ปฏิเสธ" size="sm" variant="outline" onPress={() => reviewSeller(item.application_id, false)} /></View>
      </View>)}
    </KeyboardAwareScrollView>
  </PermissionGate>;
}
const styles = StyleSheet.create({ root: { padding: Spacing.lg, paddingTop: 58, paddingBottom: 70, backgroundColor: Colors.background, flexGrow: 1 }, title: { fontFamily: "Kanit_700Bold", fontSize: 26, color: Colors.greenPrimary }, sub: { fontFamily: "Kanit_400Regular", color: Colors.textMuted }, section: { fontFamily: "Kanit_700Bold", marginTop: 20, fontSize: 18, color: Colors.textDark }, card: { backgroundColor: "white", padding: 12, gap: 10, borderRadius: BorderRadius.lg, marginTop: 10, flexDirection: "row", alignItems: "center" }, thumbnail: { width: 62, height: 62, borderRadius: 10, backgroundColor: "#EAF1E9" }, thumbnailPlaceholder: { width: 62, height: 62, borderRadius: 10, backgroundColor: "#EAF1E9", alignItems: "center", justifyContent: "center" }, cardColumn: { backgroundColor: "white", padding: 16, borderRadius: BorderRadius.lg, marginTop: 10 }, applicationImage: { width: "100%", height: 180, borderRadius: 12, backgroundColor: "#EAF1E9", marginBottom: 10 }, missingImage: { height: 110, borderRadius: 12, backgroundColor: "#F1F3F5", alignItems: "center", justifyContent: "center", marginBottom: 10 }, name: { fontFamily: "Kanit_700Bold", color: Colors.textDark }, detail: { fontFamily: "Kanit_400Regular", color: Colors.textMuted }, actions: { flexDirection: "row", gap: 8, marginTop: 10 }, note: { minHeight: 68, borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: 10, padding: 10, fontFamily: "Kanit_400Regular", textAlignVertical: "top", marginTop: 10 }, empty: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, marginTop: 8 } });
