import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Typography, Spacing, BorderRadius } from "../../../src/constants/theme";
import { ImagePlaceholder } from "../../../src/components/ImagePlaceholder";
import { Button } from "../../../src/components/Button";
import { mockMarketProducts, mockSellerListings } from "../../../src/mock/data";

export default function MarketProductDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const [showModal, setShowModal] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState("A");
  const [quantity, setQuantity] = useState(1);

  const product = mockMarketProducts.find((p) => p.id === id) || mockMarketProducts[0];

  const handleAddToCart = () => {
    setShowModal(false);
    alert(`Added ${quantity} ${product.unit_label} of ${product.name} to Cart!`);
    router.push("/order/cart" as any);
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Large Hero Image with dynamic safe area back button */}
        <View style={styles.heroContainer}>
          <ImagePlaceholder
            height={260}
            borderRadius={0}
            label={`PRODUCT HERO: ${product.name}`}
            iconName="cube-outline"
            iconSize={48}
            backgroundColor="#CBD5E1"
          />
          <TouchableOpacity
            style={[styles.backBtn, { top: Math.max(insets.top + 8, 20) }]}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.textWhite} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.favBtn, { top: Math.max(insets.top + 8, 20) }]}
            activeOpacity={0.8}
          >
            <Ionicons name="heart-outline" size={20} color={Colors.danger} />
          </TouchableOpacity>
        </View>

        {/* Product Details Header */}
        <View style={styles.detailsCard}>
          <View style={styles.priceRow}>
            <Text style={styles.priceText}>฿{product.unit_price.toFixed(2)}</Text>
            <Text style={styles.unitText}>/ {product.unit_label}</Text>
          </View>

          <Text style={styles.productTitle}>{product.name}</Text>

          <View style={styles.ratingRow}>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={14} color={Colors.goldDark} />
              <Text style={styles.ratingText}>{product.rating}</Text>
            </View>
            <Text style={styles.ratingCount}>({product.reviews_count} Reviews)</Text>
          </View>

          <Text style={styles.description}>{product.description}</Text>

          {/* Community Marketplace Allocation Info Card */}
          <View style={styles.communityInfoBox}>
            <View style={styles.communityHeaderRow}>
              <Ionicons name="people" size={16} color={Colors.greenDark} />
              <Text style={styles.communityTitle}>COMMUNITY MARKETPLACE MODEL</Text>
            </View>
            <Text style={styles.communityDesc}>
              This product is supplied by {product.seller_count} local sellers in {product.market_name}.
              When you purchase, your order will be automatically allocated equally across all verified sellers.
            </Text>

            <View style={styles.sellerList}>
              <Text style={styles.sellerListHeader}>Participating Sellers:</Text>
              {mockSellerListings.map((listing) => (
                <View key={listing.id} style={styles.sellerRow}>
                  <Text style={styles.sellerName}>• {listing.seller_name}</Text>
                  <Text style={styles.sellerStock}>Available: {listing.initial_quantity - listing.reserved_quantity} {product.unit_label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Bar with Safe Area Bottom */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity
          style={styles.chatBtn}
          onPress={() => router.push("/(tabs)/chat" as any)}
        >
          <Ionicons name="chatbubble-outline" size={20} color={Colors.textDark} />
        </TouchableOpacity>

        <Button
          title="Add to Cart"
          variant="outline"
          size="lg"
          style={styles.cartBtn}
          onPress={() => setShowModal(true)}
        />

        <Button
          title={`Buy (฿${(product.unit_price * quantity).toFixed(2)})`}
          variant="gold"
          size="lg"
          style={styles.buyBtn}
          textStyle={{ color: Colors.textDark }}
          onPress={() => setShowModal(true)}
        />
      </View>

      {/* Option Picker Modal / BottomSheet matching Figma */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom + 12, 24) }]}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={22} color={Colors.textMuted} />
            </TouchableOpacity>

            <View style={styles.modalHeaderRow}>
              <ImagePlaceholder
                width={64}
                height={64}
                borderRadius={BorderRadius.md}
                label=""
                iconName="cube-outline"
                backgroundColor="#FEF3C7"
              />
              <View style={styles.modalHeaderInfo}>
                <Text style={styles.modalPrice}>฿{product.unit_price.toFixed(2)}</Text>
                <Text style={styles.modalStock}>Stock Available: {product.total_available_stock} {product.unit_label}</Text>
              </View>
            </View>

            <Text style={styles.choiceTitle}>Choice Option</Text>
            <View style={styles.choiceRow}>
              {["A", "B", "C", "D", "E", "F"].map((choice) => (
                <TouchableOpacity
                  key={choice}
                  style={[styles.choiceBtn, selectedChoice === choice && styles.activeChoiceBtn]}
                  onPress={() => setSelectedChoice(choice)}
                >
                  <Text style={[styles.choiceText, selectedChoice === choice && styles.activeChoiceText]}>
                    {choice}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.quantityTitle}>Quantity</Text>
            <View style={styles.quantityRow}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Ionicons name="remove" size={18} color={Colors.textDark} />
              </TouchableOpacity>

              <Text style={styles.qtyValText}>{quantity}</Text>

              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setQuantity(quantity + 1)}
              >
                <Ionicons name="add" size={18} color={Colors.textDark} />
              </TouchableOpacity>
            </View>

            <Button
              title={`Confirm & Add to Cart (${quantity} ${product.unit_label})`}
              variant="gold"
              size="lg"
              style={styles.confirmBtn}
              textStyle={{ color: Colors.textDark }}
              onPress={handleAddToCart}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  heroContainer: {
    position: "relative",
  },
  backBtn: {
    position: "absolute",
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  favBtn: {
    position: "absolute",
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.cardBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  detailsCard: {
    backgroundColor: Colors.cardBackground,
    padding: Spacing.lg,
    marginTop: -20,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  priceText: {
    fontSize: Typography.fontSizeXxl,
    fontWeight: "700",
    color: Colors.goldDark,
  },
  unitText: {
    fontSize: Typography.fontSizeSm,
    color: Colors.textMuted,
    marginLeft: 4,
  },
  productTitle: {
    fontSize: Typography.fontSizeLg,
    fontWeight: "700",
    color: Colors.textDark,
    marginVertical: Spacing.xs,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginRight: 6,
  },
  ratingText: {
    fontSize: Typography.fontSizeSm,
    color: Colors.goldDark,
    fontWeight: "700",
  },
  ratingCount: {
    fontSize: Typography.fontSizeSm,
    color: Colors.textMuted,
  },
  description: {
    fontSize: Typography.fontSizeSm,
    color: Colors.textMedium,
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  communityInfoBox: {
    backgroundColor: Colors.greenPrimary + "10",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.greenPrimary + "30",
  },
  communityHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  communityTitle: {
    fontSize: Typography.fontSizeXs,
    fontWeight: "700",
    color: Colors.greenDark,
  },
  communityDesc: {
    fontSize: Typography.fontSizeXs,
    color: Colors.textMedium,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  sellerList: {
    borderTopWidth: 1,
    borderTopColor: Colors.greenPrimary + "20",
    paddingTop: Spacing.sm,
  },
  sellerListHeader: {
    fontSize: Typography.fontSizeXs,
    fontWeight: "700",
    color: Colors.textDark,
    marginBottom: 4,
  },
  sellerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 2,
  },
  sellerName: {
    fontSize: Typography.fontSizeXs,
    color: Colors.textDark,
  },
  sellerStock: {
    fontSize: Typography.fontSizeXs,
    color: Colors.greenDark,
    fontWeight: "600",
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    backgroundColor: Colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: Colors.inputBorder,
    gap: Spacing.sm,
  },
  chatBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  cartBtn: {
    borderColor: Colors.goldDark,
  },
  buyBtn: {
    flex: 1,
    backgroundColor: Colors.goldPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  closeBtn: {
    alignSelf: "flex-end",
    padding: Spacing.xs,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  modalHeaderInfo: {
    marginLeft: Spacing.md,
  },
  modalPrice: {
    fontSize: Typography.fontSizeXl,
    fontWeight: "700",
    color: Colors.goldDark,
  },
  modalStock: {
    fontSize: Typography.fontSizeXs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  choiceTitle: {
    fontSize: Typography.fontSizeSm,
    fontWeight: "700",
    color: Colors.textDark,
    marginBottom: Spacing.sm,
  },
  choiceRow: {
    flexDirection: "row",
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  choiceBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.inputBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  activeChoiceBtn: {
    backgroundColor: Colors.goldPrimary,
  },
  choiceText: {
    fontSize: Typography.fontSizeSm,
    color: Colors.textDark,
    fontWeight: "500",
  },
  activeChoiceText: {
    fontWeight: "700",
  },
  quantityTitle: {
    fontSize: Typography.fontSizeSm,
    fontWeight: "700",
    color: Colors.textDark,
    marginBottom: Spacing.sm,
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.inputBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyValText: {
    fontSize: Typography.fontSizeLg,
    fontWeight: "700",
    color: Colors.textDark,
  },
  confirmBtn: {
    backgroundColor: Colors.goldPrimary,
  },
});
