import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BorderRadius, Colors, Spacing } from "../../src/constants/theme";
import { useAuth } from "../../src/context/AuthContext";
import { supabase } from "../../src/lib/supabase";

export default function MarketDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [market, setMarket] = useState<any>();
  const [stores, setStores] = useState<any[]>([]);
  const [sameArea, setSameArea] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [marketResult, locationResult] = await Promise.all([
        supabase.rpc("get_market_catalog", { p_market_id: Number(id) }),
        session ? supabase.from("user_locations").select("subdistrict_code").eq("user_id", session.user.id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      const catalog = marketResult.data as any;
      setMarket(catalog); setStores(catalog?.stores ?? []);
      setSameArea(Boolean(catalog && locationResult.data?.subdistrict_code === catalog.subdistrict_code));
      setLoading(false);
    })();
  }, [id, session]);

  if (loading) return <View style={styles.center}><ActivityIndicator color={Colors.greenPrimary} /></View>;
  if (!market) return <View style={styles.center}><Text>ไม่พบตลาดชุมชนนี้</Text></View>;
  const isOwner = Boolean(market.is_owner);

  return <View style={styles.root}>
    <View style={[styles.hero, { paddingTop: insets.top + 16 }]}>
      <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="white" /></TouchableOpacity>
      <Text style={styles.heroTitle}>{market.name}</Text><Text style={styles.heroDesc}>{market.description}</Text>
      <View style={styles.location}><Ionicons name="location-outline" size={16} color={Colors.goldPrimary} /><Text style={styles.locationText}>{market.hub_address}</Text></View>
    </View>
    <ScrollView contentContainerStyle={styles.content}>
      {isOwner ? <TouchableOpacity style={styles.manage} onPress={() => router.push("/market/manage/home" as never)}>
        <Ionicons name="settings-outline" size={20} color={Colors.greenPrimary} /><Text style={styles.manageText}>จัดการตลาดชุมชนนี้</Text><Ionicons name="chevron-forward" size={18} />
      </TouchableOpacity> : null}
      <View style={styles.row}>
        <Text style={styles.title}>ร้านค้าในชุมชน</Text>
        {session && sameArea ? <TouchableOpacity onPress={() => router.push({ pathname: "/seller/listings/join", params: { marketId: id } } as never)}><Text style={styles.apply}>ขอเปิดร้าน</Text></TouchableOpacity> : null}
      </View>
      {session && !sameArea ? <View style={styles.areaNotice}><Ionicons name="location-outline" size={18} color={Colors.goldDark} /><Text style={styles.areaText}>เปิดร้านได้เมื่อพื้นที่หลักของคุณอยู่ตำบลเดียวกับตลาดชุมชนนี้</Text></View> : null}
      {!stores.length ? <Text style={styles.empty}>ยังไม่มีร้านที่ผ่านการอนุมัติ</Text> : null}
      {stores.map((store) => {
        const stock = Number(store.available_stock ?? 0);
        return <TouchableOpacity key={store.store_id} style={styles.card} onPress={() => router.push(`/store/${store.store_id}` as never)}>
          <View style={styles.icon}><Ionicons name="basket" size={27} color={Colors.greenPrimary} /></View>
          <View style={{ flex: 1 }}><Text style={styles.store}>{store.name}</Text><Text style={styles.product}>{store.product_name} · ฿{Number(store.unit_price).toLocaleString()}/{store.unit}</Text><Text style={styles.stock}>พร้อมขาย {stock} {store.unit}</Text></View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
        </TouchableOpacity>;
      })}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background }, center: { flex: 1, alignItems: "center", justifyContent: "center" },
  hero: { backgroundColor: Colors.greenPrimary, padding: Spacing.lg, paddingBottom: 28, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  heroTitle: { fontFamily: "Kanit_700Bold", fontSize: 27, color: "white", marginTop: 20 }, heroDesc: { fontFamily: "Kanit_400Regular", color: "#DDEBE2", marginTop: 4 },
  location: { flexDirection: "row", gap: 6, marginTop: 12 }, locationText: { fontFamily: "Kanit_400Regular", color: "white", flex: 1 }, content: { padding: Spacing.lg },
  manage: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "white", padding: 14, borderRadius: BorderRadius.lg, marginBottom: 14 },
  manageText: { flex: 1, fontFamily: "Kanit_500Medium", color: Colors.greenPrimary }, row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  title: { fontFamily: "Kanit_700Bold", fontSize: 20, color: Colors.textDark }, apply: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary },
  areaNotice: { flexDirection: "row", gap: 8, backgroundColor: "#FFF5D9", borderRadius: 12, padding: 12, marginBottom: 12 }, areaText: { flex: 1, fontFamily: "Kanit_400Regular", color: Colors.textMedium },
  card: { backgroundColor: "white", borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: Colors.inputBorder },
  icon: { width: 54, height: 54, borderRadius: 16, backgroundColor: "#EAF1E9", alignItems: "center", justifyContent: "center" }, store: { fontFamily: "Kanit_700Bold", color: Colors.textDark, fontSize: 16 },
  product: { fontFamily: "Kanit_400Regular", color: Colors.textMedium }, stock: { fontFamily: "Kanit_500Medium", fontSize: 12, color: Colors.greenPrimary }, empty: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, textAlign: "center", marginTop: 30 },
});
