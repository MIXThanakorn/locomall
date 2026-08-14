import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";
import { HeaderGradient } from "../../src/components/HeaderGradient";
import { Button } from "../../src/components/Button";
import { mockAddresses, mockMarketProducts } from "../../src/mock/data";

export default function CheckoutScreen() {
  const router = useRouter();
  const [selectedAddress, setSelectedAddress] = useState(mockAddresses[0]);
  const [paymentMethod, setPaymentMethod] = useState<"wallet" | "promptpay" | "bank">("wallet");

  const orderItems = [
    { product: mockMarketProducts[0], quantity: 30, unit_price: 20.0 },
  ];

  const totalAmount = orderItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

  const handlePlaceOrder = () => {
    alert("Order Created! Automatic allocation distribution completed across 3 eligible sellers.");
    router.replace("/order" as any);
  };

  return (
    <View style={styles.container}>
      <HeaderGradient
        title="Checkout"
        subtitle="Confirm delivery and seller allocation"
        variant="white"
        showBack
        onBackPress={() => router.back()}
        style={styles.header}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Shipping Address */}
        <Text style={styles.sectionTitle}>DELIVERY ADDRESS</Text>
        <View style={styles.card}>
          <View style={styles.addressHeader}>
            <View style={styles.addressTag}>
              <Text style={styles.addressTagText}>{selectedAddress.title.toUpperCase()}</Text>
            </View>
            <TouchableOpacity onPress={() => router.push("/profile/shipping-address" as any)}>
              <Text style={styles.changeLink}>Change</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.addressText}>{selectedAddress.house_no_details}</Text>
        </View>

        {/* Order Items & Allocation Preview */}
        <Text style={styles.sectionTitle}>ORDER ITEMS</Text>
        <View style={styles.card}>
          {orderItems.map((item, idx) => (
            <View key={idx} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>{item.product.name}</Text>
                <Text style={styles.marketName}>Market: {item.product.market_name}</Text>
                <Text style={styles.itemQty}>Quantity: {item.quantity} {item.product.unit_label}</Text>
              </View>
              <Text style={styles.itemTotal}>฿{(item.unit_price * item.quantity).toFixed(2)}</Text>
            </View>
          ))}

          {/* Allocation Distribution Notice */}
          <View style={styles.allocationBox}>
            <View style={styles.allocationHeader}>
              <Ionicons name="git-branch-outline" size={16} color={Colors.greenDark} />
              <Text style={styles.allocationTitle}>AUTOMATIC EQUAL ALLOCATION</Text>
            </View>
            <Text style={styles.allocationDesc}>
              This order of 30 units will be allocated equally across 3 participating sellers:
            </Text>
            <Text style={styles.allocationItem}>• สวนมะพร้าว ลุงสมหมาย: 10 units</Text>
            <Text style={styles.allocationItem}>• สวนมะพร้าว ป้าอารี: 10 units</Text>
            <Text style={styles.allocationItem}>• สวนมะพร้าว พี่ชัย: 10 units</Text>
          </View>
        </View>

        {/* Payment Method */}
        <Text style={styles.sectionTitle}>PAYMENT METHOD</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={[styles.payOption, paymentMethod === "wallet" && styles.activePayOption]}
            onPress={() => setPaymentMethod("wallet")}
          >
            <Ionicons name="wallet-outline" size={20} color={paymentMethod === "wallet" ? Colors.greenDark : Colors.textDark} />
            <Text style={styles.payOptionText}>Locomall Wallet Balance (฿123,456.00)</Text>
            <Ionicons name={paymentMethod === "wallet" ? "radio-button-on" : "radio-button-off"} size={18} color={Colors.greenPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.payOption, paymentMethod === "promptpay" && styles.activePayOption]}
            onPress={() => setPaymentMethod("promptpay")}
          >
            <Ionicons name="qr-code-outline" size={20} color={paymentMethod === "promptpay" ? Colors.greenDark : Colors.textDark} />
            <Text style={styles.payOptionText}>QR PromptPay</Text>
            <Ionicons name={paymentMethod === "promptpay" ? "radio-button-on" : "radio-button-off"} size={18} color={Colors.greenPrimary} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Place Order Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.totalInfo}>
          <Text style={styles.totalLbl}>Total Payment</Text>
          <Text style={styles.totalVal}>฿{totalAmount.toFixed(2)}</Text>
        </View>
        <Button
          title="Place Order & Allocate"
          variant="gold"
          size="lg"
          style={styles.placeOrderBtn}
          textStyle={{ color: Colors.textDark }}
          onPress={handlePlaceOrder}
        />
      </View>
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
  sectionTitle: {
    fontSize: Typography.fontSizeXs,
    fontWeight: "700",
    color: Colors.textMuted,
    letterSpacing: 1,
    marginTop: Spacing.md,
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
  addressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  addressTag: {
    backgroundColor: Colors.greenPrimary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  addressTagText: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.textWhite,
  },
  changeLink: {
    fontSize: Typography.fontSizeXs,
    fontWeight: "700",
    color: Colors.goldDark,
  },
  addressText: {
    fontSize: Typography.fontSizeSm,
    color: Colors.textDark,
    marginTop: 4,
    lineHeight: 18,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: Typography.fontSizeSm,
    fontWeight: "700",
    color: Colors.textDark,
  },
  marketName: {
    fontSize: Typography.fontSizeXs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  itemQty: {
    fontSize: Typography.fontSizeXs,
    color: Colors.textMedium,
    marginTop: 2,
  },
  itemTotal: {
    fontSize: Typography.fontSizeMd,
    fontWeight: "700",
    color: Colors.greenDark,
  },
  allocationBox: {
    backgroundColor: Colors.greenPrimary + "15",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  allocationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  allocationTitle: {
    fontSize: Typography.fontSizeXs,
    fontWeight: "700",
    color: Colors.greenDark,
  },
  allocationDesc: {
    fontSize: Typography.fontSizeXs,
    color: Colors.textMedium,
    marginBottom: 4,
    lineHeight: 16,
  },
  allocationItem: {
    fontSize: Typography.fontSizeXs,
    color: Colors.textDark,
    fontWeight: "500",
    marginLeft: 4,
  },
  payOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.inputBackground,
  },
  activePayOption: {
    backgroundColor: Colors.greenPrimary + "08",
  },
  payOptionText: {
    flex: 1,
    fontSize: Typography.fontSizeSm,
    color: Colors.textDark,
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: Colors.inputBorder,
  },
  totalInfo: {
    flex: 1,
  },
  totalLbl: {
    fontSize: Typography.fontSizeXs,
    color: Colors.textMuted,
  },
  totalVal: {
    fontSize: Typography.fontSizeXl,
    fontWeight: "700",
    color: Colors.goldDark,
  },
  placeOrderBtn: {
    flex: 1.3,
    backgroundColor: Colors.goldPrimary,
  },
});
