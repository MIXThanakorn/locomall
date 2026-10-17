import { useResponsiveStyles } from "../../src/hooks/useResponsiveStyles";
import { ScreenHeader } from "../../src/components/ScreenHeader";
import { useFocusEffect } from "expo-router";
import * as Crypto from "expo-crypto";
import React, { useCallback, useRef, useState } from "react";
import { Alert, RefreshControl, StyleSheet, Text, View } from "react-native";
import { AppTextInput } from "../../src/components/AppTextInput";
import { KeyboardAwareScrollView } from "../../src/components/KeyboardAware";
import { AdminGate } from "../../src/components/AdminGate";
import { Button } from "../../src/components/Button";
import { BorderRadius, Colors, Spacing } from "../../src/constants/theme";
import { formatThaiDateTime } from "../../src/lib/date";
import { translateDatabaseError } from "../../src/lib/databaseError";
import { supabase } from "../../src/lib/supabase";
import { RealtimeWatch, useRealtimeRefresh } from "../../src/hooks/useRealtimeRefresh";

const FINANCE_WATCHES: RealtimeWatch[] = [
  { table: "demo_topup_requests", event: "INSERT" },
  { table: "demo_topup_requests", event: "UPDATE" },
  { table: "demo_accounts", event: "UPDATE" },
];

export default function AdminDemoFinance() {
  const styles = useResponsiveStyles(baseStyles, {"stack":["row"],"fullWidth":["button"]});
  const [requests, setRequests] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const settlementRequests = useRef<Record<string,string>>({});
  const load = useCallback(async () => {
    const [r, s] = await Promise.all([
      (supabase as any).from("demo_topup_requests").select("*").eq("status", "pending").order("created_at"),
      (supabase as any).from("demo_accounts").select("user_id,seller_pending").gt("seller_pending", 0).order("seller_pending", { ascending: false }),
    ]);
    setRequests(r.data ?? []); setSellers(s.data ?? []);
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useRealtimeRefresh("admin-finance", load, FINANCE_WATCHES);
  const decide = async (id: string, approve: boolean) => {
    if (!approve && !notes[id]?.trim()) return Alert.alert("กรุณาระบุเหตุผลที่ไม่อนุมัติ");
    setBusy(id);
    const { error } = await (supabase as any).rpc("decide_demo_topup", { p_request_id: id, p_approve: approve, p_note: notes[id]?.trim() || null });
    setBusy(null);
    if (error) Alert.alert("บันทึกไม่สำเร็จ", translateDatabaseError(error)); else await load();
  };
  const settle = async (sellerId: string) => {
    if (!notes[sellerId]?.trim() || notes[sellerId].trim().length < 3) return Alert.alert("กรุณาระบุหลักฐาน/หมายเหตุอย่างน้อย 3 ตัวอักษร");
    settlementRequests.current[sellerId] ??= Crypto.randomUUID();
    setBusy(sellerId);
    const { error } = await (supabase as any).rpc("record_demo_settlement", { p_request_id: settlementRequests.current[sellerId], p_seller_id: sellerId, p_evidence_note: notes[sellerId].trim() });
    setBusy(null);
    if (error) Alert.alert("บันทึกไม่สำเร็จ", translateDatabaseError(error)); else { delete settlementRequests.current[sellerId]; await load(); }
  };
  return <AdminGate><KeyboardAwareScrollView style={styles.root} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load().finally(() => setRefreshing(false)); }} tintColor={Colors.greenPrimary} />}>
    <ScreenHeader title={"จัดการเงินจำลอง"} titleStyle={styles.title} />
    <Text style={styles.notice}>ระบบสาธิตเท่านั้น ไม่มีการรับหรือโอนเงินจริง QR ในแอปไม่ใช่ PromptPay</Text>
    <Text style={styles.heading}>คำขอเติมยอดที่รออนุมัติ ({requests.length})</Text>
    {requests.map((item) => <View key={item.request_id} style={styles.card}>
      <Text style={styles.bold}>฿{Number(item.amount).toLocaleString()} · เงินจำลอง</Text>
      <Text style={styles.sub}>ผู้ขอ: {item.user_id}</Text><Text style={styles.sub}>{formatThaiDateTime(item.created_at)}</Text>
      <AppTextInput placeholder="หมายเหตุ / เหตุผลที่ไม่อนุมัติ" value={notes[item.request_id] ?? ""} onChangeText={(text) => setNotes({ ...notes, [item.request_id]: text })} style={styles.input} />
      <View style={styles.row}><Button title="อนุมัติยอดทดสอบ" size="sm" loading={busy === item.request_id} onPress={() => decide(item.request_id, true)} style={styles.button} /><Button title="ไม่อนุมัติ" variant="outline" size="sm" onPress={() => decide(item.request_id, false)} style={styles.button} /></View>
    </View>)}
    {!requests.length ? <Text style={styles.sub}>ไม่มีคำขอค้าง</Text> : null}
    <Text style={styles.heading}>ยอดขายผู้ขายที่รอบันทึกโอน · สาธิต</Text>
    {sellers.map((seller) => <View key={seller.user_id} style={styles.card}>
      <Text style={styles.bold}>฿{Number(seller.seller_pending).toLocaleString()}</Text><Text style={styles.sub}>ผู้ขาย: {seller.user_id}</Text>
      <AppTextInput placeholder="หลักฐาน/หมายเหตุการบันทึกโอนสาธิต" value={notes[seller.user_id] ?? ""} onChangeText={(text) => setNotes({ ...notes, [seller.user_id]: text })} style={styles.input} />
      <Button title="บันทึกว่าโอนแล้ว (สาธิต)" size="sm" loading={busy === seller.user_id} onPress={() => settle(seller.user_id)} />
    </View>)}
    {!sellers.length ? <Text style={styles.sub}>ไม่มียอดค้าง</Text> : null}
  </KeyboardAwareScrollView></AdminGate>;
}

const baseStyles = StyleSheet.create({ root: { flex: 1, backgroundColor: Colors.background }, content: { padding: Spacing.lg, paddingTop: 0, paddingBottom: 90 }, link: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary }, title: { fontFamily: "Kanit_700Bold", fontSize: 27, color: Colors.greenPrimary, marginTop: 12 }, notice: { fontFamily: "Kanit_500Medium", color: Colors.danger, backgroundColor: "white", padding: 12, borderRadius: BorderRadius.md, marginVertical: 12 }, heading: { fontFamily: "Kanit_700Bold", color: Colors.textDark, fontSize: 19, marginTop: 18, marginBottom: 9 }, card: { backgroundColor: "white", padding: 14, borderRadius: BorderRadius.lg, marginBottom: 10 }, bold: { fontFamily: "Kanit_700Bold", color: Colors.greenPrimary, fontSize: 18 }, sub: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, fontSize: 12 }, input: { borderColor: Colors.inputBorder, borderWidth: 1, borderRadius: BorderRadius.md, marginVertical: 9, padding: 10, color: Colors.textDark }, row: { flexDirection: "row", gap: 8 }, button: { flex: 1 } });
