import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius } from "../../../src/constants/theme";
import { HeaderGradient } from "../../../src/components/HeaderGradient";
import { Button } from "../../../src/components/Button";
import { mockAllocations } from "../../../src/mock/data";

export default function SellerAllocationsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"Active" | "History">("Active");
  const [trackingNumber, setTrackingNumber] = useState("TH123456789");

  const handleConfirmShipment = (allocationId: string) => {
    alert(`Confirmed shipment for Allocation #${allocationId} with tracking: ${trackingNumber}`);
  };

  return (
    <View style={styles.container}>
      <HeaderGradient
        title="ORDER ALLOCATIONS"
        subtitle="Fulfill system-allocated order portions assigned to you"
        variant="white"
        showBack
        onBackPress={() => router.back()}
        style={styles.header}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "Active" && styles.activeTabBtn]}
            onPress={() => setActiveTab("Active")}
          >
            <Text style={[styles.tabText, activeTab === "Active" && styles.activeTabText]}>Active Allocations</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "History" && styles.activeTabBtn]}
            onPress={() => setActiveTab("History")}
          >
            <Text style={[styles.tabText, activeTab === "History" && styles.activeTabText]}>Fulfillment History</Text>
          </TouchableOpacity>
        </View>

        {/* Daily Revenue Banner */}
        <View style={styles.dailyRevenueBanner}>
          <Text style={styles.dailyLbl}>DAILY ALLOCATED REVENUE</Text>
          <Text style={styles.dailyVal}>฿1,240.85</Text>
          <Text style={styles.dailySub}>+18% vs yesterday</Text>
        </View>

        {/* Allocation Cards */}
        {mockAllocations.map((alloc) => (
          <View key={alloc.id} style={styles.allocCard}>
            <View style={styles.allocHeader}>
              <View>
                <Text style={styles.orderIdText}>Order #ORD-88219</Text>
                <Text style={styles.buyerText}>Buyer: Eleanor Vance</Text>
                <Text style={styles.addressText}>134 Oak Wood Lane, Asheville, NC 28801</Text>
              </View>
              <Text style={styles.allocValue}>฿{alloc.seller_amount.toFixed(2)}</Text>
            </View>

            <View style={styles.itemsBlock}>
              <Text style={styles.itemsTitle}>YOUR ALLOCATED PORTION:</Text>
              <View style={styles.itemRow}>
                <Text style={styles.itemName}>• {alloc.market_product_name}</Text>
                <Text style={styles.itemQty}>x{alloc.allocated_quantity} units</Text>
              </View>
              <Text style={styles.unitPriceText}>Unit Price: ฿{alloc.unit_price.toFixed(2)} / unit</Text>
            </View>

            {/* Status & Actions */}
            {alloc.status === "preparing" ? (
              <View style={styles.actionBlock}>
                <Text style={styles.inputLabel}>Enter Allocation Tracking Number</Text>
                <TextInput
                  style={styles.input}
                  value={trackingNumber}
                  onChangeText={setTrackingNumber}
                  placeholder="e.g. TH123456789"
                />
                <Button
                  title="Confirm Shipment"
                  variant="green"
                  size="md"
                  style={styles.confirmBtn}
                  onPress={() => handleConfirmShipment(alloc.id)}
                />
              </View>
            ) : (
              <View style={styles.statusCompletedBlock}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.greenDark} />
                <Text style={styles.statusCompletedText}>
                  Status: {alloc.status.toUpperCase()} | Tracking: {alloc.tracking_number || "N/A"}
                </Text>
              </View>
            )}
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
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.inputBorder,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
  },
  tabRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: "center",
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.inputBackground,
  },
  activeTabBtn: {
    backgroundColor: Colors.greenDark,
  },
  tabText: {
    fontSize: Typography.fontSizeSm,
    fontWeight: "500",
    color: Colors.textMuted,
  },
  activeTabText: {
    color: Colors.textWhite,
    fontWeight: "700",
  },
  dailyRevenueBanner: {
    backgroundColor: Colors.greenDark,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    alignItems: "center",
  },
  dailyLbl: {
    fontSize: 9,
    fontWeight: "700",
    color: Colors.textWhite,
    opacity: 0.8,
  },
  dailyVal: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.textWhite,
    marginVertical: 2,
  },
  dailySub: {
    fontSize: Typography.fontSizeXs,
    color: Colors.greenLight,
    fontWeight: "700",
  },
  allocCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  allocHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  orderIdText: {
    fontSize: Typography.fontSizeSm,
    fontWeight: "700",
    color: Colors.textDark,
  },
  buyerText: {
    fontSize: Typography.fontSizeXs,
    color: Colors.textDark,
    fontWeight: "500",
    marginTop: 2,
  },
  addressText: {
    fontSize: Typography.fontSizeXs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  allocValue: {
    fontSize: Typography.fontSizeLg,
    fontWeight: "700",
    color: Colors.greenDark,
  },
  itemsBlock: {
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginVertical: Spacing.sm,
  },
  itemsTitle: {
    fontSize: 9,
    fontWeight: "700",
    color: Colors.textMuted,
    marginBottom: 4,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  itemName: {
    fontSize: Typography.fontSizeSm,
    fontWeight: "700",
    color: Colors.textDark,
  },
  itemQty: {
    fontSize: Typography.fontSizeSm,
    fontWeight: "700",
    color: Colors.greenDark,
  },
  unitPriceText: {
    fontSize: Typography.fontSizeXs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  actionBlock: {
    marginTop: Spacing.xs,
  },
  inputLabel: {
    fontSize: Typography.fontSizeXs,
    fontWeight: "500",
    color: Colors.textMuted,
    marginBottom: 4,
  },
  input: {
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm + 2,
    fontSize: Typography.fontSizeSm,
    marginBottom: Spacing.sm,
  },
  confirmBtn: {
    backgroundColor: Colors.greenDark,
  },
  statusCompletedBlock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: Colors.greenPrimary + "15",
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginTop: Spacing.xs,
  },
  statusCompletedText: {
    fontSize: Typography.fontSizeXs,
    fontWeight: "700",
    color: Colors.greenDark,
  },
});
