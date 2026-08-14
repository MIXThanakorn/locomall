import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";
import { HeaderGradient } from "../../src/components/HeaderGradient";
import { ImagePlaceholder } from "../../src/components/ImagePlaceholder";
import { Button } from "../../src/components/Button";
import { mockWalletTransactions } from "../../src/mock/data";

export default function BuyerWalletScreen() {
  const router = useRouter();
  const [showQR, setShowQR] = useState(false);
  const [showBankTransfer, setShowBankTransfer] = useState(false);
  const [activeTab, setActiveTab] = useState<"Recent" | "All Time">("Recent");

  const bankList = [
    { name: "Kasikorn Bank (K-Bank)", color: "#16A34A" },
    { name: "SCB Easy (Siam Commercial)", color: "#7C3AED" },
    { name: "Bangkok Bank (BBL)", color: "#2563EB" },
    { name: "Krungthai Bank (KTB)", color: "#06B6D4" },
    { name: "Government Savings Bank (GSB)", color: "#EC4899" },
  ];

  return (
    <View style={styles.container}>
      <HeaderGradient
        title="Wallet"
        variant="white"
        showBack
        onBackPress={() => router.back()}
        style={styles.header}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Wallet Balance Card (Green) */}
        <View style={styles.walletCard}>
          <Text style={styles.walletHolder}>Hello World</Text>
          <Text style={styles.walletSubtitle}>ACCOUNT BALANCE (THB)</Text>
          <Text style={styles.walletBalance}>123.456</Text>
          <Text style={styles.balanceStatus}>AVAILABLE BALANCE (BAHT)</Text>
        </View>

        {/* Top Up Methods */}
        <Text style={styles.sectionTitle}>SELECT TOP UP METHOD</Text>
        <TouchableOpacity
          style={styles.topUpRow}
          onPress={() => {
            setShowBankTransfer(!showBankTransfer);
            setShowQR(false);
          }}
        >
          <Ionicons name="business-outline" size={20} color={Colors.textDark} style={styles.topUpIcon} />
          <Text style={styles.topUpTitle}>Mobile Banking / Bank Transfer</Text>
          <Ionicons name={showBankTransfer ? "chevron-down" : "chevron-forward"} size={18} color={Colors.textMuted} />
        </TouchableOpacity>

        {showBankTransfer && (
          <View style={styles.bankListBox}>
            {bankList.map((bank, idx) => (
              <TouchableOpacity key={idx} style={styles.bankItem}>
                <View style={[styles.bankColorBadge, { backgroundColor: bank.color }]} />
                <Text style={styles.bankItemName}>{bank.name}</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.topUpRow}
          onPress={() => {
            setShowQR(!showQR);
            setShowBankTransfer(false);
          }}
        >
          <Ionicons name="qr-code-outline" size={20} color={Colors.textDark} style={styles.topUpIcon} />
          <Text style={styles.topUpTitle}>QR PromptPay</Text>
          <Ionicons name={showQR ? "chevron-down" : "chevron-forward"} size={18} color={Colors.textMuted} />
        </TouchableOpacity>

        {/* QR PromptPay Container */}
        {showQR && (
          <View style={styles.qrContainer}>
            <Text style={styles.qrTitle}>QR PromptPay</Text>
            <ImagePlaceholder
              width={200}
              height={200}
              borderRadius={BorderRadius.md}
              label="PROMPTPAY QR CODE"
              iconName="qr-code"
              iconSize={48}
              backgroundColor="#FFFFFF"
            />
            <View style={styles.qrActions}>
              <TouchableOpacity style={styles.qrActionBtn}>
                <Ionicons name="download-outline" size={20} color={Colors.textDark} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.qrActionBtn}>
                <Ionicons name="share-social-outline" size={20} color={Colors.textDark} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Recent Activity Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "Recent" && styles.activeTabBtn]}
            onPress={() => setActiveTab("Recent")}
          >
            <Text style={[styles.tabText, activeTab === "Recent" && styles.activeTabText]}>Recent</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "All Time" && styles.activeTabBtn]}
            onPress={() => setActiveTab("All Time")}
          >
            <Text style={[styles.tabText, activeTab === "All Time" && styles.activeTabText]}>All Time</Text>
          </TouchableOpacity>
        </View>

        {/* Transaction History List */}
        {mockWalletTransactions.map((tx) => (
          <View key={tx.id} style={styles.txRow}>
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
            <Text style={[styles.txAmount, { color: tx.amount > 0 ? Colors.greenPrimary : Colors.danger }]}>
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
  walletCard: {
    backgroundColor: Colors.greenDark,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  walletHolder: {
    fontSize: Typography.fontSizeSm,
    color: Colors.textWhite,
    fontWeight: "700",
  },
  walletSubtitle: {
    fontSize: 9,
    color: Colors.textWhite,
    opacity: 0.7,
    marginTop: 2,
  },
  walletBalance: {
    fontSize: 34,
    fontWeight: "700",
    color: Colors.textWhite,
    marginVertical: Spacing.xs,
  },
  balanceStatus: {
    fontSize: 9,
    color: Colors.textWhite,
    opacity: 0.8,
  },
  sectionTitle: {
    fontSize: Typography.fontSizeXs,
    fontWeight: "700",
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  topUpRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  topUpIcon: {
    marginRight: Spacing.md,
  },
  topUpTitle: {
    flex: 1,
    fontSize: Typography.fontSizeSm,
    fontWeight: "700",
    color: Colors.textDark,
  },
  bankListBox: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  bankItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.inputBackground,
  },
  bankColorBadge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: Spacing.md,
  },
  bankItemName: {
    flex: 1,
    fontSize: Typography.fontSizeSm,
    color: Colors.textDark,
    fontWeight: "500",
  },
  qrContainer: {
    backgroundColor: Colors.goldPrimary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: "center",
    marginVertical: Spacing.md,
  },
  qrTitle: {
    fontSize: Typography.fontSizeLg,
    fontWeight: "700",
    color: Colors.textDark,
    marginBottom: Spacing.md,
  },
  qrActions: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  qrActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.cardBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  tabRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginVertical: Spacing.md,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: "center",
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.inputBackground,
  },
  activeTabBtn: {
    backgroundColor: Colors.goldPrimary,
  },
  tabText: {
    fontSize: Typography.fontSizeSm,
    fontWeight: "500",
    color: Colors.textMuted,
  },
  activeTabText: {
    color: Colors.textDark,
    fontWeight: "700",
  },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
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
  },
  txAmount: {
    fontSize: Typography.fontSizeSm,
    fontWeight: "700",
  },
});
