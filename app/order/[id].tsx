import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";
import { HeaderGradient } from "../../src/components/HeaderGradient";
import { Button } from "../../src/components/Button";
import { mockOrders, mockAllocations } from "../../src/mock/data";

export default function OrderDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const order = mockOrders[0];

  return (
    <View style={styles.container}>
      <HeaderGradient
        title={`Order #${order.id}`}
        subtitle={`Status: ${order.status.toUpperCase()}`}
        variant="white"
        showBack
        onBackPress={() => router.back()}
        style={styles.header}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Tracker */}
        <View style={styles.statusCard}>
          <Text style={styles.cardTitle}>ORDER FULFILLMENT PROGRESS</Text>
          <View style={styles.stepRow}>
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, styles.stepActive]}>
                <Ionicons name="checkmark" size={14} color={Colors.textWhite} />
              </View>
              <Text style={styles.stepLbl}>Paid</Text>
            </View>
            <View style={[styles.stepLine, styles.stepLineActive]} />
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, styles.stepActive]}>
                <Ionicons name="cube" size={14} color={Colors.textWhite} />
              </View>
              <Text style={styles.stepLbl}>Allocated</Text>
            </View>
            <View style={styles.stepLine} />
            <View style={styles.stepItem}>
              <View style={styles.stepCircle}>
                <Ionicons name="car" size={14} color={Colors.textMuted} />
              </View>
              <Text style={styles.stepLbl}>Shipping</Text>
            </View>
            <View style={styles.stepLine} />
            <View style={styles.stepItem}>
              <View style={styles.stepCircle}>
                <Ionicons name="checkmark-done" size={14} color={Colors.textMuted} />
              </View>
              <Text style={styles.stepLbl}>Received</Text>
            </View>
          </View>
        </View>

        {/* Order Items */}
        <Text style={styles.sectionTitle}>ORDER ITEMS</Text>
        <View style={styles.card}>
          {order.items?.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.market_product_name}</Text>
                <Text style={styles.itemQty}>Quantity: {item.quantity} units</Text>
                <Text style={styles.itemPrice}>Unit Price: ฿{item.unit_price.toFixed(2)}</Text>
              </View>
              <Text style={styles.itemTotal}>฿{item.total_amount.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* Seller Allocation Breakdown */}
        <Text style={styles.sectionTitle}>SELLER ALLOCATIONS (3 PORTIONS)</Text>
        <View style={styles.card}>
          {mockAllocations.map((alloc) => (
            <View key={alloc.id} style={styles.allocRow}>
              <View style={styles.allocInfo}>
                <Text style={styles.sellerName}>{alloc.seller_name}</Text>
                <Text style={styles.allocPortion}>Allocated: {alloc.allocated_quantity} units (฿{alloc.seller_amount.toFixed(2)})</Text>
                <Text style={styles.trackingText}>Tracking: {alloc.tracking_number || "Awaiting dispatch"}</Text>
              </View>
              <View style={styles.allocStatusBadge}>
                <Text style={styles.allocStatusText}>{alloc.status.toUpperCase()}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Action Button */}
        <Button
          title="Contact Community Market Chat"
          variant="gold"
          size="lg"
          style={styles.chatBtn}
          textStyle={{ color: Colors.textDark }}
          onPress={() => router.push("/(tabs)/chat" as any)}
        />
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
  statusCard: {
    backgroundColor: Colors.greenDark,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  cardTitle: {
    fontSize: Typography.fontSizeXs,
    fontWeight: "700",
    color: Colors.textWhite,
    opacity: 0.8,
    marginBottom: Spacing.md,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepItem: {
    alignItems: "center",
  },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepActive: {
    backgroundColor: Colors.greenLight,
  },
  stepLbl: {
    fontSize: 9,
    color: Colors.textWhite,
    fontWeight: "600",
    marginTop: 4,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginHorizontal: 4,
    marginBottom: 12,
  },
  stepLineActive: {
    backgroundColor: Colors.greenLight,
  },
  sectionTitle: {
    fontSize: Typography.fontSizeXs,
    fontWeight: "700",
    color: Colors.textMuted,
    letterSpacing: 1,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: Typography.fontSizeSm,
    fontWeight: "700",
    color: Colors.textDark,
  },
  itemQty: {
    fontSize: Typography.fontSizeXs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  itemPrice: {
    fontSize: Typography.fontSizeXs,
    color: Colors.textMedium,
    marginTop: 2,
  },
  itemTotal: {
    fontSize: Typography.fontSizeMd,
    fontWeight: "700",
    color: Colors.greenDark,
  },
  allocRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.inputBackground,
  },
  allocInfo: {
    flex: 1,
  },
  sellerName: {
    fontSize: Typography.fontSizeSm,
    fontWeight: "700",
    color: Colors.textDark,
  },
  allocPortion: {
    fontSize: Typography.fontSizeXs,
    color: Colors.greenDark,
    fontWeight: "600",
    marginTop: 2,
  },
  trackingText: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
  allocStatusBadge: {
    backgroundColor: Colors.greenPrimary + "15",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  allocStatusText: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.greenDark,
  },
  chatBtn: {
    backgroundColor: Colors.goldPrimary,
    marginVertical: Spacing.lg,
  },
});
