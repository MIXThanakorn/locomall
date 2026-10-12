import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors } from "../constants/theme";
import { CatalogReviewPage } from "../lib/catalogReviews";

export function CatalogReviewSummary({ page }: { page: CatalogReviewPage }) {
  return <View style={styles.summary}>
    <View style={styles.total}><Text style={styles.average}>{page.total ? page.average.toFixed(1) : "—"}</Text>
      <Text style={styles.muted}>คะแนนเฉลี่ย</Text><Text style={styles.muted}>{page.total.toLocaleString("th-TH")} รีวิว · เต็ม 5</Text></View>
    <View style={styles.distribution}>{[5, 4, 3, 2, 1].map((star) => <View style={styles.ratingRow} key={star}>
      <Text style={styles.starLabel}>{star} ★</Text><View style={styles.track}><View style={[styles.fill, { width: `${page.total ? page.counts[star] / page.total * 100 : 0}%` }]} /></View>
      <Text style={styles.count}>{page.counts[star]}</Text></View>)}</View>
  </View>;
}

export function CatalogReviewFilters({ page, stars, onChange }: { page: CatalogReviewPage | null; stars: number | null; onChange: (stars: number | null) => void }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
    {[null, 5, 4, 3, 2, 1].map((star) => <TouchableOpacity key={star ?? "all"} accessibilityRole="button"
      accessibilityState={{ selected: stars === star }} onPress={() => onChange(star)} style={[styles.chip, stars === star && styles.selected]}>
      <Text style={[styles.chipText, stars === star && styles.selectedText]}>{star === null ? "ทั้งหมด" : `${star} ★`}{page ? ` (${star === null ? page.total : page.counts[star]})` : ""}</Text>
    </TouchableOpacity>)}
  </ScrollView>;
}

const styles = StyleSheet.create({
  summary: { flexDirection: "row", alignItems: "center", gap: 18, padding: 16, borderRadius: 16, backgroundColor: Colors.cardBackground, marginTop: 12 },
  total: { alignItems: "center" }, average: { fontFamily: "Kanit_700Bold", color: Colors.greenPrimary, fontSize: 32 },
  muted: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, fontSize: 11 },
  distribution: { flex: 1, gap: 5 }, ratingRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  starLabel: { fontFamily: "Kanit_400Regular", color: Colors.textMedium, fontSize: 11, width: 24 },
  track: { flex: 1, height: 6, borderRadius: 3, backgroundColor: Colors.inputBackground, overflow: "hidden" },
  fill: { height: 6, borderRadius: 3, backgroundColor: Colors.goldPrimary },
  count: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, fontSize: 11, minWidth: 18, textAlign: "right" },
  filters: { gap: 8, paddingVertical: 14 }, chip: { borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: 24, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: Colors.cardBackground },
  selected: { borderColor: Colors.greenPrimary, backgroundColor: Colors.greenPrimary },
  chipText: { color: Colors.textMedium, fontFamily: "Kanit_500Medium", fontSize: 13 }, selectedText: { color: Colors.textWhite },
});
