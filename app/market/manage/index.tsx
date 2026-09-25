import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "../../../src/components/Button";
import { PermissionGate } from "../../../src/components/PermissionGate";
import { Colors, Spacing } from "../../../src/constants/theme";
import { useCapabilities } from "../../../src/hooks/useCapabilities";
import { supabase } from "../../../src/lib/supabase";
import { translateDatabaseError } from "../../../src/lib/databaseError";

export default function ApprovalQueue() {
  const permissions = useCapabilities();
  const [stores, setStores] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const load = async () => {
    if (!permissions.isMarketOwner && !permissions.isAdmin) return;
    const [storeResult, sellerResult] = await Promise.all([
      supabase.from("stores").select("*").eq("approval_status", "pending"),
      supabase.from("store_seller_applications").select("*,stores(name)").eq("status", "pending"),
    ]);
    setStores(storeResult.data ?? []); setSellers(sellerResult.data ?? []);
  };
  useEffect(() => {
    if (!permissions.isMarketOwner && !permissions.isAdmin) return;
    Promise.all([
      supabase.from("stores").select("*").eq("approval_status", "pending"),
      supabase.from("store_seller_applications").select("*,stores(name)").eq("status", "pending"),
    ]).then(([storeResult, sellerResult]) => {
      setStores(storeResult.data ?? []); setSellers(sellerResult.data ?? []);
    });
  }, [permissions.isMarketOwner, permissions.isAdmin]);
  const review = async (kind: "store" | "seller", id: number, approve: boolean) => {
    const result = kind === "store" ? await supabase.rpc("review_store", { p_store_id: id, p_approve: approve }) : await supabase.rpc("review_store_seller", { p_application_id: id, p_approve: approve });
    if (result.error) Alert.alert("ดำเนินการไม่สำเร็จ", translateDatabaseError(result.error)); else await load();
  };
  return <PermissionGate allow={permissions.isMarketOwner || permissions.isAdmin} loading={permissions.loading}>
    <ScrollView contentContainerStyle={styles.root}><Text style={styles.title}>คิวอนุมัติ</Text><Text style={styles.section}>ร้านใหม่</Text>
      {stores.map((item) => <View style={styles.card} key={item.store_id}><Text style={styles.name}>{item.name} · {item.product_name}</Text><View style={styles.actions}><Button title="อนุมัติ" size="sm" onPress={() => review("store", item.store_id, true)} /><Button title="ปฏิเสธ" size="sm" variant="outline" onPress={() => review("store", item.store_id, false)} /></View></View>)}
      <Text style={styles.section}>ผู้ขายร่วมร้าน</Text>{sellers.map((item) => <View style={styles.card} key={item.application_id}><Text style={styles.name}>{item.stores?.name}</Text><View style={styles.actions}><Button title="อนุมัติ" size="sm" onPress={() => review("seller", item.application_id, true)} /><Button title="ปฏิเสธ" size="sm" variant="outline" onPress={() => review("seller", item.application_id, false)} /></View></View>)}
    </ScrollView>
  </PermissionGate>;
}
const styles = StyleSheet.create({ root: { padding: Spacing.lg, paddingTop: 58, backgroundColor: Colors.background, flexGrow: 1 }, title: { fontFamily: "Kanit_700Bold", fontSize: 26, color: Colors.greenPrimary }, section: { fontFamily: "Kanit_700Bold", marginTop: 20, fontSize: 17 }, card: { backgroundColor: "white", padding: 16, borderRadius: 16, marginTop: 10 }, name: { fontFamily: "Kanit_500Medium" }, actions: { flexDirection: "row", gap: 8, marginTop: 10 } });
