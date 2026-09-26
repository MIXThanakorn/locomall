import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { BorderRadius, Colors, Spacing } from "../../../src/constants/theme";
import { useAuth } from "../../../src/context/AuthContext";
import { supabase } from "../../../src/lib/supabase";
import { approvalStatusLabel } from "../../../src/lib/displayText";

export default function MarketManagementHome() {
  const router = useRouter();
  const { session, isAdmin } = useAuth();
  const [markets, setMarkets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user.id) return;
    let query = supabase.from("markets").select("*,stores(store_id,name,product_name,approval_status,manager_id)").order("created_at");
    if (!isAdmin) query = query.eq("owner_id", session.user.id);
    query.then(({ data }) => { setMarkets(data ?? []); setLoading(false); });
  }, [isAdmin, session?.user.id]);

  if (loading) return <View style={styles.center}><ActivityIndicator color={Colors.greenPrimary} /></View>;
  return <ScrollView contentContainerStyle={styles.root}>
    <Text style={styles.title}>จัดการตลาดชุมชน</Text>
    <Text style={styles.sub}>แก้ไขข้อมูล ตรวจคำขอ ดูร้านค้า และดูแลจุดรวมสินค้า</Text>
    <View style={styles.quickRow}>
      <TouchableOpacity style={styles.quick} onPress={() => router.push("/market/manage" as never)}><Ionicons name="checkmark-done-outline" size={24} color={Colors.greenPrimary} /><Text style={styles.quickText}>คำขอที่รอตรวจสอบ</Text></TouchableOpacity>
      <TouchableOpacity style={styles.quick} onPress={() => router.push("/market/manage/logistics" as never)}><Ionicons name="cube-outline" size={24} color={Colors.greenPrimary} /><Text style={styles.quickText}>จุดรวมสินค้า</Text></TouchableOpacity>
    </View>
    {!markets.length ? <View style={styles.empty}><Text style={styles.muted}>ยังไม่มีตลาดชุมชนที่คุณดูแล</Text></View> : null}
    {markets.map((market) => <View style={styles.card} key={market.market_id}>
      <View style={styles.cardHead}><View style={{ flex: 1 }}><Text style={styles.name}>{market.name}</Text><Text style={styles.status}>สถานะ: {approvalStatusLabel(market.approval_status)}</Text></View><TouchableOpacity onPress={() => router.push({ pathname: "/market/manage/edit", params: { marketId: market.market_id } } as never)}><Ionicons name="create-outline" size={25} color={Colors.greenPrimary} /></TouchableOpacity></View>
      <Text style={styles.address}>{market.hub_address}</Text>
      <Text style={styles.section}>ร้านค้า</Text>
      {(market.stores ?? []).map((store: any) => {
        const canEditStore = isAdmin || store.manager_id === session?.user.id;
        return <TouchableOpacity
          key={store.store_id}
          style={styles.store}
          onPress={() => canEditStore
            ? router.push({ pathname: "/store/manage/edit", params: { storeId: store.store_id } } as never)
            : router.push(`/store/${store.store_id}` as never)}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.storeName}>{store.name}</Text>
            <Text style={styles.muted}>{store.product_name} · {approvalStatusLabel(store.approval_status)} · {canEditStore ? "แก้ไขร้าน" : "ดูรายละเอียด"}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </TouchableOpacity>;
      })}
      <TouchableOpacity style={styles.open} onPress={() => router.push(`/market/${market.market_id}` as never)}><Text style={styles.openText}>ดูหน้าตลาดชุมชน</Text></TouchableOpacity>
    </View>)}
  </ScrollView>;
}

const styles = StyleSheet.create({
  root: { padding: Spacing.lg, paddingTop: 58, paddingBottom: 70, backgroundColor: Colors.background, flexGrow: 1 }, center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.background },
  title: { fontFamily: "Kanit_700Bold", fontSize: 28, color: Colors.greenPrimary }, sub: { fontFamily: "Kanit_400Regular", color: Colors.textMuted },
  quickRow: { flexDirection: "row", gap: 10, marginTop: 16 }, quick: { flex: 1, backgroundColor: "white", padding: 14, borderRadius: BorderRadius.lg, alignItems: "center", gap: 5 }, quickText: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary },
  card: { backgroundColor: "white", padding: 16, borderRadius: BorderRadius.lg, marginTop: 14, borderWidth: 1, borderColor: Colors.inputBorder }, cardHead: { flexDirection: "row", alignItems: "center" },
  name: { fontFamily: "Kanit_700Bold", color: Colors.textDark, fontSize: 19 }, status: { fontFamily: "Kanit_500Medium", color: Colors.goldDark }, address: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, marginTop: 6 },
  section: { fontFamily: "Kanit_700Bold", color: Colors.textDark, marginTop: 14 }, store: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.inputBackground, padding: 12, borderRadius: 12, marginTop: 8 }, storeName: { fontFamily: "Kanit_500Medium", color: Colors.textDark }, muted: { fontFamily: "Kanit_400Regular", color: Colors.textMuted },
  open: { paddingTop: 14 }, openText: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary, textAlign: "center" }, empty: { backgroundColor: "white", padding: 18, borderRadius: 16, marginTop: 16 },
});
