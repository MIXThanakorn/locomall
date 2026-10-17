import { useResponsiveStyles } from "../../src/hooks/useResponsiveStyles";
import { ScreenHeader } from "../../src/components/ScreenHeader";
import { LoadNotice } from "../../src/components/LoadNotice";
import { useRealtimeRefresh, type RealtimeWatch } from "../../src/hooks/useRealtimeRefresh";
import { BackButton } from "../../src/components/BackButton";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, RefreshControl, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { BorderRadius, Colors, Spacing } from "../../src/constants/theme";
import { CatalogActions } from "../../src/components/CatalogActions";
import { KeyboardAwareScrollView } from "../../src/components/KeyboardAware";
import { Button } from "../../src/components/Button";
import { AppTextInput } from "../../src/components/AppTextInput";
import { CommerceCard } from "../../src/components/CommerceCard";
import { catalogColumns, filterMarketStores } from "../../src/lib/catalogPresentation";
import { ContextImage } from "../../src/components/ContextImage";
import { useAuth } from "../../src/context/AuthContext";
import { supabase } from "../../src/lib/supabase";

export default function MarketDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  return <MarketDetailContent key={`${session?.user.id}:${id}`} />;
}
function MarketDetailContent() {
  const styles = useResponsiveStyles(baseStyles, {});
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { fontScale } = useWindowDimensions();
  const [gridWidth, setGridWidth] = useState(0);
  const columns = catalogColumns(gridWidth, fontScale);
  const [query, setQuery] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const { session } = useAuth();
  const [market, setMarket] = useState<any>();
  const [stores, setStores] = useState<any[]>([]);
  const [sameArea, setSameArea] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const generation = useRef(0);

  const load = useCallback(async () => {
      const request = ++generation.current;
      try {
      const [marketResult, locationResult] = await Promise.all([
        supabase.rpc("get_market_catalog", { p_market_id: Number(id) }),
        session ? supabase.from("user_locations").select("subdistrict_code").eq("user_id", session.user.id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      if (request !== generation.current) return;
      if (marketResult.error) throw marketResult.error;
      const catalog = marketResult.data as any;
      setMarket(catalog); setStores(catalog?.stores ?? []);
      setSameArea(Boolean(catalog && locationResult.data?.subdistrict_code === catalog.subdistrict_code));
      setLoadError(false);
      setRefreshVersion((value) => value + 1);
      } catch { if (request === generation.current) setLoadError(true); }
      finally { if (request === generation.current) setLoading(false); }
  }, [id, session]);
  useFocusEffect(useCallback(() => { void load(); return () => { generation.current++; }; }, [load]));
  const watches = useMemo<RealtimeWatch[]>(() => [
    { table: "markets", event: "UPDATE", filter: `market_id=eq.${id}` },
    { table: "stores", event: "INSERT", filter: `market_id=eq.${id}` },
    { table: "stores", event: "UPDATE", filter: `market_id=eq.${id}` },
    { table: "seller_listings", event: "UPDATE" },
  ], [id]);
  useRealtimeRefresh(`market-detail-${id}`, load, watches);

  if (loading) return <View style={styles.center}><BackButton floating /><ActivityIndicator color={Colors.greenPrimary} /></View>;
  if (!market) return <View style={styles.center}><BackButton floating />{loadError ? <LoadNotice onRetry={() => void load()} /> : <Text>ไม่พบตลาดชุมชนนี้</Text>}</View>;
  const isOwner = Boolean(market.is_owner);
  const visibleStores = filterMarketStores(stores, query, inStockOnly);

  return <View style={styles.root}>
    <KeyboardAwareScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load().then(() => setRefreshVersion((value) => value + 1)).finally(() => setRefreshing(false)); }} tintColor={Colors.greenPrimary} />}>
    <View style={[styles.hero, { paddingTop: 0 }]}>
      <ScreenHeader title={market.name} titleStyle={styles.heroTitle} color="white" />
      <View style={styles.location}><Ionicons name="location-outline" size={16} color={Colors.goldPrimary} /><Text style={styles.locationText}>{market.hub_address}</Text></View>
    </View>
      <View style={styles.content}>
      {loadError ? <LoadNotice onRetry={() => void load()} /> : null}
      <View style={styles.marketSummary}>{market.image_url ? <ContextImage uri={market.image_url} name={market.name} size={64} /> : null}<View style={{ flex: 1 }}><Text style={styles.summaryText}>{stores.length} ร้านค้าในตลาด</Text><Text style={styles.heroDescription}>{market.description}</Text></View></View>
      <CatalogActions targetType="market" targetId={Number(id)} refreshVersion={refreshVersion}>
      {isOwner ? <TouchableOpacity style={styles.manage} onPress={() => router.push("/market/manage/home" as never)}>
        <Ionicons name="settings-outline" size={20} color={Colors.greenPrimary} /><Text style={styles.manageText}>จัดการตลาดชุมชนนี้</Text><Ionicons name="chevron-forward" size={18} />
      </TouchableOpacity> : null}
      <View style={styles.row}>
        <Text style={styles.title}>ร้านค้าในชุมชน</Text>
        {session && sameArea ? <Button title="ขอเปิดร้าน" size="sm" variant="outline" onPress={() => router.push({ pathname: "/seller/listings/join", params: { marketId: id } } as never)} /> : null}
      </View>
      <AppTextInput accessibilityLabel="ค้นหาร้านหรือสินค้าในตลาดนี้" placeholder="ค้นหาร้านหรือสินค้าในตลาดนี้" value={query} onChangeText={setQuery} style={styles.search} />
      <View style={styles.filterRow}><Text style={styles.resultCount}>พบ {visibleStores.length} ร้าน</Text><TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: inStockOnly }} onPress={() => setInStockOnly((value) => !value)} style={[styles.stockFilter, inStockOnly && styles.stockFilterActive]}><Ionicons name={inStockOnly ? "checkbox" : "square-outline"} size={18} color={inStockOnly ? "white" : Colors.greenPrimary} /><Text style={[styles.filterText, inStockOnly && { color: "white" }]}>พร้อมขาย</Text></TouchableOpacity></View>
      {!visibleStores.length ? <View style={styles.emptyBox}><Text style={styles.empty}>ไม่พบร้านค้าที่ตรงกับเงื่อนไข</Text>{query || inStockOnly ? <TouchableOpacity onPress={() => { setQuery(""); setInStockOnly(false); }}><Text style={styles.apply}>ล้างการค้นหาและตัวกรอง</Text></TouchableOpacity> : null}</View> : null}
      <View style={styles.grid} onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}>
        {visibleStores.map((store) => <CommerceCard key={store.store_id} compact columns={columns} showDistance={false} item={{
          entity_type: "store", entity_id: store.store_id, market_id: Number(id), name: store.name,
          product_name: store.product_name, unit: store.unit, unit_price: store.unit_price,
          description: store.description ?? "", image_url: store.image_url, distance_km: null, radius_km: 0,
          available_stock: Number(store.available_stock ?? 0),
        }} onPress={() => router.push(`/store/${store.store_id}` as never)} />)}
      </View>
      </CatalogActions>
      </View>
    </KeyboardAwareScrollView>
  </View>;
}

const baseStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background }, center: { flex: 1, alignItems: "center", justifyContent: "center" },
  marketSummary: { flexDirection: "row", alignItems: "center", gap: 12 }, summaryText: { fontFamily: "Kanit_700Bold", color: Colors.greenPrimary }, heroDescription: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, fontSize: 13 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  search: { borderWidth: 1, borderColor: Colors.inputBorder, backgroundColor: "white", borderRadius: 12, padding: 12, fontFamily: "Kanit_400Regular" },
  filterRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8, marginVertical: 12 },
  resultCount: { fontFamily: "Kanit_400Regular", color: Colors.textMuted },
  stockFilter: { flexDirection: "row", gap: 6, alignItems: "center", padding: 10, borderWidth: 1, borderColor: Colors.greenPrimary, borderRadius: 20 }, stockFilterActive: { backgroundColor: Colors.greenPrimary }, filterText: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary },
  emptyBox: { alignItems: "center", paddingBottom: 24, gap: 12 },
  cover: { width: "100%", height: 180, marginBottom: 16 },
  hero: { backgroundColor: Colors.greenPrimary, padding: Spacing.lg, paddingTop: 0, paddingBottom: 16, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  heroTitle: { fontFamily: "Kanit_700Bold", fontSize: 24, color: "white" }, heroDesc: { fontFamily: "Kanit_400Regular", color: "#DDEBE2", marginTop: 4 },
  location: { flexDirection: "row", gap: 6, marginTop: 12 }, locationText: { fontFamily: "Kanit_400Regular", color: "white", flex: 1 }, content: { padding: Spacing.lg },
  manage: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "white", padding: 14, borderRadius: BorderRadius.lg, marginBottom: 14 },
  manageText: { flex: 1, fontFamily: "Kanit_500Medium", color: Colors.greenPrimary }, row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16, justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  title: { fontFamily: "Kanit_700Bold", fontSize: 20, color: Colors.textDark }, apply: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary },
  areaNotice: { flexDirection: "row", gap: 8, backgroundColor: "#FFF5D9", borderRadius: 12, padding: 12, marginBottom: 12 }, areaText: { flex: 1, fontFamily: "Kanit_400Regular", color: Colors.textMedium },
  card: { backgroundColor: "white", borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: Colors.inputBorder },
  icon: { width: 54, height: 54, borderRadius: 16, backgroundColor: "#EAF1E9", alignItems: "center", justifyContent: "center" }, store: { fontFamily: "Kanit_700Bold", color: Colors.textDark, fontSize: 16 },
  product: { fontFamily: "Kanit_400Regular", color: Colors.textMedium }, stock: { fontFamily: "Kanit_500Medium", fontSize: 12, color: Colors.greenPrimary }, empty: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, textAlign: "center", marginTop: 30 },
});
