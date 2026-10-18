import { AdminPager } from "../../src/components/AdminPager";
import { LoadNotice } from "../../src/components/LoadNotice";
import { approvalQueueKind, adminPageRange } from "../../src/lib/adminWorkspace";
import { AdminSectionNav } from "../../src/components/AdminSectionNav";
import { useResponsiveStyles } from "../../src/hooks/useResponsiveStyles";
import { ScreenHeader } from "../../src/components/ScreenHeader";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Alert, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AppTextInput } from "../../src/components/AppTextInput";
import { KeyboardAwareScrollView } from "../../src/components/KeyboardAware";
import { AdminGate } from "../../src/components/AdminGate";
import { Button } from "../../src/components/Button";
import { BorderRadius, Colors, Spacing } from "../../src/constants/theme";
import { translateDatabaseError } from "../../src/lib/databaseError";
import { signedPrivateImageUrl } from "../../src/lib/storage";
import { supabase } from "../../src/lib/supabase";
import { RealtimeWatch, useRealtimeRefresh } from "../../src/hooks/useRealtimeRefresh";

type QueueKind = "market" | "store" | "seller";
const APPROVAL_WATCHES: RealtimeWatch[] = [
  { table: "markets", event: "INSERT" }, { table: "markets", event: "UPDATE" },
  { table: "stores", event: "INSERT" }, { table: "stores", event: "UPDATE" },
  { table: "store_seller_applications", event: "INSERT" }, { table: "store_seller_applications", event: "UPDATE" },
];

