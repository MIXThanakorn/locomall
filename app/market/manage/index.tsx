import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius } from "../../../src/constants/theme";
import { HeaderGradient } from "../../../src/components/HeaderGradient";
import { Button } from "../../../src/components/Button";
import { mockMarketProducts } from "../../../src/mock/data";

export default function MarketManageScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <HeaderGradient
        title="Market Owner Dashboard"
        subtitle="Manage your community market, price settings & participating sellers"
        variant="gold"
        showBack
        onBackPress={() => router.back()}
        style={styles.header}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick Action Grid */}
        <View style={styles.quickGrid}>
          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => router.push("/market/manage/products" as any)}
          >
            <Ionicons name="add-circle-outline" size={24} color={Colors.greenDark} style={styles.gridIcon} />
            <Text style={styles.gridTitle}>Create Market Product</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridCard} onPress={() => {}}>
            <Ionicons name="people-outline" size={24} color={Colors.goldDark} style={styles.gridIcon} />
            <Text style={styles.gridTitle}>Joined Sellers (8)</Text>
          </TouchableOpacity>
        </View>

        {/* Market Overview Metrics */}
        <View style={styles.metricsCard}>
          <Text style={styles.cardHeaderTitle}>MARKET PERFORMANCE</Text>
          <View style={styles.metricRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Total Products</Text>
              <Text style={styles.metricValue}>142</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Active Sellers</Text>
              <Text style={styles.metricValue}>8</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Market Rating</Text>
              <Text style={styles.metricValue}>4.9</Text>
            </View>
          </View>
        </View>

        {/* Market Products List */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>MARKET PRODUCTS & PRICE LIST</Text>
          <Button
            title="+ Add Product"
            variant="gold"
            size="sm"
            style={styles.addBtn}
            textStyle={{ color: Colors.textDark }}
            onPress={() => router.push("/market/manage/products" as any)}
          />
        </View>

        {mockMarketProducts.map((product) => (
          <View key={product.id} style={styles.productCard}>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productPrice}>Official Price: ฿{product.unit_price.toFixed(2)} / {product.unit_label}</Text>
              <Text style={styles.productSellers}>{product.seller_count} Sellers participating</Text>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.iconBtn}>
                <Ionicons name="pencil-outline" size={16} color={Colors.textDark} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn}>
                <Ionicons name="trash-outline" size={16} color={Colors.danger} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
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
  content: {
    flex: 1,
    padding: Spacing.lg,
  },
  quickGrid: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  gridCard: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  gridIcon: {
    marginBottom: Spacing.xs,
  },
  gridTitle: {
    fontSize: Typography.fontSizeXs,
    fontWeight: "700",
    color: Colors.textDark,
    textAlign: "center",
  },
  metricsCard: {
    backgroundColor: Colors.goldPrimary + "15",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.goldPrimary + "40",
  },
  cardHeaderTitle: {
    fontSize: Typography.fontSizeXs,
    fontWeight: "700",
    color: Colors.goldDark,
    marginBottom: Spacing.sm,
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  metricItem: {
    alignItems: "center",
  },
  metricLabel: {
    fontSize: Typography.fontSizeXs,
    color: Colors.textMuted,
  },
  metricValue: {
    fontSize: Typography.fontSizeLg,
    fontWeight: "700",
    color: Colors.textDark,
    marginTop: 2,
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
  addBtn: {
    backgroundColor: Colors.goldPrimary,
  },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: Typography.fontSizeSm,
    fontWeight: "700",
    color: Colors.textDark,
  },
  productPrice: {
    fontSize: Typography.fontSizeXs,
    color: Colors.greenDark,
    fontWeight: "700",
    marginTop: 2,
  },
  productSellers: {
    fontSize: Typography.fontSizeXs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  iconBtn: {
    padding: Spacing.xs,
  },
});
