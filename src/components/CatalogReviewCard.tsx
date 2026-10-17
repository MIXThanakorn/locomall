import { useResponsiveStyles } from "../hooks/useResponsiveStyles";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Colors } from "../constants/theme";
import { CatalogReview, reviewDateLabel } from "../lib/catalogReviews";

export function CatalogReviewCard({ review, targetType }: { review: CatalogReview; targetType: "market" | "store" }) {
  const styles = useResponsiveStyles(baseStyles, {"wrap":["row","scoreRow","badge"]});
  return <View style={styles.card}>
    <View style={styles.row}>
      <View style={styles.avatar}><Ionicons name="person-outline" size={20} color={Colors.greenPrimary} /></View>
      <View style={styles.identity}><Text style={styles.name}>{review.reviewer_name}</Text>
        <Text style={styles.muted}>{reviewDateLabel(review.created_at)}</Text></View>
    </View>
    <View style={styles.scoreRow}>
      <Text accessibilityLabel={`${review.stars} จาก 5 ดาว`} style={styles.stars}>{"★".repeat(review.stars)}{"☆".repeat(5 - review.stars)}</Text>
      <Text style={styles.muted}>{review.stars}/5</Text>
    </View>
    {review.verified_purchase ? <View style={styles.badge}><Ionicons name="checkmark-circle" size={14} color={Colors.greenPrimary} /><Text style={styles.verified}>ซื้อจริง · รับสินค้าแล้ว</Text></View> : null}
    <Text style={styles.context}>{targetType === "store" ? `สินค้า: ${review.product_name || "สินค้าจากร้านนี้"}` : "ประสบการณ์ซื้อสินค้าจากตลาดนี้"}</Text>
    <Text style={[styles.body, !review.body.trim() && styles.muted]}>{review.body.trim() || "ให้คะแนนโดยไม่ได้เขียนความคิดเห็น"}</Text>
  </View>;
}

const baseStyles = StyleSheet.create({
  card: { backgroundColor: Colors.cardBackground, borderRadius: 16, borderWidth: 1, borderColor: Colors.divider, padding: 16, marginTop: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#EAF4EC", alignItems: "center", justifyContent: "center" },
  identity: { flex: 1 }, name: { color: Colors.textDark, fontFamily: "Kanit_500Medium", fontSize: 14 },
  muted: { color: Colors.textMuted, fontFamily: "Kanit_400Regular", fontSize: 12 },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  stars: { color: Colors.goldDark, fontSize: 20 },
  badge: { flexDirection: "row", alignSelf: "flex-start", alignItems: "center", gap: 4, marginTop: 6, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: "#EAF4EC", borderRadius: 8 },
  verified: { color: Colors.greenPrimary, fontFamily: "Kanit_400Regular", fontSize: 11 },
  context: { color: Colors.textMuted, fontFamily: "Kanit_400Regular", fontSize: 12, marginTop: 8 },
  body: { color: Colors.textDark, fontFamily: "Kanit_400Regular", fontSize: 15, lineHeight: 24, marginTop: 6 },
});
