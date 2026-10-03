import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AppTextInput } from "../../src/components/AppTextInput";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CommerceCard } from "../../src/components/CommerceCard";
import { KeyboardAwareView } from "../../src/components/KeyboardAware";
import { BorderRadius, Colors, Spacing } from "../../src/constants/theme";
import { useNearby } from "../../src/hooks/useCommerce";
import { useBadgeCounts } from "../../src/context/BadgeContext";

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [showWelcomeGuide, setShowWelcomeGuide] = useState(false);
  const normalizedQuery = query.trim();
  const isSearching = normalizedQuery.length > 0;
  const { items, loading, loadingMore, hasMore, error, refresh, loadMore } = useNearby(normalizedQuery, "all");
  const { cartCount } = useBadgeCounts();

  useEffect(() => {
    AsyncStorage.getItem("locomall-home-guide-dismissed-v1")
      .then((value) => setShowWelcomeGuide(value !== "true"))
      .catch(() => setShowWelcomeGuide(true));
  }, []);

  const dismissWelcomeGuide = async () => {
    setShowWelcomeGuide(false);
    await AsyncStorage.setItem("locomall-home-guide-dismissed-v1", "true");
  };

  const openResult = (entityType: string, entityId: number) => {
    router.push((entityType === "market" ? `/market/${entityId}` : `/store/${entityId}`) as never);
  };

  return (
    <KeyboardAwareView>
      <View style={styles.container}>
        <View style={[styles.hero, { paddingTop: insets.top + 10 }]}>
          <View style={styles.headerRow}>
            <View style={styles.brandIdentity}>
              <Image
                source={require("../../assets/images/APP_LOGO.png")}
                style={styles.brandLogo}
                resizeMode="contain"
                accessibilityLabel="โลโก้ Locomall"
              />
              <Text style={styles.tagline}>ของดีจากชุมชน{"\n"}ใกล้คุณก่อนเสมอ</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => router.push("/guide" as never)}
                accessibilityLabel="เปิดคู่มือการใช้งาน"
              >
                <Ionicons name="help-circle-outline" size={23} color={Colors.greenPrimary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => router.push("/order/cart" as never)}
                accessibilityLabel={`เปิดตะกร้าสินค้า มีสินค้า ${cartCount} รายการ`}
              >
                <Ionicons name="cart-outline" size={23} color={Colors.greenPrimary} />
                {cartCount > 0 ? <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{cartCount > 99 ? "99+" : cartCount}</Text></View> : null}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.searchBox}>
            <Ionicons name="search" size={21} color={Colors.textMuted} />
            <AppTextInput
              value={query}
              onChangeText={setQuery}
              placeholder="ค้นหาตลาด ร้านค้า หรือสินค้า"
              placeholderTextColor={Colors.textMuted}
              style={styles.searchInput}
              returnKeyType="search"
              autoCorrect={false}
              accessibilityLabel="ค้นหาตลาด ร้านค้า หรือสินค้า"
            />
            {query.length > 0 ? (
              <TouchableOpacity onPress={() => setQuery("")} accessibilityLabel="ล้างคำค้นหา">
                <Ionicons name="close-circle" size={21} color={Colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 320) loadMore();
          }}
          scrollEventThrottle={250}
        >
          {!isSearching && showWelcomeGuide ? (
            <View style={styles.guideCard}>
              <View style={styles.guideIcon}>
                <Ionicons name="book-outline" size={24} color={Colors.greenPrimary} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.guideTitle}>เพิ่งเริ่มใช้ Locomall?</Text>
                <Text style={styles.guideText}>ดูวิธีซื้อสินค้า เริ่มขาย และดูแลตลาดแบบทีละขั้นได้ที่คู่มือ</Text>
                <TouchableOpacity onPress={() => router.push("/guide" as never)}>
                  <Text style={styles.guideLink}>เปิดคู่มือการใช้งาน</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={dismissWelcomeGuide} accessibilityLabel="ปิดคำแนะนำ">
                <Ionicons name="close" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          ) : null}

          {loading && !items.length ? <ActivityIndicator color={Colors.greenPrimary} style={styles.loader} /> : null}
          {error ? <Text style={styles.error}>ค้นหาข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</Text> : null}

          {isSearching ? (
            <>
              <View style={styles.searchHeading}>
                <Text style={styles.eyebrow}>ผลการค้นหา</Text>
                <Text style={styles.title} numberOfLines={2}>“{normalizedQuery}”</Text>
                {!loading && !error ? <Text style={styles.resultCount}>พบอย่างน้อย {items.length} รายการ · เรียงใกล้ก่อน</Text> : null}
              </View>
              {!loading && !error && !items.length ? (
                <View style={styles.empty}>
                  <Ionicons name="search-outline" size={38} color={Colors.greenPrimary} />
                  <Text style={styles.emptyTitle}>ยังไม่พบสิ่งที่ค้นหา</Text>
                  <Text style={styles.message}>ลองค้นด้วยชื่อสินค้า ชื่อตลาด หรือชื่อร้านค้าอีกครั้ง</Text>
                </View>
              ) : null}
              <View style={styles.grid}>{items.map((item) => (
                <CommerceCard
                  key={`${item.entity_type}-${item.entity_id}`}
                  item={item}
                  onPress={() => openResult(item.entity_type, item.entity_id)}
                  compact
                />
              ))}</View>
            </>
          ) : (
            <>
              <View style={styles.heading}>
                <View>
                  <Text style={styles.eyebrow}>ใกล้คุณก่อน · ดูได้ทุกพื้นที่</Text>
                  <Text style={styles.title}>ตลาดและร้านค้า</Text>
                </View>
              </View>
              {!loading && !error && !items.length ? (
                <View style={styles.empty}>
                  <Ionicons name="leaf-outline" size={38} color={Colors.greenPrimary} />
                  <Text style={styles.emptyTitle}>ยังไม่มีตลาดหรือร้านค้า</Text>
                  <Text style={styles.message}>เมื่อมีร้านค้าเปิดใช้งาน จะแสดงที่นี่โดยเรียงจากใกล้ไปไกล</Text>
                </View>
              ) : null}
              <View style={styles.grid}>{items.map((item) => (
                <CommerceCard key={`${item.entity_type}-${item.entity_id}`} item={item} compact onPress={() => openResult(item.entity_type, item.entity_id)} />
              ))}</View>
            </>
          )}
          {loadingMore ? <ActivityIndicator color={Colors.greenPrimary} /> : null}
          {hasMore && !loadingMore ? <TouchableOpacity style={styles.loadMore} onPress={loadMore}><Text style={styles.more}>ดูเพิ่มเติม</Text></TouchableOpacity> : null}
        </ScrollView>
      </View>
    </KeyboardAwareView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  hero: {
    backgroundColor: Colors.goldPrimary,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brandIdentity: { flexDirection: "row", alignItems: "center", flexShrink: 1 },
  brandLogo: { width: 78, height: 80 },
  tagline: {
    fontFamily: "Kanit_500Medium",
    fontSize: 13,
    lineHeight: 19,
    color: Colors.greenDark,
    marginLeft: 8,
  },
  headerActions: { flexDirection: "row", gap: 8 },
  headerButton: {
    position: "relative",
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.cardBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  cartBadge: { position: "absolute", top: -6, right: -7, minWidth: 19, height: 19, borderRadius: 10, paddingHorizontal: 3, backgroundColor: Colors.danger, alignItems: "center", justifyContent: "center" },
  cartBadgeText: { fontFamily: "Kanit_700Bold", fontSize: 10, color: "#FFFFFF", lineHeight: 15 },
  searchBox: {
    height: 48,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.cardBackground,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: Spacing.md,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E4E7E1",
  },
  searchInput: {
    flex: 1,
    fontFamily: "Kanit_400Regular",
    fontSize: 15,
    color: Colors.textDark,
    paddingVertical: 0,
  },
  content: { padding: Spacing.lg, paddingBottom: 80 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  loadMore: { alignItems: "center", paddingVertical: Spacing.md },
  flex: { flex: 1 },
  guideCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#F0F7F2",
    borderWidth: 1,
    borderColor: "#CFE2D5",
    borderRadius: BorderRadius.lg,
    padding: 14,
  },
  guideIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.cardBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  guideTitle: { fontFamily: "Kanit_700Bold", color: Colors.textDark },
  guideText: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, lineHeight: 20 },
  guideLink: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary, marginTop: 5 },
  heading: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  searchHeading: { marginBottom: Spacing.md },
  eyebrow: { fontFamily: "Kanit_500Medium", fontSize: 11, color: Colors.goldDark },
  title: { fontFamily: "Kanit_700Bold", fontSize: 22, color: Colors.greenPrimary },
  resultCount: { fontFamily: "Kanit_400Regular", fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  more: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary },
  loader: { marginTop: 40 },
  error: { fontFamily: "Kanit_400Regular", color: Colors.danger, textAlign: "center", marginVertical: Spacing.md },
  message: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, textAlign: "center", marginTop: 8 },
  empty: {
    padding: Spacing.xl,
    alignItems: "center",
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  emptyTitle: { fontFamily: "Kanit_700Bold", fontSize: 17, color: Colors.textDark, marginTop: 8 },
});
