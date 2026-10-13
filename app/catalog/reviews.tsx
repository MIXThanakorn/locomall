import { ScreenHeader } from "../../src/components/ScreenHeader";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CatalogReviewCard } from "../../src/components/CatalogReviewCard";
import { CatalogReviewFilters, CatalogReviewSummary } from "../../src/components/CatalogReviewSummary";
import { Colors } from "../../src/constants/theme";
import { useCatalogReviews } from "../../src/hooks/useCatalogReviews";
import { parseReviewRoute, ReviewTarget } from "../../src/lib/catalogReviews";

export default function CatalogReviewsScreen() {
  const params = useLocalSearchParams<{ targetType: string; targetId: string }>();
  const target = parseReviewRoute(params.targetType, params.targetId);
  if (!target) return <View style={styles.root}><ScreenHeader contentInset={0} title="ไม่พบรายการรีวิว" titleStyle={styles.heading} /></View>;
  return <ReviewList key={`${target.targetType}:${target.targetId}`} {...target} />;
}

function ReviewList({ targetType, targetId }: { targetType: ReviewTarget; targetId: number }) {
  const insets = useSafeAreaInsets();
  const [stars, setStars] = useState<number | null>(null);
  const { page, summary, error, loading, loadingMore, refresh, loadMore } = useCatalogReviews(targetType, targetId, stars);
  return <View style={styles.root}>
    <ScreenHeader contentInset={0} title={`รีวิว${targetType === "store" ? "ร้านค้า" : "ตลาด"}`} titleStyle={styles.heading}
      fallback={`/${targetType}/${targetId}` as never} style={{ backgroundColor: Colors.cardBackground, borderBottomWidth: 1, borderBottomColor: Colors.divider }}>
      <Text style={styles.name} numberOfLines={2}>{summary?.target_name ?? "ความคิดเห็นจากผู้ซื้อ"}</Text>
    </ScreenHeader>
    <FlatList data={page?.items ?? []} keyExtractor={(item) => String(item.review_id)}
      renderItem={({ item }) => <CatalogReviewCard review={item} targetType={targetType} />}
      contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 20 }]}
      refreshControl={<RefreshControl refreshing={loading && Boolean(page)} onRefresh={() => void refresh()} tintColor={Colors.greenPrimary} colors={[Colors.greenPrimary]} />}
      ListHeaderComponent={<>
        {summary?.available ? <CatalogReviewSummary page={summary} /> : null}
        <CatalogReviewFilters page={summary} stars={stars} onChange={setStars} />
        <Text style={styles.muted}>{page ? `${stars === null ? "ทั้งหมด" : `คะแนน ${stars} ดาว`} · ${page.filtered_count} รีวิว · ใหม่ล่าสุดก่อน` : "กำลังโหลดรีวิว"}</Text>
        <Text style={styles.privacy}>แสดงชื่อแบบปกปิดบางส่วนเพื่อรักษาความเป็นส่วนตัวของผู้ซื้อ</Text>
        {error ? <TouchableOpacity accessibilityRole="button" style={styles.errorBox} onPress={() => void refresh()}><Text style={styles.error}>{error} · แตะเพื่อลองใหม่</Text></TouchableOpacity> : null}
      </>}
      ListEmptyComponent={loading ? <ActivityIndicator style={styles.empty} color={Colors.greenPrimary} />
        : !error ? <Text style={[styles.muted, styles.empty]}>{page && !page.available ? "รายการนี้ไม่พร้อมแสดงรีวิวในขณะนี้" : stars === null ? "ยังไม่มีรีวิวจากผู้ซื้อ" : `ยังไม่มีรีวิวคะแนน ${stars} ดาว`}</Text> : null}
      ListFooterComponent={page?.next_cursor ? <TouchableOpacity accessibilityRole="button" disabled={loading || loadingMore} style={styles.button} onPress={() => void loadMore()}>
        {loadingMore ? <ActivityIndicator color={Colors.greenPrimary} /> : <Text style={styles.buttonText}>โหลดรีวิวเพิ่มเติม ({page.items.length}/{page.filtered_count})</Text>}
      </TouchableOpacity> : page?.items.length ? <Text style={[styles.muted, styles.end]}>แสดงครบ {page.items.length} รีวิวแล้ว</Text> : null} />
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background }, invalid: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  header: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.divider, backgroundColor: Colors.cardBackground },
  back: { padding: 8, marginRight: 8 }, title: { flex: 1 }, heading: { fontFamily: "Kanit_700Bold", color: Colors.greenPrimary, fontSize: 22 },
  name: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, fontSize: 13 }, content: { paddingHorizontal: 18 },
  muted: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, fontSize: 13 }, privacy: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, fontSize: 11, marginTop: 4 },
  empty: { paddingVertical: 40, textAlign: "center" }, button: { borderWidth: 1, borderColor: Colors.greenPrimary, backgroundColor: Colors.cardBackground, padding: 14, borderRadius: 14, alignItems: "center", marginTop: 16 },
  buttonText: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary, fontSize: 14 }, end: { textAlign: "center", paddingTop: 20 },
  errorBox: { paddingVertical: 12 }, error: { fontFamily: "Kanit_400Regular", color: Colors.danger, fontSize: 13 },
});
