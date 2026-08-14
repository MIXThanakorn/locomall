import React from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";
import { HeaderGradient } from "../../src/components/HeaderGradient";
import { ImagePlaceholder } from "../../src/components/ImagePlaceholder";
import { mockMarkets } from "../../src/mock/data";

export default function MarketListScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <HeaderGradient
        title="Community Markets"
        subtitle="Explore temporary markets and local shared products"
        variant="gold"
        showBack
        onBackPress={() => router.back()}
        style={styles.header}
      />

      <FlatList
        data={mockMarkets}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/market/${item.id}` as any)}
          >
            <ImagePlaceholder
              height={140}
              label={`MARKET: ${item.name}`}
              iconName="storefront-outline"
              backgroundColor="#FEF3C7"
            />
            <View style={styles.cardBody}>
              <Text style={styles.marketName}>{item.name}</Text>
              <Text style={styles.marketCategory}>Category: {item.category}</Text>
              <Text style={styles.marketDesc} numberOfLines={2}>{item.description}</Text>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Ionicons name="star" size={13} color={Colors.goldDark} />
                  <Text style={styles.statText}>{item.rating}</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="people-outline" size={13} color={Colors.greenDark} />
                  <Text style={styles.statText}>{item.seller_count} Sellers</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="cube-outline" size={13} color={Colors.textMuted} />
                  <Text style={styles.statText}>{item.products_count} Products</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: 54,
    paddingBottom: 30,
  },
  listContent: {
    padding: Spacing.md,
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    marginBottom: Spacing.lg,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardBody: {
    padding: Spacing.md,
  },
  marketName: {
    fontSize: Typography.fontSizeLg,
    fontWeight: "700",
    color: Colors.textDark,
  },
  marketCategory: {
    fontSize: Typography.fontSizeXs,
    fontWeight: "700",
    color: Colors.greenDark,
    marginTop: 2,
  },
  marketDesc: {
    fontSize: Typography.fontSizeSm,
    color: Colors.textMuted,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.inputBorder,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: Typography.fontSizeXs,
    color: Colors.textDark,
    fontWeight: "600",
  },
});
