import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";
import { ImagePlaceholder } from "../../src/components/ImagePlaceholder";
import { Button } from "../../src/components/Button";
import { mockMarketProducts, mockMarkets } from "../../src/mock/data";

export default function MarketFrontScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const market = mockMarkets.find((m) => m.id === id) || mockMarkets[0];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Market Banner Placeholder */}
        <View style={styles.bannerContainer}>
          <ImagePlaceholder
            height={180}
            borderRadius={0}
            label={`COVER BANNER: ${market.name}`}
            iconName="image-outline"
            backgroundColor="#D97706"
          />
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={Colors.textWhite} />
          </TouchableOpacity>
        </View>

        {/* Market Header Block */}
        <View style={styles.marketHeaderBlock}>
          <View style={styles.avatarWrapper}>
            <ImagePlaceholder
              width={70}
              height={70}
              borderRadius={35}
              label=""
              iconName="storefront"
              iconSize={32}
              backgroundColor="#FFFFFF"
            />
          </View>

          <View style={styles.nameRow}>
            <Text style={styles.marketName}>{market.name}</Text>
            <Ionicons name="checkmark-circle" size={16} color={Colors.greenPrimary} />
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={13} color={Colors.goldDark} />
              <Text style={styles.metricItem}>{market.rating}</Text>
            </View>
            <Text style={styles.metricDot}>•</Text>
            <Text style={styles.metricItem}>{market.followers_count?.toLocaleString()} Followers</Text>
          </View>

          <View style={styles.actionRow}>
            <Button
              title="Follow"
              variant="green"
              size="sm"
              style={styles.followBtn}
              onPress={() => {}}
            />
            <Button
              title="Dashboard"
              variant="gold"
              size="sm"
              style={styles.dashboardBtn}
              textStyle={{ color: Colors.textDark }}
              onPress={() => router.push("/market/manage" as any)}
            />
          </View>

          {/* Quick Metrics Bar */}
          <View style={styles.quickMetricsBar}>
            <View style={styles.metricCol}>
              <Text style={styles.metricVal}>{market.products_count}</Text>
              <Text style={styles.metricLbl}>PRODUCTS</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricCol}>
              <Text style={styles.metricVal}>{market.seller_count}+</Text>
              <Text style={styles.metricLbl}>SELLERS</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricCol}>
              <Text style={styles.metricVal}>98%</Text>
              <Text style={styles.metricLbl}>RESPONSE</Text>
            </View>
          </View>
        </View>

        {/* Collections Horizontal Scroll */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>COLLECTIONS</Text>
            <TouchableOpacity><Text style={styles.viewAll}>View All</Text></TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.collectionsScroll}>
            {["Organic Grains", "Local Honey", "Natural Soaps", "Add Collection"].map((col, idx) => (
              <View key={idx} style={styles.collectionItem}>
                <ImagePlaceholder
                  width={56}
                  height={56}
                  borderRadius={28}
                  label=""
                  iconName={idx === 3 ? "add" : "leaf-outline"}
                  iconSize={20}
                  backgroundColor="#FEF3C7"
                />
                <Text style={styles.collectionText} numberOfLines={1}>{col}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Bestsellers Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>BESTSELLERS</Text>
          <Text style={styles.sectionSub}>Community favorites, harvested with love.</Text>

          {mockMarketProducts.slice(0, 1).map((product) => (
            <TouchableOpacity
              key={product.id}
              style={styles.bestsellerCard}
              onPress={() => router.push(`/market/product/${product.id}` as any)}
            >
              <ImagePlaceholder
                height={190}
                label={`PRODUCT: ${product.name}`}
                iconName="cube-outline"
                backgroundColor="#E2E8F0"
              />
              <View style={styles.bestsellerInfo}>
                <Text style={styles.bestsellerTitle}>{product.name}</Text>
                <Text style={styles.bestsellerPrice}>฿{product.unit_price.toFixed(2)} / {product.unit_label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* All Products Grid */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>ALL PRODUCTS</Text>
          <View style={styles.grid}>
            {mockMarketProducts.map((product) => (
              <TouchableOpacity
                key={product.id}
                style={styles.gridItem}
                onPress={() => router.push(`/market/product/${product.id}` as any)}
              >
                <ImagePlaceholder
                  height={130}
                  label={product.name}
                  iconName="cube-outline"
                  backgroundColor="#E2E8F0"
                />
                <View style={styles.gridInfo}>
                  <Text style={styles.gridTitle} numberOfLines={1}>{product.name}</Text>
                  <Text style={styles.gridPrice}>฿{product.unit_price.toFixed(2)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  bannerContainer: {
    position: "relative",
  },
  backBtn: {
    position: "absolute",
    top: 48,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  marketHeaderBlock: {
    backgroundColor: Colors.cardBackground,
    marginTop: -30,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    alignItems: "center",
  },
  avatarWrapper: {
    marginTop: -35,
    marginBottom: Spacing.xs,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  marketName: {
    fontSize: Typography.fontSizeLg,
    fontWeight: "700",
    color: Colors.textDark,
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: 4,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  metricItem: {
    fontSize: Typography.fontSizeXs,
    color: Colors.textMuted,
  },
  metricDot: {
    fontSize: Typography.fontSizeXs,
    color: Colors.textMuted,
  },
  actionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
    width: "100%",
  },
  followBtn: {
    flex: 1,
    backgroundColor: Colors.greenDark,
  },
  dashboardBtn: {
    flex: 1,
    backgroundColor: Colors.goldPrimary,
  },
  quickMetricsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    width: "100%",
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
  },
  metricCol: {
    alignItems: "center",
  },
  metricVal: {
    fontSize: Typography.fontSizeMd,
    fontWeight: "700",
    color: Colors.textDark,
  },
  metricLbl: {
    fontSize: 9,
    fontWeight: "700",
    color: Colors.textMuted,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.inputBorder,
  },
  sectionContainer: {
    padding: Spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.fontSizeXs,
    fontWeight: "700",
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  sectionSub: {
    fontSize: Typography.fontSizeXs,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  viewAll: {
    fontSize: Typography.fontSizeXs,
    color: Colors.goldDark,
    fontWeight: "700",
  },
  collectionsScroll: {
    gap: Spacing.md,
  },
  collectionItem: {
    alignItems: "center",
    width: 70,
  },
  collectionText: {
    fontSize: 10,
    color: Colors.textDark,
    textAlign: "center",
    marginTop: 4,
  },
  bestsellerCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  bestsellerInfo: {
    padding: Spacing.md,
  },
  bestsellerTitle: {
    fontSize: Typography.fontSizeMd,
    fontWeight: "700",
    color: Colors.textDark,
  },
  bestsellerPrice: {
    fontSize: Typography.fontSizeSm,
    color: Colors.goldDark,
    fontWeight: "700",
    marginTop: 2,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  gridItem: {
    width: "47%",
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  gridInfo: {
    padding: Spacing.sm,
  },
  gridTitle: {
    fontSize: Typography.fontSizeSm,
    fontWeight: "500",
    color: Colors.textDark,
  },
  gridPrice: {
    fontSize: Typography.fontSizeSm,
    fontWeight: "700",
    color: Colors.greenDark,
    marginTop: 2,
  },
});
