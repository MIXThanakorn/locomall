import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius } from "../../../src/constants/theme";
import { HeaderGradient } from "../../../src/components/HeaderGradient";
import { Button } from "../../../src/components/Button";
import { mockMarketProducts } from "../../../src/mock/data";

export default function JoinMarketListingScreen() {
  const router = useRouter();
  const [selectedProductId, setSelectedProductId] = useState(mockMarketProducts[0].id);
  const [quantity, setQuantity] = useState("100");

  const selectedProduct = mockMarketProducts.find((p) => p.id === selectedProductId) || mockMarketProducts[0];

  const handleJoin = () => {
    alert(`Successfully registered ${quantity} ${selectedProduct.unit_label} for ${selectedProduct.name}!`);
    router.back();
  };

  return (
    <View style={styles.container}>
      <HeaderGradient
        title="Join Market Product Listing"
        subtitle="Register your stock quantity into an existing Market Product pool"
        variant="green"
        showBack
        onBackPress={() => router.back()}
        style={styles.header}
      />

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.inputLabel}>Select Market Product</Text>
          <View style={styles.productChoiceBox}>
            <Text style={styles.productTitle}>{selectedProduct.name}</Text>
            <Text style={styles.marketName}>Market: {selectedProduct.market_name}</Text>
            <Text style={styles.officialPrice}>Official Price: ฿{selectedProduct.unit_price.toFixed(2)} / {selectedProduct.unit_label}</Text>
          </View>

          <Text style={styles.inputLabel}>Your Available Stock Quantity ({selectedProduct.unit_label})</Text>
          <TextInput
            style={styles.input}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
          />

          <View style={styles.infoBanner}>
            <View style={styles.infoTitleRow}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.goldDark} />
              <Text style={styles.infoTitle}>Equal Order Allocation Rule</Text>
            </View>
            <Text style={styles.infoText}>
              When buyers order from this market product, the system will allocate orders equally between you and other participating sellers based on actual fulfilled stock.
            </Text>
          </View>

          <Button
            title="Register Listing & Stock"
            variant="green"
            size="lg"
            style={styles.joinBtn}
            onPress={handleJoin}
          />
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
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  inputLabel: {
    fontSize: Typography.fontSizeSm,
    fontWeight: "500",
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  productChoiceBox: {
    backgroundColor: Colors.greenPrimary + "10",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.greenPrimary + "30",
  },
  productTitle: {
    fontSize: Typography.fontSizeMd,
    fontWeight: "700",
    color: Colors.textDark,
  },
  marketName: {
    fontSize: Typography.fontSizeXs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  officialPrice: {
    fontSize: Typography.fontSizeSm,
    color: Colors.greenDark,
    fontWeight: "700",
    marginTop: 4,
  },
  input: {
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.fontSizeMd,
    fontWeight: "700",
  },
  infoBanner: {
    backgroundColor: Colors.goldPrimary + "15",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.goldPrimary + "40",
  },
  infoTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  infoTitle: {
    fontSize: Typography.fontSizeXs,
    fontWeight: "700",
    color: Colors.goldDark,
  },
  infoText: {
    fontSize: Typography.fontSizeXs,
    color: Colors.textMedium,
    lineHeight: 18,
    marginTop: 2,
  },
  joinBtn: {
    marginTop: Spacing.xl,
  },
});
