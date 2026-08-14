import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";
import { HeaderGradient } from "../../src/components/HeaderGradient";
import { mockOrders } from "../../src/mock/data";

export default function OrderListScreen() {
  const router = useRouter();
  const [activeStatus, setActiveStatus] = useState<string>("All");

  const statuses = ["All", "To Pay", "To Ship", "To Receive", "Completed"];

  return (
    <View style={styles.container}>
      <HeaderGradient
        title="My Orders"
        subtitle="Track your community marketplace orders and fulfillment"
        variant="white"
        showBack
        onBackPress={() => router.back()}
        style={styles.header}
      />

      <View style={styles.statusPillsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusScroll}>
          {statuses.map((st) => (
            <TouchableOpacity
              key={st}
              style={[styles.statusPill, activeStatus === st && styles.activeStatusPill]}
              onPress={() => setActiveStatus(st)}
            >
              <Text style={[styles.statusText, activeStatus === st && styles.activeStatusText]}>{st}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {mockOrders.map((order) => (
          <TouchableOpacity
            key={order.id}
            style={styles.orderCard}
            onPress={() => router.push(`/order/${order.id}` as any)}
          >
            <View style={styles.orderHeader}>
              <Text style={styles.orderId}>Order #{order.id}</Text>
              <View style={styles.statusTag}>
                <Text style={styles.statusTagText}>{order.status.toUpperCase()}</Text>
              </View>
            </View>

            {order.items?.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <Text style={styles.itemName}>• {item.market_product_name}</Text>
                <Text style={styles.itemQty}>x{item.quantity}</Text>
              </View>
            ))}

            <View style={styles.divider} />

            <View style={styles.footerRow}>
              <Text style={styles.dateText}>{new Date(order.created_at).toLocaleDateString()}</Text>
              <View style={styles.totalBlock}>
                <Text style={styles.totalLbl}>Total: </Text>
                <Text style={styles.totalAmount}>฿{order.total_amount.toFixed(2)}</Text>
              </View>
            </View>
          </TouchableOpacity>
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
  statusPillsContainer: {
    backgroundColor: Colors.cardBackground,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.inputBorder,
  },
  statusScroll: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  statusPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.inputBackground,
  },
  activeStatusPill: {
    backgroundColor: Colors.goldDark,
  },
  statusText: {
    fontSize: Typography.fontSizeXs,
    fontWeight: "500",
    color: Colors.textDark,
  },
  activeStatusText: {
    color: Colors.textWhite,
    fontWeight: "700",
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
  },
  orderCard: {
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
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  orderId: {
    fontSize: Typography.fontSizeSm,
    fontWeight: "700",
    color: Colors.textDark,
  },
  statusTag: {
    backgroundColor: Colors.greenPrimary + "20",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.greenDark,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 2,
  },
  itemName: {
    fontSize: Typography.fontSizeSm,
    color: Colors.textDark,
  },
  itemQty: {
    fontSize: Typography.fontSizeSm,
    color: Colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.inputBorder,
    marginVertical: Spacing.sm,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateText: {
    fontSize: Typography.fontSizeXs,
    color: Colors.textMuted,
  },
  totalBlock: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  totalLbl: {
    fontSize: Typography.fontSizeXs,
    color: Colors.textMuted,
  },
  totalAmount: {
    fontSize: Typography.fontSizeMd,
    fontWeight: "700",
    color: Colors.goldDark,
  },
});
