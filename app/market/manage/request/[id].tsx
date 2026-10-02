import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, StyleSheet, Text, View } from "react-native";
import { AppTextInput } from "../../../../src/components/AppTextInput";
import { Button } from "../../../../src/components/Button";
import { KeyboardAwareScrollView } from "../../../../src/components/KeyboardAware";
import { BorderRadius, Colors, Spacing } from "../../../../src/constants/theme";
import { translateDatabaseError } from "../../../../src/lib/databaseError";
import { supabase } from "../../../../src/lib/supabase";

export default function StoreRequestDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(); const router = useRouter();
  const [detail, setDetail] = useState<any>(); const [note, setNote] = useState(""); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  useEffect(() => { supabase.rpc("get_store_request_detail", { p_store_id: Number(id) }).single().then(({ data, error }) => { if (error) Alert.alert("เปิดคำขอไม่สำเร็จ", translateDatabaseError(error)); setDetail(data); setLoading(false); }); }, [id]);
  const review = async (approve: boolean) => {
    if (!approve && !note.trim()) return Alert.alert("กรุณาระบุเหตุผลที่ปฏิเสธ");
    setSaving(true); const { error } = await supabase.rpc("review_store", { p_store_id: Number(id), p_approve: approve, p_note: note.trim() || undefined }); setSaving(false);
    if (error) return Alert.alert("ดำเนินการไม่สำเร็จ", translateDatabaseError(error));
    Alert.alert(approve ? "อนุมัติร้านแล้ว" : "ปฏิเสธคำขอแล้ว", approve ? "ผู้เปิดร้านสามารถเพิ่มจำนวนสินค้าที่พร้อมขายได้แล้ว" : "ผู้สมัครจะเห็นเหตุผลที่คุณระบุ", [{ text: "ตกลง", onPress: () => router.back() }]);
  };
  if (loading) return <View style={styles.center}><ActivityIndicator color={Colors.greenPrimary} /></View>;
  if (!detail) return <View style={styles.center}><Text>ไม่พบคำขอหรือคุณไม่มีสิทธิ์ดูข้อมูล</Text></View>;
  return <KeyboardAwareScrollView contentContainerStyle={styles.root}>
    <Text style={styles.title}>รายละเอียดคำขอเปิดร้าน</Text>{detail.image_url ? <Image source={{ uri: detail.image_url }} style={styles.image} /> : null}
    <View style={styles.card}><Text style={styles.heading}>{detail.store_name}</Text><Row label="ตลาดชุมชน" value={detail.market_name} /><Row label="สินค้าที่ขาย" value={detail.product_name} /><Row label="ราคาขายกลาง" value={`฿${Number(detail.unit_price).toLocaleString()} / ${detail.unit}`} /><Row label="รายละเอียด" value={detail.description || "-"} /></View>
    <View style={styles.card}><Text style={styles.heading}>ข้อมูลผู้สมัคร</Text><Row label="ชื่อ" value={detail.applicant_name} /><Row label="ชื่อผู้ใช้" value={detail.applicant_username || "-"} /><Row label="เบอร์โทร" value={detail.applicant_phone || "-"} /><Row label="พื้นที่หลัก" value={`${detail.subdistrict_name ?? ""} ${detail.district_name ?? ""} ${detail.province_name ?? ""}`.trim()} /></View>
    <Text style={styles.label}>ความคิดเห็นถึงผู้สมัคร</Text><AppTextInput style={styles.note} placeholder="จำเป็นต้องกรอกเมื่อปฏิเสธคำขอ" value={note} onChangeText={setNote} multiline />
    <View style={styles.actions}><Button title="อนุมัติ" onPress={() => review(true)} loading={saving} /><Button title="ปฏิเสธพร้อมเหตุผล" variant="outline" onPress={() => review(false)} disabled={saving} /></View>
  </KeyboardAwareScrollView>;
}
function Row({ label, value }: { label: string; value: string }) { return <View style={styles.row}><Text style={styles.rowLabel}>{label}</Text><Text style={styles.rowValue}>{value}</Text></View>; }
const styles = StyleSheet.create({ root: { padding: Spacing.lg, paddingTop: 58, paddingBottom: 70, backgroundColor: Colors.background, flexGrow: 1 }, center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.background }, title: { fontFamily: "Kanit_700Bold", fontSize: 26, color: Colors.greenPrimary, marginBottom: 14 }, image: { height: 190, width: "100%", borderRadius: BorderRadius.lg, marginBottom: 12 }, card: { backgroundColor: "white", padding: 16, borderRadius: BorderRadius.lg, marginBottom: 12 }, heading: { fontFamily: "Kanit_700Bold", fontSize: 18, color: Colors.textDark, marginBottom: 8 }, row: { flexDirection: "row", gap: 10, marginTop: 5 }, rowLabel: { width: 90, fontFamily: "Kanit_500Medium", color: Colors.textMuted }, rowValue: { flex: 1, fontFamily: "Kanit_400Regular", color: Colors.textDark }, label: { fontFamily: "Kanit_700Bold", color: Colors.textDark }, note: { minHeight: 90, borderWidth: 1, borderColor: Colors.inputBorder, backgroundColor: "white", borderRadius: BorderRadius.md, padding: 12, fontFamily: "Kanit_400Regular", textAlignVertical: "top", marginTop: 8 }, actions: { gap: 10, marginTop: 14 } });
