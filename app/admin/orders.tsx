import { AdminPager } from "../../src/components/AdminPager";
import { AppTextInput } from "../../src/components/AppTextInput";
import { LoadNotice } from "../../src/components/LoadNotice";
import { KeyboardAwareScrollView } from "../../src/components/KeyboardAware";
import { ADMIN_ORDER_FILTERS, adminPageRange, escapeAdminSearch, type AdminOrderFilter } from "../../src/lib/adminWorkspace";
import { AdminSectionNav } from "../../src/components/AdminSectionNav";
import { useResponsiveStyles } from "../../src/hooks/useResponsiveStyles";
import { ScreenHeader } from "../../src/components/ScreenHeader";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Alert, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AdminGate } from "../../src/components/AdminGate";
import { Button } from "../../src/components/Button";
import { BorderRadius, Colors, Spacing } from "../../src/constants/theme";
import { translateDatabaseError } from "../../src/lib/databaseError";
import { formatThaiDateTime } from "../../src/lib/date";
import { supabase } from "../../src/lib/supabase";
import { RealtimeWatch, useRealtimeRefresh } from "../../src/hooks/useRealtimeRefresh";

const statusLabels: Record<string, string> = { awaiting_preparation: "รอผู้ขายรับออเดอร์", preparing: "กำลังเตรียม", at_hub: "ถึงจุดรวม", consolidated: "รวมพัสดุแล้ว", shipped: "จัดส่งแล้ว", delivered: "สำเร็จ", cancelled: "ยกเลิกแล้ว" };
const ORDER_WATCHES: RealtimeWatch[] = [{ table: "orders", event: "INSERT" }, { table: "orders", event: "UPDATE" }];

export default function AdminOrders() {
  const styles = useResponsiveStyles(baseStyles, {"wrap":["row"]});
  const router = useRouter();
  const [filter, setFilter] = useState<AdminOrderFilter>("active");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [reasons, setReasons] = useState<Record<number, string>>({});
  const generation = useRef(0);
  const submitting = useRef(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [working, setWorking] = useState<number | null>(null);
  const load = useCallback(async () => {
    const request = ++generation.current;
    setRefreshing(true);
    try {
      let requestQuery = supabase.from("orders").select("order_id,order_number,buyer_id,status,payment_status,total_amount,created_at,markets(name),order_items(order_item_id)", { count: "exact" });
      requestQuery = filter === "active" ? requestQuery.neq("status", "delivered").neq("status", "cancelled") : requestQuery.eq("status", filter);
      if (query) requestQuery = requestQuery.ilike("order_number", `%${escapeAdminSearch(query)}%`);
      const [from, to] = adminPageRange(page);
      const { data, error, count } = await requestQuery.order("created_at", { ascending: false }).order("order_id", { ascending: false }).range(from, to);
      if (request !== generation.current) return;
      if (error) throw error;
      if (page > 0 && from >= (count ?? 0)) { setPage(0); return; }
      setOrders(data ?? []); setTotal(count ?? 0); setLoadError(false);
    } catch { if (request === generation.current) setLoadError(true); }
    finally { if (request === generation.current) setRefreshing(false); }
  }, [filter, page, query]);
  useFocusEffect(useCallback(() => { void load(); return () => { generation.current++; }; }, [load]));
  useRealtimeRefresh("admin-orders", load, ORDER_WATCHES);
  const manage = (order: any, remove: boolean) => {
    if (working !== null || loadError || refreshing) return;
    const reason = reasons[order.order_id]?.trim();
    if (!reason) return Alert.alert("กรุณาระบุเหตุผล", "เหตุผลนี้จะถูกบันทึกไว้ในประวัติผู้ดูแลระบบ");
    Alert.alert(remove ? "ลบออเดอร์ผิดพลาด" : "ยืนยันยกเลิกคำสั่งซื้อ?",
      `${order.order_number}\nเหตุผล: ${reason}\n${remove ? "ลบถาวรได้เฉพาะออเดอร์ที่ยกเลิกแล้ว และจะเก็บหลักฐานในประวัติ" : "ระบบจะคืนยอด/การจองตามกติกา สินค้าที่รับจากผู้ขายแล้วต้องตรวจสอบการคืนสินค้าจริงแยกต่างหาก"}`,
      [{ text: "กลับ", style: "cancel" }, { text: remove ? "ลบออเดอร์" : "ยืนยันยกเลิก", style: "destructive", onPress: () => {
        void (async () => {
          if (submitting.current) return;
          submitting.current = true; setWorking(order.order_id);
          try {
            const { error } = remove
              ? await supabase.rpc("delete_cancelled_order", { p_order_id: order.order_id, p_reason: reason })
              : await supabase.rpc("cancel_order", { p_order_id: order.order_id, p_reason: reason, p_admin_override: true });
            if (error) throw error;
            setReasons((current) => ({ ...current, [order.order_id]: "" }));
            await load();
          } catch (error) { Alert.alert("ดำเนินการไม่สำเร็จ", translateDatabaseError(error as { message?: string; code?: string })); }
          finally { submitting.current = false; setWorking(null); }
        })();
      } }]);
  };

  return <AdminGate><KeyboardAwareScrollView style={styles.root} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={Colors.greenPrimary} />}>
    <ScreenHeader title={"จัดการคำสั่งซื้อ"} titleStyle={styles.title} />
    <AdminSectionNav active="orders" />
    <Text style={styles.eyebrow}>ติดตามการสั่งซื้อ</Text><Text style={styles.sub}>ค้นหาเลขออเดอร์และกรองตามขั้นตอน · การยกเลิกหรือลบต้องระบุเหตุผล</Text>
    <View style={styles.search}><AppTextInput style={styles.searchInput} value={search} onChangeText={setSearch} maxLength={120} placeholder="ค้นหาเลขออเดอร์" returnKeyType="search" onSubmitEditing={() => { setPage(0); setQuery(search.trim()); }} /><Button title="ค้นหา" size="sm" disabled={working !== null} onPress={() => { setPage(0); setQuery(search.trim()); }} /></View>
    <View style={styles.filters}>{ADMIN_ORDER_FILTERS.map((entry) => <TouchableOpacity key={entry.value} style={[styles.filter, filter === entry.value && styles.activeFilter]} accessibilityRole="button" accessibilityState={{ selected: filter === entry.value }} disabled={working !== null} onPress={() => { setPage(0); setFilter(entry.value); }}><Text style={[styles.filterText, filter === entry.value && { color: "white" }]}>{entry.label}</Text></TouchableOpacity>)}</View>
    {loadError ? <LoadNotice onRetry={() => void load()} /> : refreshing ? <Text style={styles.meta}>กำลังโหลดคำสั่งซื้อ…</Text> : null}
    {!refreshing && !loadError && !orders.length ? <Text style={styles.empty}>ไม่มีคำสั่งซื้อ</Text> : orders.map((order) => <View key={order.order_id} style={styles.card}>
      <View style={styles.row}><Text style={styles.number}>{order.order_number}</Text><Text style={styles.status}>{statusLabels[order.status] ?? order.status}</Text></View>
      <Text style={styles.market}>{order.markets?.name ?? "ไม่พบชื่อตลาดชุมชน"}</Text><Text style={styles.meta}>ผู้ซื้อ {order.buyer_id.slice(0, 8)}… · {order.order_items?.length ?? 0} รายการ</Text>
      <View style={styles.row}><Text style={styles.date}>{formatThaiDateTime(order.created_at)}</Text><Text style={styles.total}>฿{Number(order.total_amount).toLocaleString()}</Text></View>
      <Button title="เปิดรายละเอียดคำสั่งซื้อ" variant="outline" size="sm" onPress={() => router.push(`/order/${order.order_id}` as never)} style={{ marginTop: 12 }} />
      {order.status !== "delivered" ? <>
        <AppTextInput placeholder="เหตุผลที่ดำเนินการ (จำเป็น)" style={styles.reason} multiline maxLength={500} editable={working === null}
          value={reasons[order.order_id] ?? ""} onChangeText={(value) => setReasons((current) => ({ ...current, [order.order_id]: value }))} />
        <Button title={order.status === "cancelled" ? "ลบออเดอร์ผิดพลาด" : "ยกเลิกคำสั่งซื้อ"} variant="outline" size="sm"
          disabled={working !== null || loadError || refreshing} loading={working === order.order_id} onPress={() => manage(order, order.status === "cancelled")} style={styles.cancel} />
      </> : null}
    </View>)}
    <AdminPager page={page} total={total} disabled={refreshing || working !== null || loadError} onPage={setPage} />

  </KeyboardAwareScrollView></AdminGate>;
}

const baseStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background }, content: { padding: Spacing.lg, paddingTop: 0, paddingBottom: 110 }, eyebrow: { fontFamily: "Kanit_500Medium", color: Colors.goldDark, fontSize: 12, letterSpacing: 1 }, title: { fontFamily: "Kanit_700Bold", fontSize: 26, color: Colors.greenPrimary }, sub: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, lineHeight: 20, marginBottom: 14 },
  search: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }, searchInput: { flex: 1, minWidth: 140, padding: 12, backgroundColor: "white", borderRadius: 12 }, filters: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }, filter: { minHeight: 44, justifyContent: "center", paddingHorizontal: 12, borderRadius: 22, backgroundColor: "white" }, activeFilter: { backgroundColor: Colors.greenPrimary }, filterText: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary, fontSize: 12 }, reason: { minHeight: 68, marginTop: 12, padding: 12, backgroundColor: Colors.inputBackground, borderRadius: 12, textAlignVertical: "top" },
  card: { backgroundColor: Colors.cardBackground, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.inputBorder, padding: 16, marginTop: 10 }, row: { flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "center" }, number: { fontFamily: "Kanit_700Bold", color: Colors.textDark }, status: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary, fontSize: 12, backgroundColor: "#E8F2EC", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 99 }, market: { fontFamily: "Kanit_500Medium", marginTop: 7 }, meta: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, fontSize: 12 }, date: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, fontSize: 11, marginTop: 8 }, total: { fontFamily: "Kanit_700Bold", color: Colors.goldDark, marginTop: 8 }, cancel: { borderColor: Colors.danger, marginTop: 12 }, empty: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, textAlign: "center", marginTop: 60 },
});
