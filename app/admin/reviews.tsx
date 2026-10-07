import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Alert, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AppTextInput } from "../../src/components/AppTextInput";
import { KeyboardAwareScrollView } from "../../src/components/KeyboardAware";
import { AdminGate } from "../../src/components/AdminGate";
import { Button } from "../../src/components/Button";
import { BorderRadius, Colors, Spacing } from "../../src/constants/theme";
import { formatThaiDateTime } from "../../src/lib/date";
import { translateDatabaseError } from "../../src/lib/databaseError";
import { supabase } from "../../src/lib/supabase";

export default function AdminReviews() {
  const router = useRouter();
  const [reviews, setReviews] = useState<any[]>([]);
  const [reasons, setReasons] = useState<Record<number,string>>({});
  const [busy, setBusy] = useState<number|null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    const { data } = await (supabase as any).from("purchase_reviews").select("*").order("created_at", { ascending: false }).limit(100);
    setReviews(data ?? []);
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const moderate = async (review: any, hide: boolean) => {
    if (hide && !reasons[review.review_id]?.trim()) return Alert.alert("กรุณาระบุเหตุผลก่อนซ่อนรีวิว");
    setBusy(review.review_id);
    const { error } = await (supabase as any).rpc("moderate_purchase_review", {
      p_review_id: review.review_id, p_hide: hide, p_reason: hide ? reasons[review.review_id].trim() : null,
    });
    setBusy(null);
    if (error) Alert.alert("จัดการรีวิวไม่สำเร็จ", translateDatabaseError(error)); else await load();
  };
  return <AdminGate><KeyboardAwareScrollView style={styles.root} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load().finally(() => setRefreshing(false)); }} tintColor={Colors.greenPrimary} />}>
    <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>← กลับศูนย์ควบคุม</Text></TouchableOpacity>
    <Text style={styles.title}>ดูแลรีวิว</Text><Text style={styles.note}>รีวิวที่ซ่อนจะไม่ถูกรวมในคะแนนเฉลี่ยและไม่แสดงต่อสาธารณะ</Text>
    {reviews.map((review) => <View key={review.review_id} style={styles.card}>
      <Text style={styles.bold}>{review.store_id ? `ร้าน #${review.store_id}` : `ตลาด #${review.market_id}`} · {review.stars} ★</Text>
      <Text style={styles.note}>ออเดอร์ #{review.order_id} · {formatThaiDateTime(review.created_at)}</Text>
      <Text style={styles.body}>{review.body || "ไม่มีข้อความ"}</Text>
      {review.hidden_at ? <><Text style={styles.hidden}>ซ่อนแล้ว: {review.hide_reason}</Text><Button title="แสดงรีวิวอีกครั้ง" variant="outline" loading={busy===review.review_id} onPress={() => moderate(review, false)} /></>
        : <><AppTextInput placeholder="เหตุผลที่ซ่อนรีวิว" value={reasons[review.review_id] ?? ""} onChangeText={(value) => setReasons({ ...reasons, [review.review_id]: value })} style={styles.input} /><Button title="ซ่อนรีวิว" variant="outline" loading={busy===review.review_id} onPress={() => moderate(review, true)} /></>}
    </View>)}
    {!reviews.length ? <Text style={styles.note}>ยังไม่มีรีวิว</Text> : null}
  </KeyboardAwareScrollView></AdminGate>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: Colors.background }, content: { padding: Spacing.lg, paddingTop: 56, paddingBottom: 90 }, back: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary }, title: { fontFamily: "Kanit_700Bold", fontSize: 27, color: Colors.greenPrimary, marginTop: 12 }, note: { fontFamily: "Kanit_400Regular", color: Colors.textMuted }, card: { padding: 14, backgroundColor: "white", borderRadius: BorderRadius.lg, marginTop: 12 }, bold: { fontFamily: "Kanit_700Bold", color: Colors.textDark }, body: { fontFamily: "Kanit_400Regular", color: Colors.textDark, marginVertical: 10 }, hidden: { fontFamily: "Kanit_500Medium", color: Colors.danger }, input: { borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: BorderRadius.md, padding: 10, marginVertical: 8, color: Colors.textDark } });
