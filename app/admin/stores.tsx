import { AdminSectionNav } from "../../src/components/AdminSectionNav";
import { useResponsiveStyles } from "../../src/hooks/useResponsiveStyles";
import { ScreenHeader } from "../../src/components/ScreenHeader";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Alert, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AdminGate } from "../../src/components/AdminGate";
import { AppTextInput } from "../../src/components/AppTextInput";
import { Button } from "../../src/components/Button";
import { KeyboardAwareScrollView } from "../../src/components/KeyboardAware";
import { BorderRadius, Colors, Spacing } from "../../src/constants/theme";
import { useAuth } from "../../src/context/AuthContext";
import { RealtimeWatch, useRealtimeRefresh } from "../../src/hooks/useRealtimeRefresh";
import { translateDatabaseError } from "../../src/lib/databaseError";
import { approvalStatusLabel } from "../../src/lib/displayText";
import { supabase } from "../../src/lib/supabase";

type Store = {
  store_id: number; name: string; product_name: string; approval_status: "approved" | "suspended";
  approval_note: string | null; updated_at: string; markets: { name: string; approval_status: string } | null;
};
type Filter = "all" | "approved" | "suspended";
const PAGE_SIZE = 20;
const WATCHES: RealtimeWatch[] = [{ table: "stores", event: "UPDATE" }, { table: "markets", event: "UPDATE" }];

export default function AdminStores() {
  const styles = useResponsiveStyles(baseStyles, {"stack":["search","pager"],"wrap":["filters"]});
  const { isAdmin } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [working, setWorking] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const generation = useRef(0);
  const submitting = useRef(false);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    const request = ++generation.current;
    setRefreshing(true);
    try {
      let requestQuery = supabase.from("stores")
        .select("store_id,name,product_name,approval_status,approval_note,updated_at,markets(name,approval_status)", { count: "exact" })
        .in("approval_status", filter === "all" ? ["approved", "suspended"] : [filter]);
      if (query) requestQuery = requestQuery.ilike("name", `%${query.replace(/[%_\\]/g, "\\$&")}%`);
      const { data, error, count } = await requestQuery.order("store_id", { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (request !== generation.current) return;
      if (error) throw error;
      setStores((data ?? []) as unknown as Store[]);
      setTotal(count ?? 0);
      setLoadError("");
    } catch (error) {
      if (request === generation.current) setLoadError(translateDatabaseError(error as { message?: string; code?: string }));
    } finally {
      if (request === generation.current) setRefreshing(false);
    }
  }, [filter, isAdmin, page, query]);
  useFocusEffect(useCallback(() => { void load(); return () => { generation.current++; }; }, [load]));
  useRealtimeRefresh("admin-store-moderation", load, WATCHES, Boolean(isAdmin));

  const submit = async (store: Store, suspend: boolean, reason: string) => {
    if (submitting.current) return;
    submitting.current = true;
    setWorking(store.store_id);
    try {
      const { data, error } = await supabase.rpc("set_store_suspension", {
        p_store_id: store.store_id, p_suspend: suspend, p_note: reason, p_expected_updated_at: store.updated_at,
      });
      if (error) throw error;
      setNotes((current) => ({ ...current, [store.store_id]: "" }));
      Alert.alert(data ? (suspend ? "ระงับร้านค้าแล้ว" : "คืนสิทธิ์ร้านค้าแล้ว") : "สถานะนี้ถูกดำเนินการแล้ว",
        "ออเดอร์เดิม สต็อก และประวัติยอดเงินยังคงอยู่ ระบบบันทึกประวัติและแจ้งผู้เกี่ยวข้องเมื่อเปลี่ยนสถานะ");
    } catch (error) {
      Alert.alert("ดำเนินการไม่สำเร็จ", translateDatabaseError(error as { message?: string; code?: string }));
    } finally {
      submitting.current = false;
      setWorking(null);
      await load();
    }
  };
  const confirm = (store: Store) => {
    const reason = notes[store.store_id]?.trim();
    if (!reason) return Alert.alert("กรุณาระบุเหตุผล", "เหตุผลจะถูกบันทึกในประวัติและแจ้งผู้ดูแลร้าน ผู้ขายร่วม และเจ้าของตลาด");
    const suspend = store.approval_status === "approved";
    Alert.alert(suspend ? "ระงับการเปิดขายร้านนี้?" : "คืนสิทธิ์การเปิดขาย?",
      `${store.name}\n${suspend ? "ร้านจะไม่แสดงในรายการสาธารณะและรับออเดอร์ใหม่ไม่ได้ ออเดอร์เดิมยังดำเนินการต่อได้" : "ร้านจะกลับมาแสดงและรับออเดอร์ใหม่ได้ตามสต็อก โดยไม่เปลี่ยนสถานะพักขายของผู้ขายร่วม"}\nเหตุผล: ${reason}`,
      [{ text: "ยกเลิก", style: "cancel" }, { text: "ยืนยัน", style: suspend ? "destructive" : "default", onPress: () => { void submit(store, suspend, reason); } }]);
  };

  return <AdminGate><KeyboardAwareScrollView style={styles.root} contentContainerStyle={styles.content}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={Colors.greenPrimary} />}>
    <ScreenHeader title={"ดูแลร้านค้า"} titleStyle={styles.title} color={Colors.greenPrimary} />
    <AdminSectionNav active="stores" />
    <Text style={styles.sub}>ระงับหรือคืนสิทธิ์การรับคำสั่งซื้อใหม่ ไม่ลบออเดอร์ สต็อก หรือยอดเงิน และไม่ใช่การแบนบัญชีผู้ใช้</Text>
    <View style={styles.search}><AppTextInput style={styles.searchInput} placeholder="ค้นหาชื่อร้านค้า" value={search} onChangeText={setSearch} maxLength={100} returnKeyType="search"
      onSubmitEditing={() => { setPage(0); setQuery(search.trim()); }} />
      <Button title="ค้นหา" size="sm" disabled={working !== null} onPress={() => { setPage(0); setQuery(search.trim()); }} /></View>
    <View style={styles.filters}>{([['all', 'ทั้งหมด'], ['approved', 'เปิดขาย'], ['suspended', 'ระงับ']] as const).map(([key, label]) =>
      <TouchableOpacity key={key} disabled={working !== null} style={[styles.filter, filter === key && styles.activeFilter]} onPress={() => { setPage(0); setFilter(key); }}>
        <Text style={[styles.filterText, filter === key && styles.activeText]}>{label}</Text></TouchableOpacity>)}</View>
    {loadError ? <Text style={styles.error}>โหลดข้อมูลไม่สำเร็จ: {loadError} · ดึงลงเพื่อลองใหม่</Text> : null}
    {!refreshing && !loadError && !stores.length ? <Text style={styles.sub}>ไม่พบร้านค้าในหมวดนี้</Text> : null}
    {!loadError && stores.map((store) => <View key={store.store_id} style={styles.card}>
      <Text style={styles.name}>{store.name}</Text><Text style={styles.sub}>{store.product_name} · {store.markets?.name} · ร้าน #{store.store_id}</Text>
      <Text style={[styles.status, store.approval_status === "suspended" && styles.error]}>{approvalStatusLabel(store.approval_status)}</Text>
      {store.approval_note ? <Text style={styles.sub}>หมายเหตุล่าสุด: {store.approval_note}</Text> : null}
      <AppTextInput style={styles.note} value={notes[store.store_id] ?? ""} onChangeText={(value) => setNotes((current) => ({ ...current, [store.store_id]: value }))}
        placeholder={store.approval_status === "approved" ? "เหตุผลที่ระงับร้านค้า (จำเป็น)" : "เหตุผลที่คืนสิทธิ์ร้านค้า (จำเป็น)"} maxLength={500} multiline editable={working === null} />
      <Text style={styles.sub}>เหตุผลแจ้งเฉพาะผู้เกี่ยวข้อง · {(notes[store.store_id] ?? "").length}/500</Text>
      <Button title={store.approval_status === "approved" ? "ระงับร้านค้า" : "คืนสิทธิ์เปิดขาย"} variant={store.approval_status === "approved" ? "danger" : "green"}
        loading={working === store.store_id} disabled={working !== null || (store.approval_status === "suspended" && store.markets?.approval_status !== "approved")}
        onPress={() => confirm(store)} style={{ marginTop: 12 }} />
      {store.approval_status === "suspended" && store.markets?.approval_status !== "approved" ? <Text style={styles.error}>คืนสิทธิ์ได้เมื่อตลาดได้รับการอนุมัติและเปิดใช้งาน</Text> : null}
    </View>)}
    <View style={styles.pager}><Button title="ก่อนหน้า" size="sm" variant="outline" disabled={page === 0 || refreshing || working !== null} onPress={() => setPage((value) => value - 1)} />
      <Text style={styles.sub}>หน้า {page + 1} · {total} ร้าน</Text><Button title="ถัดไป" size="sm" variant="outline" disabled={(page + 1) * PAGE_SIZE >= total || refreshing || working !== null} onPress={() => setPage((value) => value + 1)} /></View>
  </KeyboardAwareScrollView></AdminGate>;
}

const baseStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background }, content: { padding: Spacing.lg, paddingTop: 0, paddingBottom: 110 },
  title: { fontFamily: "Kanit_700Bold", fontSize: 28, color: Colors.greenPrimary, marginTop: 12 }, sub: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, lineHeight: 21, fontSize: 13 },
  search: { flexDirection: "row", gap: 10, marginVertical: 16 }, searchInput: { flex: 1, padding: 12, borderRadius: BorderRadius.md, backgroundColor: Colors.inputBackground },
  filters: { flexDirection: "row", gap: 8, marginBottom: 16 }, filter: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: Colors.cardBackground, borderRadius: BorderRadius.round },
  activeFilter: { backgroundColor: Colors.greenPrimary }, filterText: { fontFamily: "Kanit_500Medium", color: Colors.textMedium }, activeText: { color: Colors.textWhite },
  card: { padding: 16, marginBottom: 14, borderRadius: BorderRadius.lg, backgroundColor: Colors.cardBackground, borderWidth: 1, borderColor: Colors.inputBorder },
  name: { fontFamily: "Kanit_700Bold", color: Colors.textDark, fontSize: 18 }, status: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary, marginVertical: 8 },
  note: { minHeight: 82, textAlignVertical: "top", padding: 12, backgroundColor: Colors.inputBackground, borderRadius: BorderRadius.md, marginTop: 12 },
  error: { fontFamily: "Kanit_400Regular", color: Colors.danger, marginVertical: 8 }, pager: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 12 },
});
