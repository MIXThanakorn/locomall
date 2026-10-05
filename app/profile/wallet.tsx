import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import * as Crypto from "expo-crypto";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { AppTextInput } from "../../src/components/AppTextInput";
import { Button } from "../../src/components/Button";
import { KeyboardAwareScrollView } from "../../src/components/KeyboardAware";
import { BorderRadius, Colors, Spacing } from "../../src/constants/theme";
import { useAuth } from "../../src/context/AuthContext";
import { formatThaiDateTime } from "../../src/lib/date";
import { translateDatabaseError } from "../../src/lib/databaseError";
import { supabase } from "../../src/lib/supabase";
import { RealtimeWatch, useRealtimeRefresh } from "../../src/hooks/useRealtimeRefresh";

const labels: Record<string, string> = {
  topup: "ผู้ดูแลเติมยอดสาธิต", purchase: "ใช้ยอดสาธิตสั่งซื้อ", refund: "คืนยอดจากออเดอร์ที่ยกเลิก",
  seller_sale: "ยอดขายรอโอน (สาธิต)", seller_settlement: "บันทึกโอนยอดขายแล้ว (สาธิต)",
};

export default function DemoWallet() {
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user.id;
  const [account, setAccount] = useState<any>();
  const [requests, setRequests] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [amount, setAmount] = useState("100");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const loadVersion = useRef(0);

  const load = useCallback(async () => {
    if (!userId) return;
    const version = ++loadVersion.current;
    const [a, r, e] = await Promise.all([
      (supabase as any).from("demo_accounts").select("*").eq("user_id", userId).maybeSingle(),
      (supabase as any).from("demo_topup_requests").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
      (supabase as any).from("demo_ledger").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
    ]);
    if (version !== loadVersion.current) return;
    if (a.error || r.error || e.error) setLoadError(true);
    else {
      setAccount(a.data); setRequests(r.data ?? []); setEntries(e.data ?? []);
      setLoadError(false);
    }
    setLoading(false);
  }, [userId]);
  useFocusEffect(useCallback(() => {
    void load();
    return () => { loadVersion.current++; };
  }, [load]));
  const watches = useMemo<RealtimeWatch[]>(() => userId ? [
    { table: "demo_accounts", event: "INSERT", filter: `user_id=eq.${userId}` },
    { table: "demo_accounts", event: "UPDATE", filter: `user_id=eq.${userId}` },
    { table: "demo_topup_requests", event: "INSERT", filter: `user_id=eq.${userId}` },
    { table: "demo_topup_requests", event: "UPDATE", filter: `user_id=eq.${userId}` },
    { table: "demo_ledger", event: "INSERT", filter: `user_id=eq.${userId}` },
  ] : [], [userId]);
  useRealtimeRefresh(`demo-wallet-${userId}`, load, watches, Boolean(userId));
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try { await load(); } finally { setRefreshing(false); }
  }, [load]);

  const request = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 1 || value > 10000 || Math.round(value * 100) !== value * 100)
      return Alert.alert("จำนวนไม่ถูกต้อง", "กรอกยอดสาธิต 1–10,000 บาท และไม่เกิน 2 ตำแหน่งทศนิยม");
    setBusy(true);
    const { error } = await (supabase as any).rpc("request_demo_topup", { p_request_id: Crypto.randomUUID(), p_amount: value });
    setBusy(false);
    if (error) Alert.alert("ส่งคำขอไม่สำเร็จ", translateDatabaseError(error));
    else { Alert.alert("ส่งคำขอสาธิตแล้ว", "ผู้ดูแลต้องกดยืนยันในระบบก่อนยอดจะเพิ่ม ไม่มีการโอนเงินจริง"); await load(); }
  };
  const latestPending = requests.find((item) => item.status === "pending");

  return <View style={styles.root}><KeyboardAwareScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}>
    <TouchableOpacity onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={24} color={Colors.greenPrimary} /><Text style={styles.backText}>กลับ</Text></TouchableOpacity>
    <Text style={styles.title}>Wallet เงินจำลอง</Text>
    <Text style={styles.warning}>สำหรับสาธิตเท่านั้น · ไม่ใช่เงินบาทจริง · ห้ามใช้ QR นี้โอนผ่านแอปธนาคาร</Text>
    {loadError ? <Text style={styles.warning}>อัปเดตข้อมูลไม่สำเร็จ ดึงลงเพื่อลองใหม่</Text> : null}
    {loading ? <ActivityIndicator color={Colors.greenPrimary} /> : <>
      <View style={styles.summary}><Text style={styles.label}>ยอดสำหรับสั่งซื้อ · เงินจำลอง</Text><Text style={styles.balance}>฿{Number(account?.wallet_balance ?? 0).toLocaleString()}</Text></View>
      <View style={styles.row}><View style={styles.mini}><Text style={styles.label}>ยอดขายรอโอน · สาธิต</Text><Text style={styles.value}>฿{Number(account?.seller_pending ?? 0).toLocaleString()}</Text></View><View style={styles.mini}><Text style={styles.label}>บันทึกโอนแล้ว · สาธิต</Text><Text style={styles.value}>฿{Number(account?.seller_settled ?? 0).toLocaleString()}</Text></View></View>
      <Text style={styles.heading}>ขอยอดทดสอบ</Text>
      <AppTextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" style={styles.input} placeholder="จำนวนเงินจำลอง" />
      <Button title="ส่งคำขอเติมยอดสาธิต" onPress={request} loading={busy} />
      {latestPending ? <View style={styles.qrCard}><Text style={styles.heading}>QR อ้างอิงคำขอสาธิต</Text><QRCode value={`LOCOMALL-DEMO-TOPUP:${latestPending.request_id}`} size={170} /><Text selectable style={styles.reference}>{latestPending.request_id}</Text><Text style={styles.warning}>ไม่ใช่ PromptPay · ใช้โอนเงินจริงไม่ได้</Text></View> : null}
      <Text style={styles.heading}>คำขอเติมยอด</Text>
      {requests.length ? requests.map((item) => <View key={item.request_id} style={styles.entry}><Text style={styles.value}>฿{Number(item.amount).toLocaleString()} · {item.status === "pending" ? "รอตรวจสอบ" : item.status === "approved" ? "อนุมัติแล้ว" : "ไม่อนุมัติ"}</Text><Text style={styles.label}>{formatThaiDateTime(item.created_at)}</Text>{item.decision_note ? <Text style={styles.label}>{item.decision_note}</Text> : null}</View>) : <Text style={styles.label}>ยังไม่มีคำขอ</Text>}
      <Text style={styles.heading}>รายการเคลื่อนไหว</Text>
      {entries.length ? entries.map((entry) => <View key={entry.entry_id} style={styles.entry}><Text style={styles.value}>{labels[entry.entry_type] ?? entry.entry_type}</Text><Text style={styles.label}>{formatThaiDateTime(entry.created_at)}</Text><Text style={styles.value}>{Number(entry.wallet_delta) !== 0 ? `${Number(entry.wallet_delta) > 0 ? "+" : ""}฿${Number(entry.wallet_delta).toLocaleString()}` : `${Number(entry.seller_delta) > 0 ? "+" : ""}฿${Number(entry.seller_delta).toLocaleString()} (ยอดขาย)`}</Text></View>) : <Text style={styles.label}>ยังไม่มีรายการเคลื่อนไหว</Text>}
    </>}
  </KeyboardAwareScrollView></View>;
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: Colors.background }, content: { padding: Spacing.lg, paddingTop: 56, paddingBottom: 70 }, back: { flexDirection: "row", alignItems: "center", gap: 6 }, backText: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary }, title: { fontFamily: "Kanit_700Bold", fontSize: 28, color: Colors.greenPrimary, marginVertical: 12 }, warning: { fontFamily: "Kanit_500Medium", color: Colors.danger, textAlign: "center", marginVertical: 8 }, summary: { backgroundColor: Colors.greenPrimary, padding: 20, borderRadius: BorderRadius.lg, marginTop: 14 }, label: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, fontSize: 13 }, balance: { fontFamily: "Kanit_700Bold", color: "white", fontSize: 32 }, row: { flexDirection: "row", gap: 8, marginTop: 8 }, mini: { flex: 1, backgroundColor: "white", padding: 14, borderRadius: BorderRadius.md }, value: { fontFamily: "Kanit_700Bold", color: Colors.textDark }, heading: { fontFamily: "Kanit_700Bold", color: Colors.greenPrimary, fontSize: 20, marginTop: 22, marginBottom: 8 }, input: { backgroundColor: "white", color: Colors.textDark, padding: 14, borderRadius: BorderRadius.md, marginBottom: 10, borderWidth: 1, borderColor: Colors.inputBorder }, qrCard: { backgroundColor: "white", borderRadius: BorderRadius.lg, padding: 18, marginTop: 16, alignItems: "center" }, reference: { fontFamily: "Kanit_400Regular", color: Colors.textDark, marginTop: 12, fontSize: 11 }, entry: { backgroundColor: "white", padding: 14, borderRadius: BorderRadius.md, marginBottom: 8 } });
