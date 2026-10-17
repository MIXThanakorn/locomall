import { useResponsiveStyles } from "../../../src/hooks/useResponsiveStyles";
import { ScreenHeader } from "../../../src/components/ScreenHeader";
/* eslint-disable react-hooks/preserve-manual-memoization */
import { useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Alert, RefreshControl, StyleSheet, Text, View } from "react-native";
import { AppTextInput } from "../../../src/components/AppTextInput";
import { KeyboardAwareScrollView } from "../../../src/components/KeyboardAware";
import { Button } from "../../../src/components/Button";
import { PermissionGate } from "../../../src/components/PermissionGate";
import { Colors, Spacing } from "../../../src/constants/theme";
import { useAuth } from "../../../src/context/AuthContext";
import { useCapabilities } from "../../../src/hooks/useCapabilities";
import { translateDatabaseError } from "../../../src/lib/databaseError";
import { approvalStatusLabel } from "../../../src/lib/displayText";
import { supabase } from "../../../src/lib/supabase";
import { formatSaleQuantity } from "../../../src/lib/productUnit";
import { RealtimeWatch, useRealtimeRefresh } from "../../../src/hooks/useRealtimeRefresh";

export default function Stock() {
  const styles = useResponsiveStyles(baseStyles, {});
  const permissions = useCapabilities();
  const { session } = useAuth();
  const [list, setList] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!session?.user.id) return setList([]);
    const { data, error } = await supabase
      .from("seller_listings")
      .select("*,stores(name,product_name,unit,approval_status,approval_note)")
      .eq("seller_id", session.user.id)
      .order("created_at");
    if (error) Alert.alert("โหลดจำนวนสินค้าไม่สำเร็จ", translateDatabaseError(error));
    setList(data ?? []);
  }, [session?.user.id]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const watches = useMemo<RealtimeWatch[]>(() => session?.user.id ? [
    { table: "seller_listings", event: "INSERT", filter: `seller_id=eq.${session.user.id}` },
    { table: "seller_listings", event: "UPDATE", filter: `seller_id=eq.${session.user.id}` },
    { table: "stores", event: "UPDATE" },
  ] : [], [session?.user.id]);
  useRealtimeRefresh(`seller-stock-${session?.user.id}`, load, watches, Boolean(session?.user.id));

  const save = async (listing: any) => {
    const quantity = Number(listing.draft ?? listing.stock_quantity);
    if (!Number.isInteger(quantity) || quantity < listing.reserved_quantity) {
      return Alert.alert("จำนวนสินค้าไม่ถูกต้อง", `จำนวนต้องไม่น้อยกว่าสินค้าที่มีลูกค้าสั่งไว้ ${formatSaleQuantity(listing.reserved_quantity, listing.stores?.unit)}`);
    }
    const { error } = await supabase.rpc("update_my_listing_stock", {
      p_listing_id: listing.listing_id,
      p_stock_quantity: quantity,
      p_status: listing.status,
    });
    if (error) Alert.alert("บันทึกจำนวนสินค้าไม่สำเร็จ", translateDatabaseError(error));
    else { Alert.alert("บันทึกจำนวนสินค้าคงเหลือแล้ว"); await load(); }
  };

  return <PermissionGate allow={permissions.isSeller || permissions.isStoreManager} loading={permissions.loading}>
    <KeyboardAwareScrollView contentContainerStyle={styles.root} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load().finally(() => setRefreshing(false)); }} tintColor={Colors.greenPrimary} />}>
    <ScreenHeader title={"จัดการสต็อกสินค้า"} titleStyle={styles.title} />
      <Text style={styles.sub}>กรอกจำนวนหน่วยสั่งซื้อที่ยังอยู่กับคุณ รวมหน่วยที่จองแล้วแต่ยังไม่ถึงจุดรวม เช่น สินค้าแบบ 500 กรัมต่อชุด ให้กรอกจำนวนชุด ระบบจองสินค้าเมื่อสั่งซื้อ และหักยอดคงเหลือเมื่อเจ้าของตลาดบันทึกว่าสินค้าถึงจุดรวมแล้ว ไม่หักซ้ำตอนผู้ซื้อยืนยันรับสินค้า</Text>
      {!list.length ? <View style={styles.empty}><Text style={styles.emptyText}>ยังไม่มีรายการขายที่ผ่านการอนุมัติ</Text></View> : null}
      {list.map((listing, index) => <View style={styles.card} key={listing.listing_id}>
        <Text style={styles.name}>{listing.stores?.product_name} · {listing.stores?.name}</Text>
        <Text style={styles.reserved}>คงเหลือทั้งหมด {formatSaleQuantity(listing.stock_quantity, listing.stores?.unit)} · จองแล้ว {formatSaleQuantity(listing.reserved_quantity, listing.stores?.unit)}</Text>
        <Text style={styles.available}>พร้อมให้สั่ง {formatSaleQuantity(listing.status === "active" && listing.stores?.approval_status === "approved" ? Math.max(0, listing.stock_quantity - listing.reserved_quantity) : 0, listing.stores?.unit)}{listing.status !== "active" ? " (หยุดขายชั่วคราว)" : ""}</Text>
        {listing.stores?.approval_status === "suspended" ? <Text style={styles.suspension}>{approvalStatusLabel("suspended")} · {listing.stores.approval_note || "ติดต่อผู้ดูแลระบบ"} · ออเดอร์เดิมยังดำเนินการต่อได้</Text> : null}
        <Text style={styles.inputLabel}>แก้ไขจำนวนคงเหลือทั้งหมด (รวมที่จองแล้ว)</Text>
        <AppTextInput
          style={styles.input}
          keyboardType="number-pad"
          value={String(listing.draft ?? listing.stock_quantity)}
          onChangeText={(value) => setList((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, draft: value } : item))}
        />
        <Button title="บันทึกจำนวนคงเหลือ" size="sm" onPress={() => save(listing)} />
      </View>)}
    </KeyboardAwareScrollView>
  </PermissionGate>;
}

const baseStyles = StyleSheet.create({
  root: { padding: Spacing.lg, paddingTop: 0, backgroundColor: Colors.background, flexGrow: 1 },
  title: { fontFamily: "Kanit_700Bold", fontSize: 25, color: Colors.greenPrimary },
  sub: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, marginTop: 2 },
  card: { padding: 16, backgroundColor: "white", borderRadius: 16, marginTop: 12 },
  name: { fontFamily: "Kanit_700Bold", color: Colors.textDark },
  reserved: { fontFamily: "Kanit_400Regular", color: Colors.textMuted },
  available: { fontFamily: "Kanit_700Bold", color: Colors.greenPrimary, marginTop: 3 },
  suspension: { fontFamily: "Kanit_400Regular", color: Colors.danger, marginVertical: 8 },
  inputLabel: { fontFamily: "Kanit_500Medium", color: Colors.textDark, marginTop: 10 },
  input: { backgroundColor: Colors.inputBackground, padding: 10, marginVertical: 10, fontFamily: "Kanit_400Regular", borderRadius: 10 },
  empty: { backgroundColor: "white", padding: 18, borderRadius: 16, marginTop: 16 },
  emptyText: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, textAlign: "center" },
});
