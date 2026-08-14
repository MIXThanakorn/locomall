import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";
import { ImagePlaceholder } from "../../src/components/ImagePlaceholder";
import { Button } from "../../src/components/Button";
import { mockMarketProducts, mockMarkets } from "../../src/mock/data";

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState("All Goods");
  const [searchQuery, setSearchQuery] = useState("");

  const categories = ["All Goods", "Organic Grains", "Local Farm", "Handcrafted"];

  return (
    <View style={styles.container}>
      {/* Header Search Bar with Dynamic Safe Area */}
      <View style={[styles.headerBar, { paddingTop: Math.max(insets.top + 8, 20) }]}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color={Colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search market products..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={Colors.textMuted}
          />
          <TouchableOpacity style={styles.filterBtn}>
            <Feather name="sliders" size={18} color={Colors.textDark} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.cartBtn}
          onPress={() => router.push("/order/cart" as any)}
          activeOpacity={0.8}
        >
          <Ionicons name="cart-outline" size={22} color={Colors.textDark} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Category Pills */}
        <View style={styles.categorySection}>
          <Text style={styles.sectionHeader}>SELECTED COLLECTIONS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryPill,
                  activeCategory === cat && styles.activeCategoryPill,
                ]}
                onPress={() => setActiveCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    activeCategory === cat && styles.activeCategoryText,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Featured Markets Banner */}
        <View style={styles.marketBannerSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>FEATURED COMMUNITY MARKETS</Text>
            <TouchableOpacity onPress={() => router.push("/market" as any)}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          {mockMarkets.map((market) => (
            <TouchableOpacity
              key={market.id}
              style={styles.marketCard}
              onPress={() => router.push(`/market/${market.id}` as any)}
              activeOpacity={0.8}
            >
              <ImagePlaceholder
                height={120}
                label={`MARKET: ${market.name}`}
                iconName="storefront-outline"
                backgroundColor="#FEF3C7"
              />
              <View style={styles.marketCardBody}>
                <Text style={styles.marketName}>{market.name}</Text>
                <Text style={styles.marketDesc} numberOfLines={2}>{market.description}</Text>
                <View style={styles.marketStats}>
                  <View style={styles.statTag}>
                    <Ionicons name="star" size={12} color={Colors.goldDark} />
                    <Text style={styles.statText}>{market.rating}</Text>
                  </View>
                  <View style={styles.statTag}>
                    <Ionicons name="people-outline" size={12} color={Colors.greenDark} />
                    <Text style={styles.statText}>{market.seller_count} Sellers</Text>
                  </View>
                  <View style={styles.statTag}>
                    <Ionicons name="cube-outline" size={12} color={Colors.textMuted} />
                    <Text style={styles.statText}>{market.products_count} Items</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Market Products Feed */}
        <View style={styles.productFeedSection}>
          <Text style={styles.sectionHeader}>POPULAR MARKET PRODUCTS</Text>
          {mockMarketProducts.map((product) => (
            <View key={product.id} style={styles.productCard}>
              <TouchableOpacity
                onPress={() => router.push(`/market/product/${product.id}` as any)}
                activeOpacity={0.8}
              >
                <ImagePlaceholder
                  height={200}
                  label={`PRODUCT: ${product.name}`}
                  iconName="cube-outline"
                  backgroundColor="#E2E8F0"
                />
                <View style={styles.priceTag}>
                  <Text style={styles.priceText}>฿{product.unit_price.toFixed(2)} / {product.unit_label}</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.productCardBody}>
                <View style={styles.productHeaderRow}>
                  <Text style={styles.productTitle} numberOfLines={1}>{product.name}</Text>
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={13} color={Colors.goldDark} />
                    <Text style={styles.ratingText}>{product.rating} ({product.reviews_count})</Text>
                  </View>
                </View>

                <Text style={styles.marketNameTag}>Market: {product.market_name}</Text>

                {/* Community Seller Pool Info Badge */}
                <View style={styles.allocationBadge}>
                  <Ionicons name="people" size={14} color={Colors.greenDark} />
                  <Text style={styles.allocationBadgeText}>
                    {product.seller_count} Local Sellers | Stock: {product.total_available_stock} {product.unit_label}
                  </Text>
                </View>

                <View style={styles.actionRow}>
                  <Button
                    title="Add to Cart"
                    variant="gold"
                    size="md"
                    style={styles.addCartBtn}
                    textStyle={{ color: Colors.textDark }}
                    onPress={() => router.push(`/market/product/${product.id}` as any)}
                  />
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => router.push("/(tabs)/chat" as any)}
                  >
                    <Ionicons name="chatbubble-outline" size={18} color={Colors.textDark} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
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
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.goldPrimary,
    gap: Spacing.sm,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.round,
    paddingHorizontal: Spacing.md,
    height: 42,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.fontSizeSm,
    color: Colors.textDark,
  },
  filterBtn: {
    padding: Spacing.xs,
  },
  cartBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.cardBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  sectionHeader: {
    fontSize: Typography.fontSizeXs,
    fontWeight: "700",
    color: Colors.textMuted,
    letterSpacing: 1,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  viewAllText: {
    fontSize: Typography.fontSizeXs,
    fontWeight: "700",
    color: Colors.goldDark,
  },
  categorySection: {},
  categoryScroll: {
    gap: Spacing.sm,
  },
  categoryPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  activeCategoryPill: {
    backgroundColor: Colors.greenPrimary,
    borderColor: Colors.greenPrimary,
  },
  categoryText: {
    fontSize: Typography.fontSizeSm,
    color: Colors.textDark,
    fontWeight: "500",
  },
  activeCategoryText: {
    color: Colors.textWhite,
    fontWeight: "700",
  },
  marketBannerSection: {},
  marketCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  marketCardBody: {
    padding: Spacing.md,
  },
  marketName: {
    fontSize: Typography.fontSizeMd,
    fontWeight: "700",
    color: Colors.textDark,
  },
  marketDesc: {
    fontSize: Typography.fontSizeXs,
    color: Colors.textMuted,
    marginTop: 4,
  },
  marketStats: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  statTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.inputBackground,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  statText: {
    fontSize: Typography.fontSizeXs,
    color: Colors.textMedium,
    fontWeight: "600",
  },
  productFeedSection: {
    marginBottom: Spacing.xxl,
  },
  productCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    marginBottom: Spacing.md,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  priceTag: {
    position: "absolute",
    bottom: Spacing.md,
    right: Spacing.md,
    backgroundColor: Colors.goldPrimary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  priceText: {
    fontSize: Typography.fontSizeSm,
    fontWeight: "700",
    color: Colors.textDark,
  },
  productCardBody: {
    padding: Spacing.md,
  },
  productHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  productTitle: {
    fontSize: Typography.fontSizeMd,
    fontWeight: "700",
    color: Colors.textDark,
    flex: 1,
    marginRight: Spacing.sm,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  ratingText: {
    fontSize: Typography.fontSizeXs,
    color: Colors.goldDark,
    fontWeight: "700",
  },
  marketNameTag: {
    fontSize: Typography.fontSizeXs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  allocationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.greenPrimary + "15",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  allocationBadgeText: {
    fontSize: Typography.fontSizeXs,
    color: Colors.greenDark,
    fontWeight: "600",
    flex: 1,
  },
  actionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  addCartBtn: {
    flex: 1,
    backgroundColor: Colors.goldPrimary,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    alignItems: "center",
    justifyContent: "center",
  },
});
