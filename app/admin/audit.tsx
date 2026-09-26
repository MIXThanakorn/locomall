import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { AdminGate } from "../../src/components/AdminGate";
import { BorderRadius, Colors, Spacing } from "../../src/constants/theme";
import { auditActionLabel, auditEntityLabel } from "../../src/lib/displayText";
import { supabase } from "../../src/lib/supabase";

export default function AdminAudit() {
  const [logs, setLogs] = useState<any[]>([]); const [events, setEvents] = useState<any[]>([]); const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => { setRefreshing(true); const [audit, approvals] = await Promise.all([supabase.from("admin_audit_logs").select("*").order("created_at", { ascending: false }).limit(100), supabase.from("approval_events").select("*").order("created_at", { ascending: false }).limit(100)]); setLogs(audit.data ?? []); setEvents(approvals.data ?? []); setRefreshing(false); }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const logCard = (item: any, approval = false) => <View key={`${approval ? "event" : "audit"}-${approval ? item.event_id : item.log_id}`} style={styles.card}><View style={styles.row}><Text style={styles.action}>{auditActionLabel(item.action)}</Text><Text style={styles.date}>{new Date(item.created_at).toLocaleString("th-TH")}</Text></View><Text style={styles.meta}>{auditEntityLabel(item.entity_type)} · เลขที่ {item.entity_id ?? "-"}</Text><Text style={styles.actor}>ผู้ดำเนินการ: {item.actor_id ? `${item.actor_id.slice(0, 8)}…` : "ระบบ"}</Text>{item.note ? <Text style={styles.note}>หมายเหตุ: {item.note}</Text> : null}</View>;
  return <AdminGate><ScrollView style={styles.root} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={Colors.greenPrimary} />}>
    <Text style={styles.eyebrow}>ประวัติการดำเนินการ</Text><Text style={styles.title}>ประวัติระบบ</Text><Text style={styles.sub}>เก็บรายการอนุมัติ ปฏิเสธ และการดำเนินการสำคัญของผู้ดูแลระบบ</Text>
    <Text style={styles.section}>รายการของผู้ดูแลระบบ ({logs.length})</Text>{logs.length ? logs.map((item) => logCard(item)) : <Text style={styles.empty}>ยังไม่มีประวัติการดำเนินการ</Text>}
    <Text style={styles.section}>ประวัติการอนุมัติ ({events.length})</Text>{events.length ? events.map((item) => logCard(item, true)) : <Text style={styles.empty}>ยังไม่มีประวัติการอนุมัติ</Text>}
  </ScrollView></AdminGate>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background }, content: { padding: Spacing.lg, paddingTop: 54, paddingBottom: 110 }, eyebrow: { fontFamily: "Kanit_500Medium", color: Colors.goldDark, fontSize: 12, letterSpacing: 1 }, title: { fontFamily: "Kanit_700Bold", fontSize: 28, color: Colors.greenPrimary }, sub: { fontFamily: "Kanit_400Regular", color: Colors.textMuted }, section: { fontFamily: "Kanit_700Bold", fontSize: 18, marginTop: 24, color: Colors.textDark },
  card: { backgroundColor: Colors.cardBackground, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.inputBorder, padding: 14, marginTop: 9 }, row: { flexDirection: "row", justifyContent: "space-between", gap: 8 }, action: { flex: 1, fontFamily: "Kanit_500Medium", color: Colors.greenDark }, date: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, fontSize: 10 }, meta: { fontFamily: "Kanit_400Regular", color: Colors.textMedium, marginTop: 5 }, actor: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, fontSize: 11 }, note: { fontFamily: "Kanit_400Regular", color: Colors.textMedium, marginTop: 4 }, empty: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, padding: 14 },
});
