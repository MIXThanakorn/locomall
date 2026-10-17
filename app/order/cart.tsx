import { useBottomActionLayout } from "../../src/hooks/useBottomActionLayout";
import { useResponsiveStyles } from "../../src/hooks/useResponsiveStyles";
import { ScreenHeader } from "../../src/components/ScreenHeader";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { ContextImage } from "../../src/components/ContextImage";
import { selectedCartItems, toggleCartSelection } from "../../src/lib/cartSelection";
import { LoadNotice } from "../../src/components/LoadNotice";
import { groupCartByMarket } from "../../src/lib/cartMarkets";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Button } from "../../src/components/Button";
import { BorderRadius, Colors, Spacing } from "../../src/constants/theme";
import { formatThaiDateTime } from "../../src/lib/date";
import { supabase } from "../../src/lib/supabase";
import { useBadgeCounts } from "../../src/context/BadgeContext";
import { useAuth } from "../../src/context/AuthContext";
import { RealtimeWatch, useRealtimeRefresh } from "../../src/hooks/useRealtimeRefresh";
import { formatSaleQuantity } from "../../src/lib/productUnit";

export default function Cart() {
  const { session } = useAuth();
  return <CartContent key={session?.user.id ?? "guest"} />;
}

function CartContent() {
  const styles = useResponsiveStyles(baseStyles, {"wrap":["itemBottom","totalRow"]});
  const router = useRouter();
  const bottomAction = useBottomActionLayout();
  const { refreshBadges } = useBadgeCounts();
  const { session } = useAuth();
  const userId = session?.user.id;
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [cart, setCart] = useState<any>();
  const [busyStoreId, setBusyStoreId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const generation = useRef(0);
  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    const request = ++generation.current;
    try {
      const result = await supabase.from("carts").select("*,cart_items(*,stores(name,product_name,unit,unit_price,image_url,market_id,markets(name)))").eq("buyer_id", userId).maybeSingle();
      if (result.error) throw result.error;
      if (request === generation.current) { setCart(result.data); setLoadError(false); }
    } catch { if (request === generation.current) setLoadError(true); }
    finally { if (request === generation.current) setLoading(false); }
  }, [userId]);
  useFocusEffect(useCallback(() => { void load(); const counter = generation; return () => { counter.current++; }; }, [load]));
  const watches = useMemo<RealtimeWatch[]>(() => userId ? [
    { table: "carts", event: "INSERT", filter: `buyer_id=eq.${userId}` },
    { table: "carts", event: "UPDATE", filter: `buyer_id=eq.${userId}` },
  ] : [], [userId]);
  useRealtimeRefresh(`cart-${userId}`, load, watches, Boolean(userId));
  const refresh = async () => {
    setRefreshing(true);
    try { await Promise.all([load(), refreshBadges()]); } finally { setRefreshing(false); }
  };

  const change = async (storeId: number, quantity: number) => {
    if (busyStoreId !== null) return;
    setBusyStoreId(storeId);
    try {
      const { error } = quantity <= 0
        ? await supabase.rpc("remove_cart_item", { p_store_id: storeId })
        : await supabase.rpc("upsert_cart_item", { p_store_id: storeId, p_quantity: quantity });
      if (error) {
        console.warn("Cart item update failed", error);
        Alert.alert(quantity <= 0 ? "ลบสินค้าไม่สำเร็จ" : "แก้ไขจำนวนสินค้าไม่สำเร็จ", "กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่อีกครั้ง");
        return;
      }
      await load();
      await refreshBadges();
    } catch (error) {
      console.warn("Cart item update failed", error);
      Alert.alert(quantity <= 0 ? "ลบสินค้าไม่สำเร็จ" : "แก้ไขจำนวนสินค้าไม่สำเร็จ", "กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่อีกครั้ง");
    } finally {
      setBusyStoreId(null);
    }
  };
  const confirmRemove = (storeId: number, productName: string) => {
    Alert.alert("ลบสินค้าออกจากตะกร้า?", `ลบ ${productName} ออกจากตะกร้า`, [
      { text: "ยกเลิก", style: "cancel" },
      { text: "ลบสินค้า", style: "destructive", onPress: () => void change(storeId, 0) },
    ]);
  };

  const groups = groupCartByMarket<any>(cart?.cart_items ?? [], cart?.market_id);
  const items = groups.flatMap((group) => group.items);
  const selected = selectedCartItems<any>(items, selectedIds);
  const selectedMarketId = selected.length ? Number(selected[0].stores.market_id) : null;
  const selectedTotal = selected.reduce((sum, item) => sum + item.quantity * Number(item.stores.unit_price), 0);
  const checkoutSelected = () => {
    if (!selected.length || loadError || busyStoreId !== null) return;
    router.push({ pathname: "/order/checkout", params: {
      marketId: String(selectedMarketId), itemIds: selected.map((item) => item.cart_item_id).join(","),
    } } as never);
  };

  return <View style={styles.root}>
    <ScreenHeader contentInset={0} title="ตะกร้าสินค้า" titleStyle={styles.title} style={{ backgroundColor: Colors.goldPrimary }} />
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomAction.contentBottom }]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={Colors.greenPrimary} />}>
      {loading ? <Text style={styles.summaryText}>กำลังโหลดตะกร้า…</Text> : null}
      {loadError ? <LoadNotice onRetry={() => void load()} /> : null}
      {items.length ? <View style={styles.summary}>
        <Text style={styles.summaryTitle}>สินค้าในตะกร้า · {groups.filter((group) => group.marketId > 0).length} ตลาด</Text>
        <Text style={styles.summaryText}>{items.length} รายการ</Text>
        <Text style={styles.updated}>แก้ไขล่าสุด {formatThaiDateTime(cart.updated_at)}</Text>
        <Text style={styles.summaryHint}>เลือกสินค้าที่ต้องการซื้อจากตลาดเดียวกันต่อหนึ่งออเดอร์</Text>
        {groups.some((group) => group.marketId === 0) ? <Text style={styles.removeText}>รายการที่ไม่พร้อมขายเลือกสั่งซื้อไม่ได้ แต่ยังลบออกได้</Text> : null}
      </View> : !loading && !loadError ? <Text style={styles.empty}>ยังไม่มีสินค้าในตะกร้า</Text> : null}
      {items.map((item: any) => {
        if (!item.stores) return <View key={item.cart_item_id} style={styles.card}><Text style={styles.name}>ร้านค้านี้ไม่พร้อมขาย</Text><Text style={styles.store}>คุณยังลบรายการนี้ออกจากตะกร้าได้</Text><TouchableOpacity style={styles.stepperButton} disabled={busyStoreId !== null} onPress={() => confirmRemove(item.store_id, "รายการที่ไม่พร้อมขาย")}><Text style={styles.removeText}>ลบจากตะกร้า</Text></TouchableOpacity></View>;
        const checked = selected.some((entry) => entry.cart_item_id === item.cart_item_id);
        const selectionDisabled = loadError || busyStoreId !== null || (selectedMarketId !== null && Number(item.stores.market_id) !== selectedMarketId);
        const group = groups.find((entry) => entry.items[0] === item);
        return <React.Fragment key={item.cart_item_id}>
          {group ? <View style={styles.summary}><TouchableOpacity onPress={() => router.push(`/market/${group.marketId}` as never)}><Text style={styles.summaryTitle}>{group.marketName} ›</Text></TouchableOpacity><Text style={styles.summaryText}>{group.items.length} รายการ</Text></View> : null}
          <View style={[styles.card, checked && styles.selectedCard]}>
          <View style={styles.selectionRow}>
            <TouchableOpacity style={[styles.checkbox, selectionDisabled && styles.unavailable]} disabled={selectionDisabled}
              accessibilityRole="checkbox" accessibilityState={{ checked, disabled: selectionDisabled }}
              accessibilityLabel={`เลือกซื้อ ${item.stores.product_name}`}
              onPress={() => setSelectedIds((ids) => toggleCartSelection(items, ids, item.cart_item_id))}>
              <Ionicons name={checked ? "checkbox" : "square-outline"} size={26} color={Colors.greenPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.storeLink} accessibilityRole="button" accessibilityLabel={`เปิดร้าน ${item.stores.name}`}
              onPress={() => router.push(`/store/${item.store_id}` as never)}>
              <ContextImage uri={item.stores.image_url} name={item.stores.name} size={64} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.name}>{item.stores.product_name}</Text>
                <Text style={styles.store}>ร้าน {item.stores.name} ›</Text>
                <Text style={styles.price}>฿{Number(item.stores.unit_price).toLocaleString()} / {item.stores.unit}</Text>
              </View>
            </TouchableOpacity>
          </View>
          <View style={styles.itemBottom}>
            <Text style={styles.quantityLabel}>จำนวน {formatSaleQuantity(item.quantity, item.stores.unit)}</Text>
            <View style={styles.qty}>
              <TouchableOpacity style={styles.stepperButton} disabled={busyStoreId !== null} onPress={() => item.quantity <= 1 ? confirmRemove(item.store_id, item.stores.product_name) : void change(item.store_id, item.quantity - 1)} accessibilityLabel={item.quantity <= 1 ? "ลบสินค้าออกจากตะกร้า" : "ลดจำนวน"}><Ionicons name="remove-circle-outline" size={28} /></TouchableOpacity>
              <Text style={styles.count}>{item.quantity}</Text>
              <TouchableOpacity style={styles.stepperButton} disabled={busyStoreId !== null} onPress={() => void change(item.store_id, item.quantity + 1)} accessibilityLabel="เพิ่มจำนวน"><Ionicons name="add-circle" size={28} color={Colors.greenPrimary} /></TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity disabled={busyStoreId !== null} style={styles.removeButton} onPress={() => confirmRemove(item.store_id, item.stores.product_name)} accessibilityLabel={`ลบ ${item.stores.product_name} ออกจากตะกร้า`}><Ionicons name="trash-outline" size={17} color={Colors.danger} /><Text style={styles.removeText}>ลบจากตะกร้า</Text></TouchableOpacity>
        </View></React.Fragment>;
      })}
    </ScrollView>
    {items.length ? <View onLayout={bottomAction.onLayout} style={[styles.bottom, { paddingBottom: bottomAction.paddingBottom }]}>
      {selected.length ? <>
        <View style={styles.totalRow}><Text style={styles.totalLabel}>เลือก {selected.length} รายการ</Text><Text style={styles.total}>฿{selectedTotal.toLocaleString()}</Text></View>
        <TouchableOpacity style={styles.clearSelection} accessibilityRole="button" onPress={() => setSelectedIds([])}><Text style={styles.price}>ล้างที่เลือก / เปลี่ยนตลาด</Text></TouchableOpacity>
      </> : <Text style={styles.summaryHint}>เลือกสินค้าที่ต้องการซื้อ เพื่อดูยอดรวม</Text>}
      <Button title={selected.length ? "เลือกวิธีรับสินค้าและสั่งซื้อ" : "กรุณาเลือกสินค้า"} disabled={!selected.length || loadError || busyStoreId !== null} onPress={checkoutSelected} style={{ backgroundColor: Colors.goldPrimary }} />
    </View> : null}
  </View>;
}

const baseStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  head: { padding: Spacing.lg, flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: Colors.goldPrimary },
  title: { fontFamily: "Kanit_700Bold", fontSize: 21, color: Colors.greenPrimary },
  content: { padding: Spacing.lg, paddingBottom: 190 },
  summary: { backgroundColor: "#EAF1E9", borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md },
  summaryTitle: { fontFamily: "Kanit_700Bold", fontSize: 18, color: Colors.greenPrimary },
  summaryText: { fontFamily: "Kanit_500Medium", color: Colors.textDark, marginTop: 2 },
  updated: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  summaryHint: { fontFamily: "Kanit_400Regular", color: Colors.textMedium, fontSize: 13, marginTop: 8 },
  card: { backgroundColor: "white", padding: Spacing.md, borderRadius: BorderRadius.lg, marginBottom: 12, borderWidth: 1, borderColor: Colors.inputBorder },
  selectedCard: { borderColor: Colors.greenPrimary, backgroundColor: "#F4FAF5" },
  selectionRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  checkbox: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  unavailable: { opacity: 0.35 },
  storeLink: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  clearSelection: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  itemTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  name: { fontFamily: "Kanit_700Bold", fontSize: 17, color: Colors.textDark },
  store: { fontFamily: "Kanit_400Regular", color: Colors.textMuted },
  price: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary, marginTop: 2 },
  subtotal: { fontFamily: "Kanit_700Bold", color: Colors.greenPrimary, fontSize: 18 },
  itemBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: Colors.inputBorder, marginTop: 12, paddingTop: 12 },
  quantityLabel: { fontFamily: "Kanit_500Medium", color: Colors.textMedium },
  stepperButton: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  qty: { flexDirection: "row", alignItems: "center", gap: 10 },
  count: { fontFamily: "Kanit_700Bold", minWidth: 24, textAlign: "center" },
  removeButton: { alignSelf: "flex-end", flexDirection: "row", alignItems: "center", gap: 5, marginTop: 12, paddingVertical: 4 },
  removeText: { fontFamily: "Kanit_500Medium", color: Colors.danger, fontSize: 13 },
  empty: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, textAlign: "center", marginTop: 50 },
  bottom: { position: "absolute", bottom: 0, left: 0, right: 0, padding: Spacing.md, backgroundColor: "white", borderTopWidth: 1, borderTopColor: Colors.inputBorder },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  totalLabel: { fontFamily: "Kanit_500Medium" },
  total: { fontFamily: "Kanit_700Bold", fontSize: 21, color: Colors.greenPrimary },
});