export default function AdminApprovals() {
  const styles = useResponsiveStyles(baseStyles, {"stack":["actions"],"fullWidth":["approve","reject"]});
  const router = useRouter();
  const { kind: routeKind } = useLocalSearchParams<{ kind?: string }>();
  const kind = approvalQueueKind(routeKind);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [counts, setCounts] = useState({ market: 0, store: 0, seller: 0 });
  const [loadError, setLoadError] = useState(false);
  const generation = useRef(0);
  const submitting = useRef(false);
  const [markets, setMarkets] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [working, setWorking] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const request = ++generation.current;
    setRefreshing(true);
    try {
    const [from, to] = adminPageRange(page);
    const [marketResult, storeResult, sellerResult] = await Promise.all([
      supabase.from("markets").select("market_id,name,description,hub_address,owner_id,created_at", { count: "exact" }).eq("approval_status", "pending").order("created_at").order("market_id").range(from, to),
      supabase.from("stores").select("store_id,name,product_name,image_url,unit,unit_price,manager_id,created_at,markets(name,owner_id)", { count: "exact" }).eq("approval_status", "pending").order("created_at").order("store_id").range(from, to),
      supabase.from("store_seller_applications").select("application_id,applicant_id,note,product_image_url,created_at,stores(name,product_name,image_url,markets(name,owner_id))", { count: "exact" }).eq("status", "pending").order("created_at").order("application_id").range(from, to),
    ]);
    if (request !== generation.current) return;
    if (marketResult.error || storeResult.error || sellerResult.error) throw new Error("queue unavailable");
    const nextSellers = await Promise.all((sellerResult.data ?? []).map(async (item: any) => ({ ...item, evidence_url: item.product_image_url ? await signedPrivateImageUrl("seller-evidence", item.product_image_url).catch(() => null) : null })));
    if (request !== generation.current) return;
    setCounts({ market: marketResult.count ?? 0, store: storeResult.count ?? 0, seller: sellerResult.count ?? 0 });
    if (page > 0 && page * 20 >= (kind === "market" ? marketResult.count ?? 0 : kind === "store" ? storeResult.count ?? 0 : sellerResult.count ?? 0)) { setPage(0); return; }
    setMarkets(marketResult.data ?? []);
    setStores(storeResult.data ?? []);
    setSellers(nextSellers); setLoadError(false);
    } catch { if (request === generation.current) setLoadError(true); }
    finally { if (request === generation.current) setRefreshing(false); }
  }, [page, kind]);

  useFocusEffect(useCallback(() => { void load(); return () => { generation.current++; }; }, [load]));
  useRealtimeRefresh("admin-approvals", load, APPROVAL_WATCHES);

  const review = (kind: QueueKind, id: number, approve: boolean, title: string) => {
    if (working !== null || loadError || refreshing) return;
    const key = `${kind}-${id}`;
    const note = notes[key]?.trim() || undefined;
    if (!approve && !note) return Alert.alert("กรุณาระบุเหตุผลที่ปฏิเสธ", "ผู้ยื่นคำขอจะได้ทราบว่าต้องแก้ไขส่วนใด");
    Alert.alert(approve ? "ยืนยันอนุมัติคำขอ?" : "ยืนยันปฏิเสธคำขอ?", `${title}\n${note ? "หมายเหตุ: " + note : "ระบบจะบันทึกประวัติและแจ้งผู้เกี่ยวข้อง"}`, [
      { text: "กลับ", style: "cancel" }, { text: approve ? "อนุมัติ" : "ปฏิเสธ", style: approve ? "default" : "destructive", onPress: () => {
        void (async () => {
          if (submitting.current) return;
          submitting.current = true; setWorking(key);
          try {
            const result = kind === "market"
              ? await supabase.rpc("review_market", { p_market_id: id, p_approve: approve, p_note: note })
              : kind === "store" ? await supabase.rpc("review_store", { p_store_id: id, p_approve: approve, p_note: note })
              : await supabase.rpc("review_store_seller", { p_application_id: id, p_approve: approve, p_note: note });
            if (result.error) throw result.error;
            setNotes((current) => ({ ...current, [key]: "" }));
            await load();
          } catch (error) { Alert.alert("ดำเนินการไม่สำเร็จ", translateDatabaseError(error as { message?: string; code?: string })); }
          finally { submitting.current = false; setWorking(null); }
        })();
      } },
    ]);
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
      {kind!=="market"&&(kind === "seller" ? item.evidence_url : item.image_url)?<Image source={{uri:kind === "seller" ? item.evidence_url : item.image_url}} style={styles.productImage}/>:null}
      <Text style={styles.detail}>{detail}</Text>{kind === "seller" && !item.evidence_url ? <Text style={styles.userId}>ยังเปิดรูปหลักฐานไม่ได้ กรุณารีเฟรชก่อนอนุมัติ</Text> : null}
      <Text style={styles.userId}>ผู้ยื่น: {(item.owner_id ?? item.manager_id ?? item.applicant_id)?.slice(0, 8)}…</Text>
      <AppTextInput style={styles.note} maxLength={500} editable={working === null} placeholder="หมายเหตุ (ต้องกรอกเมื่อปฏิเสธ)" value={notes[key] ?? ""} onChangeText={(value) => setNotes((current) => ({ ...current, [key]: value }))} />
      <View style={styles.actions}><Button title="อนุมัติ" size="sm" loading={working === key} disabled={working !== null || loadError || refreshing || (kind === "seller" && !item.evidence_url)} onPress={() => review(kind, id, true, title)} style={styles.approve} /><Button title="ปฏิเสธ" variant="outline" size="sm" disabled={working !== null || loadError || refreshing} onPress={() => review(kind, id, false, title)} style={styles.reject} /></View>
    </View>;
  };

  const section = (title: string, subtitle: string, data: any[], kind: QueueKind) => <View style={styles.sectionBlock}>
    <Text style={styles.section}>{title} <Text style={styles.count}>({data.length})</Text></Text><Text style={styles.sectionSub}>{subtitle}</Text>
    {data.length ? data.map((item) => queueCard(kind, item)) : <Text style={styles.empty}>ไม่มีรายการรอตรวจสอบ</Text>}
  </View>;

  return <AdminGate><KeyboardAwareScrollView style={styles.root} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={Colors.greenPrimary} />}>
    <ScreenHeader title={"คำขอที่รอตรวจสอบ"} titleStyle={styles.title} />
    <AdminSectionNav active="markets" />
    <Text style={styles.eyebrow}>ตรวจสอบคำขอ</Text><Text style={styles.sub}>ตรวจทุกคำขอจากจุดเดียว ทุกการอนุมัติและปฏิเสธจะถูกบันทึกไว้เพื่อตรวจสอบย้อนหลัง</Text>
    <View style={styles.filters}>{(["market", "store", "seller"] as const).map((queue) => <TouchableOpacity key={queue} accessibilityRole="button" accessibilityState={{ selected: kind === queue }} disabled={working !== null}
      onPress={() => { setPage(0); setSearch(""); router.setParams({ kind: queue }); }} style={[styles.filter, kind === queue && styles.activeFilter]}><Text style={[styles.filterText, kind === queue && { color: "white" }]}>{queue === "market" ? "ตลาด" : queue === "store" ? "ร้านค้า" : "ผู้ขายร่วม"} ({counts[queue]})</Text></TouchableOpacity>)}</View>
    <AppTextInput value={search} onChangeText={setSearch} maxLength={120} placeholder="ค้นหาชื่อหรือรายละเอียดในหน้านี้" style={styles.note} />
    {loadError ? <LoadNotice onRetry={() => void load()} /> : refreshing ? <Text style={styles.sectionSub}>กำลังโหลดคำขอ…</Text> :
      section(kind === "market" ? "คำขอเปิดตลาดชุมชน" : kind === "store" ? "คำขอเปิดร้านค้า" : "ผู้ขายร่วมร้าน", "เรียงจากคำขอเก่าที่สุดก่อน · แสดงครั้งละ 20 รายการ",
        (kind === "market" ? markets : kind === "store" ? stores : sellers).filter((item) => JSON.stringify([item.name, item.product_name, item.hub_address, item.description, item.note, item.stores?.name, item.stores?.product_name]).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())), kind)}
    <AdminPager page={page} total={counts[kind]} disabled={refreshing || working !== null || loadError} onPage={(value) => { setSearch(""); setPage(value); }} />

  </KeyboardAwareScrollView></AdminGate>;
}

const baseStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background }, content: { padding: Spacing.lg, paddingTop: 0, paddingBottom: 110 },
  eyebrow: { fontFamily: "Kanit_500Medium", color: Colors.goldDark, fontSize: 12, letterSpacing: 1 }, title: { fontFamily: "Kanit_700Bold", fontSize: 28, color: Colors.greenPrimary }, sub: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, lineHeight: 20 },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 }, filter: { minHeight: 44, justifyContent: "center", paddingHorizontal: 12, borderRadius: 22, backgroundColor: "white" }, activeFilter: { backgroundColor: Colors.greenPrimary }, filterText: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary },
  sectionBlock: { marginTop: 24 }, section: { fontFamily: "Kanit_700Bold", fontSize: 19, color: Colors.textDark }, count: { color: Colors.goldDark }, sectionSub: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, fontSize: 12 },
  card: { backgroundColor: Colors.cardBackground, padding: 16, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.inputBorder, marginTop: 10 }, cardHeader: { flexDirection: "row", gap: 10, alignItems: "center" }, typeIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#E8F2EC", alignItems: "center", justifyContent: "center" }, cardTitleWrap: { flex: 1 }, productImage: { width: "100%", height: 170, borderRadius: 12, backgroundColor: "#EAF1E9", marginTop: 12 },
  name: { fontFamily: "Kanit_700Bold", color: Colors.textDark }, date: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, fontSize: 11 }, detail: { fontFamily: "Kanit_400Regular", color: Colors.textMedium, marginTop: 10, lineHeight: 20 }, userId: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, fontSize: 11, marginTop: 5 },
  note: { backgroundColor: Colors.inputBackground, borderRadius: BorderRadius.md, padding: 11, marginTop: 12, fontFamily: "Kanit_400Regular" }, actions: { flexDirection: "row", gap: 8, marginTop: 10 }, approve: { flex: 1, backgroundColor: Colors.greenPrimary }, reject: { flex: 1, borderColor: Colors.danger }, empty: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, backgroundColor: Colors.cardBackground, borderRadius: BorderRadius.md, padding: 16, marginTop: 9, textAlign: "center" },
});
