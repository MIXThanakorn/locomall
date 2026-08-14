import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";
import { HeaderGradient } from "../../src/components/HeaderGradient";
import { ImagePlaceholder } from "../../src/components/ImagePlaceholder";
import { Button } from "../../src/components/Button";
import { mockMarketProducts } from "../../src/mock/data";

export default function CartScreen() {
  const router = useRouter();
  const [items, setItems] = useState([
    { product: mockMarketProducts[0], quantity: 10 },
    { product: mockMarketProducts[1], quantity: 2 },
  ]);

  const updateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      setItems(items.filter((_, i) => i !== index));
    } else {
      const updated = [...items];
      updated[index].quantity = newQty;
      setItems(updated);
    }
  };

  const totalAmount = items.reduce((sum, item) => sum + item.product.unit_price * item.quantity, 0);

  return (
    <View style={styles.container}>
      <HeaderGradient
        title="My Cart"
        subtitle="Review community market items before allocation"
        variant="white"
        showBack
        onBackPress={() => router.back()}
        style={styles.header}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {items.length > 0 ? (
          <React.Fragment>
            {items.map((item, idx) => (
              <View key={item.product.id} style={styles.cartCard}>
                <ImagePlaceholder
                  width={70}
                  height={70}
                  borderRadius={BorderRadius.md}
                  label=""
                  iconName="cube-outline"
                  backgroundColor="#FEF3C7"
                />

                <View style={styles.itemInfo}>
                  <Text style={styles.itemTitle}>{item.product.name}</Text>
                  <Text style={styles.marketName}>{item.product.market_name}</Text>
                  <Text style={styles.itemPrice}>฿{item.product.unit_price.toFixed(2)} / {item.product.unit_label}</Text>
                  <Text style={styles.sellerCountText}>Distributed among {item.product.seller_count} local sellers</Text>

                  <View style={styles.qtyControlRow}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateQuantity(idx, item.quantity - 1)}
                    >
                      <Ionicons name="remove" size={16} color={Colors.textDark} />
                    </TouchableOpacity>
                    <Text style={styles.qtyVal}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateQuantity(idx, item.quantity + 1)}
                    >
                      <Ionicons name="add" size={16} color={Colors.textDark} />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => updateQuantity(idx, 0)}
                >
                  <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.allocationNoticeBox}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.greenDark} />
              <Text style={styles.allocationNoticeText}>
                Note: Stock is not reserved until checkout. Orders will be distributed equally among eligible sellers.
              </Text>
            </View>
          </React.Fragment>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="cart-outline" size={64} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Button
              title="Explore Markets"
              variant="gold"
              size="md"
              style={styles.exploreBtn}
              onPress={() => router.push("/(tabs)" as any)}
            />
          </View>
        )}
      </ScrollView>

      {items.length > 0 && (
        <View style={styles.bottomBar}>
          <View style={styles.totalInfo}>
            <Text style={styles.totalLbl}>Total Amount</Text>
            <Text style={styles.totalVal}>฿{totalAmount.toFixed(2)}</Text>
          </View>
          <Button
            title="Proceed to Checkout"
            variant="gold"
            size="lg"
            style={styles.checkoutBtn}
            textStyle={{ color: Colors.textDark }}
            onPress={() => router.push("/order/checkout" as any)}
          />
        </View>
      )}
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
  cartCard: {
    flexDirection: "row",
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    alignItems: "center",
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  itemInfo: {
    flex: 1,
    marginLeft: Spacing.md,
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
  itemPrice: {
    fontSize: Typography.fontSizeSm,
    fontWeight: "700",
    color: Colors.greenDark,
    marginTop: 2,
  },
  sellerCountText: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
  qtyControlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.inputBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyVal: {
    fontSize: Typography.fontSizeSm,
    fontWeight: "700",
    color: Colors.textDark,
    minWidth: 20,
    textAlign: "center",
  },
  deleteBtn: {
    padding: Spacing.xs,
  },
  allocationNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.greenPrimary + "15",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  allocationNoticeText: {
    fontSize: Typography.fontSizeXs,
    color: Colors.greenDark,
    flex: 1,
    lineHeight: 16,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: Typography.fontSizeMd,
    fontWeight: "600",
    color: Colors.textMuted,
    marginVertical: Spacing.md,
  },
  exploreBtn: {
    marginTop: Spacing.sm,
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
  checkoutBtn: {
    flex: 1.2,
    backgroundColor: Colors.goldPrimary,
  },
});
