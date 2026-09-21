import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "../../src/components/Button";
import { AdminMfaGate } from "../../src/components/AdminMfaGate";
import { Colors, Spacing } from "../../src/constants/theme";
import { useCapabilities } from "../../src/hooks/useCapabilities";
import { supabase } from "../../src/lib/supabase";

export default function AdminApprovals() {
  const permissions = useCapabilities();
  const [markets, setMarkets] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const load = async () => {
    if (!permissions.isAdmin) return;
    const [marketResult, storeResult] = await Promise.all([
      supabase.from("markets").select("*").eq("approval_status", "pending").order("created_at"),
      supabase.from("stores").select("*,markets(name,owner_id)").eq("approval_status", "pending").order("created_at"),
    ]);
    setMarkets(marketResult.data ?? []);
    setStores((storeResult.data ?? []).filter((store: any) => store.manager_id === store.markets?.owner_id));
  };
  useEffect(() => {
    if (!permissions.isAdmin) return;
    Promise.all([
      supabase.from("markets").select("*").eq("approval_status", "pending").order("created_at"),
      supabase.from("stores").select("*,markets(name,owner_id)").eq("approval_status", "pending").order("created_at"),
    ]).then(([marketResult, storeResult]) => {
      setMarkets(marketResult.data ?? []);
      setStores((storeResult.data ?? []).filter((store: any) => store.manager_id === store.markets?.owner_id));
    });
  }, [permissions.isAdmin]);
  const review = async (kind: "market" | "store", id: number, approve: boolean) => {
    const result = kind === "market"
      ? await supabase.rpc("review_market", { p_market_id: id, p_approve: approve })
      : await supabase.rpc("review_store", { p_store_id: id, p_approve: approve });
    if (result.error) Alert.alert(result.error.message); else await load();
  };
  const card = (kind: "market" | "store", item: any) => <View key={`${kind}-${kind === "market" ? item.market_id : item.store_id}`} style={styles.card}>
    <Text style={styles.name}>{item.name}</Text>
    <Text style={styles.desc}>{kind === "market" ? item.description : `${item.product_name} · ${item.markets?.name}`}</Text>
    <View style={styles.actions}><Button title="อนุมัติ" size="sm" onPress={() => review(kind, kind === "market" ? item.market_id : item.store_id, true)} /><Button title="ปฏิเสธ" variant="outline" size="sm" onPress={() => review(kind, kind === "market" ? item.market_id : item.store_id, false)} /></View>
  </View>;

  return <AdminMfaGate>
    <ScrollView contentContainerStyle={styles.root}>
      <Text style={styles.title}>Platform Admin</Text><Text style={styles.sub}>อนุมัติ Market และคำขอร้านที่เจ้าของ Market เป็นผู้สมัครเอง</Text>
      <Text style={styles.section}>Market ใหม่</Text>{markets.map((item) => card("market", item))}
      <Text style={styles.section}>Self-approval escalation</Text>{stores.map((item) => card("store", item))}
    </ScrollView>
  </AdminMfaGate>;
}

const styles = StyleSheet.create({
  root: { padding: Spacing.lg, paddingTop: 58, backgroundColor: Colors.background, flexGrow: 1 }, title: { fontFamily: "Kanit_700Bold", fontSize: 26, color: Colors.greenPrimary },
  sub: { fontFamily: "Kanit_400Regular", color: Colors.textMuted }, section: { fontFamily: "Kanit_700Bold", fontSize: 18, marginTop: 22 },
  card: { backgroundColor: "white", padding: 16, borderRadius: 16, marginTop: 10 }, name: { fontFamily: "Kanit_700Bold" }, desc: { fontFamily: "Kanit_400Regular", color: Colors.textMuted }, actions: { flexDirection: "row", gap: 8, marginTop: 12 },
});
