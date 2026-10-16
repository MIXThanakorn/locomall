import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors } from "../constants/theme";
import type { NearbyResult } from "../hooks/useCommerce";
import { catalogPrice } from "../lib/catalogPresentation";
import { ContextImage } from "./ContextImage";

export function CommerceCard({ item, onPress, compact = false, columns = 2, showDistance = true }: {
  item: NearbyResult; onPress: () => void; compact?: boolean; columns?: 1 | 2; showDistance?: boolean;
}) {
  const market = item.entity_type === "market";
  const title = !market && item.product_name ? item.product_name : item.name;
  const ready = Number(item.available_stock) > 0;
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${market ? "ตลาด" : "สินค้า"} ${title}, ${catalogPrice(item.unit_price, item.unit, market)}`} style={[styles.card, compact && { width: columns === 1 ? "100%" : "48.5%" }]} onPress={onPress} activeOpacity={0.8}>
    <ContextImage uri={item.image_url} name={title} style={styles.image} />
    <View style={styles.body}>
      <View style={styles.meta}><Ionicons name={market ? "storefront-outline" : "basket-outline"} size={13} color={Colors.greenPrimary} /><Text style={styles.type}>{market ? "ตลาดชุมชน" : "สินค้าในชุมชน"}</Text></View>
      <Text style={styles.name} numberOfLines={2}>{title}</Text>
      <Text style={styles.shop} numberOfLines={1}>{market ? "สำรวจร้านค้าในตลาด" : `${item.name}${item.market_name ? ` · ${item.market_name}` : ""}`}</Text>
      <Text style={styles.price}>{catalogPrice(item.unit_price, item.unit, market)}</Text>
      <Text style={[styles.status, !ready && styles.unavailable]}>{ready ? (market ? "มีสินค้าพร้อมขาย" : "พร้อมขาย") : (market ? "ยังไม่มีสินค้าพร้อมขาย" : "สินค้าหมดชั่วคราว")}</Text>
      <View style={styles.meta}>
        {item.rating_count != null ? <Text style={styles.detail}>{item.rating_count > 0 ? `★ ${Number(item.rating_average ?? 0).toFixed(1)} (${item.rating_count})` : "ยังไม่มีรีวิว"}</Text> : null}
        {showDistance ? <Text style={styles.detail}>{item.distance_km == null ? "ไม่ทราบระยะทาง" : `${Number(item.distance_km).toLocaleString("th-TH", { maximumFractionDigits: 1 })} กม.`}</Text> : null}
      </View>
      {item.sold_quantity != null ? <Text style={styles.detail}>ขายแล้ว {Number(item.sold_quantity).toLocaleString("th-TH")} หน่วยสั่งซื้อ</Text> : null}
    </View>
  </TouchableOpacity>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.cardBackground, borderRadius: 16, overflow: "hidden", marginBottom: 12, borderWidth: 1, borderColor: Colors.inputBorder },
  image: { width: "100%", height: "auto", aspectRatio: 4 / 3, borderRadius: 0 },
  body: { padding: 12, flex: 1 }, meta: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  type: { fontFamily: "Kanit_500Medium", fontSize: 11, color: Colors.greenPrimary },
  name: { fontFamily: "Kanit_700Bold", fontSize: 16, lineHeight: 23, color: Colors.textDark, marginTop: 6, minHeight: 46 },
  shop: { fontFamily: "Kanit_400Regular", fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  price: { fontFamily: "Kanit_700Bold", fontSize: 17, color: Colors.greenPrimary, marginTop: 8 },
  status: { fontFamily: "Kanit_500Medium", fontSize: 11, color: Colors.greenPrimary, backgroundColor: "#EAF1E9", borderRadius: 6, alignSelf: "flex-start", paddingHorizontal: 7, paddingVertical: 3, marginVertical: 8 },
  unavailable: { color: Colors.textMuted, backgroundColor: Colors.inputBackground },
  detail: { fontFamily: "Kanit_400Regular", fontSize: 11, color: Colors.textMuted, marginTop: 3 },
});
