import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";
import { HeaderGradient } from "../../src/components/HeaderGradient";
import { Button } from "../../src/components/Button";
import { mockWalletTransactions } from "../../src/mock/data";

export default function SellerWalletScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <HeaderGradient
        title="SELLER WALLET"
        subtitle="Track fulfilled allocation earnings & bank withdrawals"
        variant="white"
        showBack
        onBackPress={() => router.back()}
        style={styles.header}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Earnings Statistics Card */}
        <View style={styles.earningsCard}>
          <Text style={styles.cardHeaderLbl}>Earnings Statistics</Text>

          <View style={styles.earningsRow}>
            <View style={styles.earningCol}>
              <Text style={styles.periodLbl}>THIS MONTH</Text>
              <Text style={styles.periodVal}>฿4,821.00</Text>
            </View>
            <View style={styles.earningDivider} />
            <View style={styles.earningCol}>
              <Text style={styles.periodLbl}>LAST MONTH</Text>
              <Text style={styles.periodVal}>฿1,104.20</Text>
            </View>
          </View>

          <View style={styles.growthBadge}>
            <Text style={styles.growthText}>Net Sales Growth: +12.4%</Text>
          </View>
        </View>

        {/* Withdraw Button */}
        <Button
          title="Withdraw to Bank"
          variant="gold"
          size="lg"
          style={styles.withdrawBtn}
          textStyle={{ color: Colors.textDark }}
          onPress={() => alert("Withdrawal request initiated for ฿4,821.00")}
        />

        {/* Recent Activity List */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity><Text style={styles.viewAll}>View All</Text></TouchableOpacity>
        </View>

        {mockWalletTransactions.map((tx) => (
          <View key={tx.id} style={styles.txCard}>
            <View style={styles.txIconBox}>
              <Ionicons
                name={tx.amount > 0 ? "arrow-down-circle" : "arrow-up-circle"}
                size={22}
                color={tx.amount > 0 ? Colors.greenPrimary : Colors.danger}
              />
            </View>

            <View style={styles.txInfo}>
              <Text style={styles.txTitle}>{tx.description}</Text>
              <Text style={styles.txDate}>{new Date(tx.created_at).toLocaleDateString()}</Text>
            </View>

            <Text
              style={[
                styles.txAmount,
                { color: tx.amount > 0 ? Colors.greenPrimary : Colors.danger },
              ]}
            >
              {tx.amount > 0 ? `+฿${tx.amount.toFixed(2)}` : `-฿${Math.abs(tx.amount).toFixed(2)}`}
            </Text>
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
  earningsCard: {
    backgroundColor: Colors.greenDark,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardHeaderLbl: {
    fontSize: Typography.fontSizeSm,
    fontWeight: "700",
    color: Colors.textWhite,
  },
  earningsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: Spacing.md,
  },
  earningCol: {
    flex: 1,
  },
  periodLbl: {
    fontSize: 9,
    color: Colors.textWhite,
    opacity: 0.7,
    fontWeight: "700",
  },
  periodVal: {
    fontSize: Typography.fontSizeXl,
    fontWeight: "700",
    color: Colors.textWhite,
    marginTop: 2,
  },
  earningDivider: {
    width: 1,
    height: 36,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginHorizontal: Spacing.md,
  },
  growthBadge: {
    backgroundColor: Colors.greenLight + "30",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    alignSelf: "flex-start",
  },
  growthText: {
    fontSize: Typography.fontSizeXs,
    color: Colors.greenLight,
    fontWeight: "700",
  },
  withdrawBtn: {
    backgroundColor: Colors.goldPrimary,
    marginBottom: Spacing.xl,
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
  viewAll: {
    fontSize: Typography.fontSizeXs,
    color: Colors.goldDark,
    fontWeight: "700",
  },
  txCard: {
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
  txIconBox: {
    marginRight: Spacing.md,
  },
  txInfo: {
    flex: 1,
  },
  txTitle: {
    fontSize: Typography.fontSizeSm,
    fontWeight: "700",
    color: Colors.textDark,
  },
  txDate: {
    fontSize: Typography.fontSizeXs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  txAmount: {
    fontSize: Typography.fontSizeSm,
    fontWeight: "700",
  },
});
