/* eslint-disable react-hooks/set-state-in-effect, react-hooks/preserve-manual-memoization */
import React, { useCallback, useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "../../../src/components/KeyboardAware";
import { Button } from "../../../src/components/Button";
import { PermissionGate } from "../../../src/components/PermissionGate";
import { Colors, Spacing } from "../../../src/constants/theme";
import { useAuth } from "../../../src/context/AuthContext";
import { useCapabilities } from "../../../src/hooks/useCapabilities";
import { translateDatabaseError } from "../../../src/lib/databaseError";
import { supabase } from "../../../src/lib/supabase";

export default function Stock() {
  const permissions = useCapabilities();
  const { session } = useAuth();
  const [list, setList] = useState<any[]>([]);

  const load = useCallback(async () => {
    if (!session?.user.id) return setList([]);
    const { data, error } = await supabase
      .from("seller_listings")
      .select("*,stores(name,product_name,unit)")
      .eq("seller_id", session.user.id)
      .order("created_at");
    if (error) Alert.alert("โหลดจำนวนสินค้าไม่สำเร็จ", translateDatabaseError(error));
    setList(data ?? []);
  }, [session?.user.id]);

  useEffect(() => { void load(); }, [load]);

  const save = async (listing: any) => {
    const quantity = Number(listing.draft ?? listing.stock_quantity);
    if (!Number.isInteger(quantity) || quantity < listing.reserved_quantity) {
      return Alert.alert("จำนวนสินค้าไม่ถูกต้อง", `จำนวนต้องไม่น้อยกว่าสินค้าที่มีลูกค้าสั่งไว้ ${listing.reserved_quantity} ${listing.stores?.unit ?? ""}`);
    }
    const { error } = await supabase.rpc("update_my_listing_stock", {
      p_listing_id: listing.listing_id,
      p_stock_quantity: quantity,
      p_status: listing.status,
    });
    if (error) Alert.alert("บันทึกจำนวนสินค้าไม่สำเร็จ", translateDatabaseError(error));
    else { Alert.alert("บันทึกจำนวนสินค้าที่พร้อมขายแล้ว"); await load(); }
  };

  return <PermissionGate allow={permissions.isSeller || permissions.isStoreManager} loading={permissions.loading}>
    <KeyboardAwareScrollView contentContainerStyle={styles.root}>
      <Text style={styles.title}>จำนวนสินค้าที่พร้อมขาย</Text>
      <Text style={styles.sub}>กรอกจำนวนสินค้าของคุณที่พร้อมให้ลูกค้าสั่งซื้อ</Text>
      {!list.length ? <View style={styles.empty}><Text style={styles.emptyText}>ยังไม่มีรายการขายที่ผ่านการอนุมัติ</Text></View> : null}
      {list.map((listing, index) => <View style={styles.card} key={listing.listing_id}>
        <Text style={styles.name}>{listing.stores?.product_name} · {listing.stores?.name}</Text>
        <Text style={styles.reserved}>มีลูกค้าสั่งแล้ว {listing.reserved_quantity} {listing.stores?.unit}</Text>
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          value={String(listing.draft ?? listing.stock_quantity)}
          onChangeText={(value) => setList((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, draft: value } : item))}
        />
        <Button title="บันทึกจำนวนสินค้า" size="sm" onPress={() => save(listing)} />
      </View>)}
    </KeyboardAwareScrollView>
  </PermissionGate>;
}

const styles = StyleSheet.create({
  root: { padding: Spacing.lg, paddingTop: 60, backgroundColor: Colors.background, flexGrow: 1 },
  title: { fontFamily: "Kanit_700Bold", fontSize: 25, color: Colors.greenPrimary },
  sub: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, marginTop: 2 },
  card: { padding: 16, backgroundColor: "white", borderRadius: 16, marginTop: 12 },
  name: { fontFamily: "Kanit_700Bold", color: Colors.textDark },
  reserved: { fontFamily: "Kanit_400Regular", color: Colors.textMuted },
  input: { backgroundColor: Colors.inputBackground, padding: 10, marginVertical: 10, fontFamily: "Kanit_400Regular", borderRadius: 10 },
  empty: { backgroundColor: "white", padding: 18, borderRadius: 16, marginTop: 16 },
  emptyText: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, textAlign: "center" },
});
