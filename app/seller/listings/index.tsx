import React from "react";
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Switch } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius } from "../../../src/constants/theme";
import { HeaderGradient } from "../../../src/components/HeaderGradient";
import { Button } from "../../../src/components/Button";
import { mockSellerListings, mockMarketProducts } from "../../../src/mock/data";

export default function SellerListingsScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <HeaderGradient
        title="PRODUCT MANAGEMENT"
        subtitle="Manage your stock listings for market products"
        variant="white"
        showBack
        onBackPress={() => router.back()}
        style={styles.header}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Search Catalogue & Add Button */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={16} color={Colors.textMuted} style={{ marginRight: 6 }} />
            <TextInput style={styles.searchInput} placeholder="Search catalogue..." />
          </View>
        </View>

        <Button
          title="+ Join New Market Product Listing"
          variant="gold"
          size="lg"
          style={styles.addBtn}
          textStyle={{ color: Colors.textDark }}
          onPress={() => router.push("/seller/listings/join" as any)}
        />

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLbl}>TOTAL PRODUCTS</Text>
            <Text style={styles.statVal}>42</Text>
          </View>
          <View style={[styles.statBox, styles.alertBox]}>
            <Text style={[styles.statLbl, { color: Colors.warning }]}>LOW STOCK ALERTS</Text>
            <Text style={[styles.statVal, { color: Colors.warning }]}>3</Text>
          </View>
        </View>

        {/* Seller Listing Cards */}
        <Text style={styles.sectionTitle}>MY ACTIVE LISTINGS</Text>

        {mockSellerListings.map((listing) => {
          const product = mockMarketProducts.find((p) => p.id === listing.market_product_id) || mockMarketProducts[0];

          return (
            <View key={listing.id} style={styles.listingCard}>
              <View style={styles.listingHeader}>
                <View style={styles.productCol}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.marketTag}>Market: {product.market_name}</Text>
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

              <View style={styles.listingBody}>
                <View style={styles.qtyBox}>
                  <Text style={styles.qtyLbl}>Price</Text>
                  <Text style={styles.qtyVal}>฿{product.unit_price.toFixed(2)}</Text>
                </View>

                <View style={styles.qtyBox}>
                  <Text style={styles.qtyLbl}>My Stock</Text>
                  <Text style={styles.qtyVal}>{listing.initial_quantity} {product.unit_label}</Text>
                </View>

                <View style={styles.qtyBox}>
                  <Text style={styles.qtyLbl}>Reserved</Text>
                  <Text style={styles.qtyVal}>{listing.reserved_quantity}</Text>
                </View>

                <View style={styles.qtyBox}>
                  <Text style={styles.qtyLbl}>Fulfilled</Text>
                  <Text style={styles.qtyVal}>{listing.fulfilled_quantity}</Text>
                </View>
              </View>

              <View style={styles.toggleRow}>
                <Text style={styles.toggleLbl}>Listing Active Status</Text>
                <Switch value={listing.status === "active"} trackColor={{ false: "#CBD5E1", true: Colors.greenPrimary }} />
              </View>
            </View>
          );
        })}
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
  searchRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.round,
    paddingHorizontal: Spacing.md,
    height: 40,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.fontSizeSm,
    color: Colors.textDark,
  },
  addBtn: {
    backgroundColor: Colors.goldPrimary,
    marginBottom: Spacing.lg,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  alertBox: {
    backgroundColor: Colors.warning + "15",
    borderColor: Colors.warning + "40",
  },
  statLbl: {
    fontSize: 9,
    fontWeight: "700",
    color: Colors.textMuted,
  },
  statVal: {
    fontSize: Typography.fontSizeXl,
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
  listingCard: {
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
  listingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  productCol: {
    flex: 1,
  },
  productName: {
    fontSize: Typography.fontSizeSm,
    fontWeight: "700",
    color: Colors.textDark,
  },
  marketTag: {
    fontSize: Typography.fontSizeXs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  iconBtn: {
    padding: 2,
  },
  listingBody: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    marginVertical: Spacing.sm,
  },
  qtyBox: {
    alignItems: "center",
  },
  qtyLbl: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: "700",
  },
  qtyVal: {
    fontSize: Typography.fontSizeSm,
    fontWeight: "700",
    color: Colors.textDark,
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.xs,
  },
  toggleLbl: {
    fontSize: Typography.fontSizeXs,
    color: Colors.textMuted,
    fontWeight: "500",
  },
});
