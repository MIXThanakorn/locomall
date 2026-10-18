import { AdminPager } from "../../src/components/AdminPager";
import { LoadNotice } from "../../src/components/LoadNotice";
import { adminPageRange } from "../../src/lib/adminWorkspace";
import { AdminSectionNav } from "../../src/components/AdminSectionNav";
import { useResponsiveStyles } from "../../src/hooks/useResponsiveStyles";
import { ScreenHeader } from "../../src/components/ScreenHeader";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
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
  const styles = useResponsiveStyles(baseStyles, {});
  const [filter, setFilter] = useState<"visible" | "hidden">("visible");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const generation = useRef(0);
  const submitting = useRef(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reasons, setReasons] = useState<Record<number,string>>({});
  const [busy, setBusy] = useState<number|null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    const request = ++generation.current;
    setRefreshing(true);
    try {
      let query = (supabase as any).from("purchase_reviews").select("*", { count: "exact" });
      query = filter === "visible" ? query.is("hidden_at", null) : query.not("hidden_at", "is", null);
      const [from, to] = adminPageRange(page);
      const { data, error, count } = await query.order("created_at", { ascending: false }).order("review_id", { ascending: false }).range(from, to);
      if (request !== generation.current) return;
      if (error) throw error;
      if (page > 0 && from >= (count ?? 0)) { setPage(0); return; }
      setReviews(data ?? []); setTotal(count ?? 0); setLoadError(false);
    } catch { if (request === generation.current) setLoadError(true); }
    finally { if (request === generation.current) setRefreshing(false); }
  }, [page, filter]);
  useFocusEffect(useCallback(() => { void load(); return () => { generation.current++; }; }, [load]));
  const moderate = async (review: any, hide: boolean) => {
    if (hide && !reasons[review.review_id]?.trim()) return Alert.alert("กรุณาระบุเหตุผลก่อนซ่อนรีวิว");
    if (submitting.current || loadError || refreshing) return;
    submitting.current = true; setBusy(review.review_id);
    try {
    const { error } = await (supabase as any).rpc("moderate_purchase_review", {
      p_review_id: review.review_id, p_hide: hide, p_reason: hide ? reasons[review.review_id].trim() : null,
    });
    if (error) Alert.alert("จัดการรีวิวไม่สำเร็จ", translateDatabaseError(error)); else await load();
    } catch { Alert.alert("จัดการรีวิวไม่สำเร็จ", "กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่"); }
    finally { submitting.current = false; setBusy(null); }
  };
  return <AdminGate><KeyboardAwareScrollView style={styles.root} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load().finally(() => setRefreshing(false)); }} tintColor={Colors.greenPrimary} />}>
    <ScreenHeader title={"ดูแลรีวิว"} titleStyle={styles.title} />
    <AdminSectionNav active="reviews" /><Text style={styles.note}>รีวิวที่ซ่อนจะไม่ถูกรวมในคะแนนเฉลี่ยและไม่แสดงต่อสาธารณะ</Text>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginVertical: 12 }}>{(["visible", "hidden"] as const).map((value) => <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: filter === value }} key={value} disabled={busy !== null}
      onPress={() => { setPage(0); setFilter(value); }} style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 16, borderRadius: 22, backgroundColor: filter === value ? Colors.greenPrimary : "white" }}><Text style={[styles.note, { color: filter === value ? "white" : Colors.greenPrimary }]}>{value === "visible" ? "แสดงอยู่" : "ถูกซ่อน"}</Text></TouchableOpacity>)}</View>
    {loadError ? <LoadNotice onRetry={() => void load()} /> : refreshing ? <Text style={styles.note}>กำลังโหลดรีวิว…</Text> : null}
    {reviews.map((review) => <View key={review.review_id} style={styles.card}>
      <Text style={styles.bold}>{review.store_id ? `ร้าน #${review.store_id}` : `ตลาด #${review.market_id}`} · {review.stars} ★</Text>
      <Text style={styles.note}>ออเดอร์ #{review.order_id} · {formatThaiDateTime(review.created_at)}</Text>
      <Text style={styles.body}>{review.body || "ไม่มีข้อความ"}</Text>
      {review.hidden_at ? <><Text style={styles.hidden}>ซ่อนแล้ว: {review.hide_reason}</Text><Button title="แสดงรีวิวอีกครั้ง" variant="outline" disabled={busy !== null || loadError || refreshing} loading={busy===review.review_id} onPress={() => moderate(review, false)} /></>
        : <><AppTextInput maxLength={500} editable={busy === null} placeholder="เหตุผลที่ซ่อนรีวิว" value={reasons[review.review_id] ?? ""} onChangeText={(value) => setReasons({ ...reasons, [review.review_id]: value })} style={styles.input} /><Button title="ซ่อนรีวิว" variant="outline" disabled={busy !== null || loadError || refreshing} loading={busy===review.review_id} onPress={() => moderate(review, true)} /></>}
    </View>)}
    {!refreshing && !loadError && !reviews.length ? <Text style={styles.note}>ยังไม่มีรีวิว</Text> : null}
    <AdminPager page={page} total={total} disabled={refreshing || busy !== null || loadError} onPage={setPage} />
  </KeyboardAwareScrollView></AdminGate>;
}
const baseStyles = StyleSheet.create({ root: { flex: 1, backgroundColor: Colors.background }, content: { padding: Spacing.lg, paddingTop: 0, paddingBottom: 90 }, back: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary }, title: { fontFamily: "Kanit_700Bold", fontSize: 27, color: Colors.greenPrimary, marginTop: 12 }, note: { fontFamily: "Kanit_400Regular", color: Colors.textMuted }, card: { padding: 14, backgroundColor: "white", borderRadius: BorderRadius.lg, marginTop: 12 }, bold: { fontFamily: "Kanit_700Bold", color: Colors.textDark }, body: { fontFamily: "Kanit_400Regular", color: Colors.textDark, marginVertical: 10 }, hidden: { fontFamily: "Kanit_500Medium", color: Colors.danger }, input: { borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: BorderRadius.md, padding: 10, marginVertical: 8, color: Colors.textDark } });
