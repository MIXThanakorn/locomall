import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";
import { HeaderGradient } from "../../src/components/HeaderGradient";
import { ImagePlaceholder } from "../../src/components/ImagePlaceholder";

export default function SellerDashboardScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <HeaderGradient
        title="SELLER DASHBOARD"
        subtitle="Manage your stock listings, allocations & earnings"
        variant="green"
        showBack
        onBackPress={() => router.back()}
        style={styles.header}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick Nav Bar */}
        <View style={styles.quickNavRow}>
          <TouchableOpacity
            style={styles.navChip}
            onPress={() => router.push("/seller/listings" as any)}
          >
            <Ionicons name="cube-outline" size={14} color={Colors.textDark} />
            <Text style={styles.chipText}>Listings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navChip}
            onPress={() => router.push("/seller/allocations" as any)}
          >
            <Ionicons name="clipboard-outline" size={14} color={Colors.textDark} />
            <Text style={styles.chipText}>Allocations</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navChip}
            onPress={() => router.push("/seller/wallet" as any)}
          >
            <Ionicons name="wallet-outline" size={14} color={Colors.textDark} />
            <Text style={styles.chipText}>Wallet</Text>
          </TouchableOpacity>
        </View>

        {/* Monthly Performance Card */}
        <View style={styles.monthlyCard}>
          <Text style={styles.cardHeaderLbl}>MONTHLY PERFORMANCE</Text>
          <Text style={styles.monthlyAmount}>฿142,850.00</Text>
          <Text style={styles.growthText}>+12.4% from last month</Text>

          <View style={styles.monthlySubRow}>
            <View style={styles.subItem}>
              <Text style={styles.subLbl}>AVERAGE ORDER</Text>
              <Text style={styles.subVal}>฿1,420</Text>
            </View>
            <View style={styles.subItem}>
              <Text style={styles.subLbl}>CONVERSION</Text>
              <Text style={styles.subVal}>4.82%</Text>
            </View>
          </View>
        </View>

        {/* Today's Revenue Card */}
        <View style={styles.todayCard}>
          <Text style={styles.todayTitle}>TODAY'S REVENUE</Text>
          <Text style={styles.todayAmount}>฿12,400.00</Text>

          <View style={styles.todayGrid}>
            <View style={styles.todayGridItem}>
              <Text style={styles.gridLbl}>Orders</Text>
              <Text style={styles.gridVal}>16</Text>
            </View>
            <View style={styles.todayGridItem}>
              <Text style={styles.gridLbl}>Visitors</Text>
              <Text style={styles.gridVal}>428</Text>
            </View>
            <View style={styles.todayGridItem}>
              <Text style={styles.gridLbl}>Pending</Text>
              <Text style={styles.gridVal}>฿8,920</Text>
            </View>
          </View>
        </View>

        {/* Order Fulfillment Status Counts */}
        <Text style={styles.sectionTitle}>ORDER FULFILLMENT STATUS</Text>
        <View style={styles.fulfillmentRow}>
          <TouchableOpacity
            style={styles.fulfillBox}
            onPress={() => router.push("/seller/allocations" as any)}
          >
            <Text style={styles.fulfillCount}>12</Text>
            <Text style={styles.fulfillLbl}>To Ship</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.fulfillBox}
            onPress={() => router.push("/seller/allocations" as any)}
          >
            <Text style={styles.fulfillCount}>28</Text>
            <Text style={styles.fulfillLbl}>Shipping</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.fulfillBox}
            onPress={() => router.push("/seller/allocations" as any)}
          >
            <Text style={styles.fulfillCount}>156</Text>
            <Text style={styles.fulfillLbl}>Completed</Text>
          </TouchableOpacity>
        </View>

        {/* Top Product Highlight */}
        <Text style={styles.sectionTitle}>TOP PERFORMING PRODUCT</Text>
        <View style={styles.topProductCard}>
          <ImagePlaceholder
            height={140}
            label="Wildflower Forest Honey"
            iconName="cube-outline"
            backgroundColor="#FEF3C7"
          />
          <View style={styles.topInfo}>
            <Text style={styles.topTitle}>Wildflower Forest Honey (500g)</Text>
            <Text style={styles.topUnits}>160 units sold this week</Text>
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
  header: {
    paddingTop: 54,
    paddingBottom: 30,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
  },
  quickNavRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  navChip: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.round,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  chipText: {
    fontSize: Typography.fontSizeXs,
    fontWeight: "700",
    color: Colors.textDark,
  },
  monthlyCard: {
    backgroundColor: Colors.greenDark,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardHeaderLbl: {
    fontSize: Typography.fontSizeXs,
    fontWeight: "700",
    color: Colors.textWhite,
    opacity: 0.8,
  },
  monthlyAmount: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.textWhite,
    marginTop: 4,
  },
  growthText: {
    fontSize: Typography.fontSizeXs,
    color: Colors.greenLight,
    fontWeight: "700",
    marginTop: 2,
  },
  monthlySubRow: {
    flexDirection: "row",
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
  },
  subItem: {
    flex: 1,
  },
  subLbl: {
    fontSize: 9,
    color: Colors.textWhite,
    opacity: 0.7,
  },
  subVal: {
    fontSize: Typography.fontSizeMd,
    fontWeight: "700",
    color: Colors.textWhite,
    marginTop: 2,
  },
  todayCard: {
    backgroundColor: Colors.goldPrimary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  todayTitle: {
    fontSize: Typography.fontSizeXs,
    fontWeight: "700",
    color: Colors.textDark,
    opacity: 0.8,
  },
  todayAmount: {
    fontSize: 26,
    fontWeight: "700",
    color: Colors.textDark,
    marginTop: 2,
  },
  todayGrid: {
    flexDirection: "row",
    marginTop: Spacing.md,
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  todayGridItem: {
    flex: 1,
    alignItems: "center",
  },
  gridLbl: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: "700",
  },
  gridVal: {
    fontSize: Typography.fontSizeSm,
    fontWeight: "700",
    color: Colors.textDark,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: Typography.fontSizeXs,
    fontWeight: "700",
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  fulfillmentRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  fulfillBox: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  fulfillCount: {
    fontSize: Typography.fontSizeXl,
    fontWeight: "700",
    color: Colors.greenDark,
  },
  fulfillLbl: {
    fontSize: Typography.fontSizeXs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  topProductCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    marginBottom: Spacing.xl,
  },
  topInfo: {
    padding: Spacing.md,
  },
  topTitle: {
    fontSize: Typography.fontSizeSm,
    fontWeight: "700",
    color: Colors.textDark,
  },
  topUnits: {
    fontSize: Typography.fontSizeXs,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
