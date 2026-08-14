import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";
import { HeaderGradient } from "../../src/components/HeaderGradient";
import { ImagePlaceholder } from "../../src/components/ImagePlaceholder";
import { useLanguage } from "../../src/context/LanguageContext";

export default function ProfileScreen() {
  const router = useRouter();
  const { t, language } = useLanguage();

  return (
    <View style={styles.container}>
      {/* Profile Header */}
      <HeaderGradient variant="gold" style={styles.header}>
        <View style={styles.headerProfileRow}>
          <ImagePlaceholder
            width={64}
            height={64}
            borderRadius={32}
            label=""
            iconName="person"
            iconSize={32}
            backgroundColor="#FFFFFF"
          />
          <View style={styles.headerInfo}>
            <Text style={styles.userName}>Hello World</Text>
            <Text style={styles.userEmail}>Hello@gmail.com</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{language === "th" ? "สมาชิกตลาดและผู้ขาย" : "SELLER & MARKET MEMBER"}</Text>
            </View>
          </View>
        </View>

        {/* Order Status Badges */}
        <View style={styles.badgeRow}>
          <TouchableOpacity style={styles.badgeItem} onPress={() => router.push("/order" as any)}>
            <Ionicons name="card-outline" size={22} color={Colors.goldDark} />
            <Text style={styles.badgeLabel}>{t("toPay")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.badgeItem} onPress={() => router.push("/order" as any)}>
            <Ionicons name="cube-outline" size={22} color={Colors.goldDark} />
            <Text style={styles.badgeLabel}>{t("toShip")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.badgeItem} onPress={() => router.push("/order" as any)}>
            <Ionicons name="car-outline" size={22} color={Colors.goldDark} />
            <Text style={styles.badgeLabel}>{t("toReceive")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.badgeItem} onPress={() => router.push("/order" as any)}>
            <Ionicons name="star-outline" size={22} color={Colors.goldDark} />
            <Text style={styles.badgeLabel}>{t("reviews")}</Text>
          </TouchableOpacity>
        </View>
      </HeaderGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Seller & Market Portals Quick Nav */}
        <Text style={styles.sectionHeader}>{language === "th" ? "พอร์ทัลผู้ขายและตลาดชุมชน" : "COMMUNITY MARKET & SELLER PORTAL"}</Text>
        <View style={styles.portalCard}>
          <TouchableOpacity
            style={styles.portalRow}
            onPress={() => router.push("/seller/dashboard" as any)}
            activeOpacity={0.7}
          >
            <View style={styles.portalIconBox}>
              <Ionicons name="analytics-outline" size={20} color={Colors.greenDark} />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={styles.portalTitle}>{t("sellerDashboard")}</Text>
              <Text style={styles.portalSubtitle}>
                {language === "th" ? "จัดการสต็อกสินค้า ดูการจัดสรรและรายได้" : "Manage stock listings, view allocations & earnings"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.portalRow}
            onPress={() => router.push("/market/manage" as any)}
            activeOpacity={0.7}
          >
            <View style={styles.portalIconBox}>
              <Ionicons name="storefront-outline" size={20} color={Colors.greenDark} />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={styles.portalTitle}>{t("marketOwnerPortal")}</Text>
              <Text style={styles.portalSubtitle}>
                {language === "th" ? "สร้างตลาดชุมชนและตั้งราคาสินค้าส่วนกลาง" : "Create community market & set product pricing"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Account & Security */}
        <Text style={styles.sectionHeader}>{language === "th" ? "บัญชีและความปลอดภัย" : "ACCOUNT & SECURITY"}</Text>
        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push("/profile/edit-profile" as any)}
          >
            <Ionicons name="person-outline" size={18} color={Colors.textDark} style={styles.menuIcon} />
            <Text style={styles.menuTitle}>{t("accountSetting")}</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push("/profile/change-password" as any)}
          >
            <Ionicons name="lock-closed-outline" size={18} color={Colors.textDark} style={styles.menuIcon} />
            <Text style={styles.menuTitle}>{t("changePassword")}</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Buyer & Wallet */}
        <Text style={styles.sectionHeader}>{language === "th" ? "ผู้ซื้อและกระเป๋าเงิน" : "BUYER & WALLET"}</Text>
        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push("/order" as any)}
          >
            <Ionicons name="receipt-outline" size={18} color={Colors.textDark} style={styles.menuIcon} />
            <Text style={styles.menuTitle}>{t("myOrders")}</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push("/profile/shipping-address" as any)}
          >
            <Ionicons name="location-outline" size={18} color={Colors.textDark} style={styles.menuIcon} />
            <Text style={styles.menuTitle}>{t("shippingAddress")}</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push("/profile/wallet" as any)}
          >
            <Ionicons name="wallet-outline" size={18} color={Colors.textDark} style={styles.menuIcon} />
            <Text style={styles.menuTitle}>{t("wallet")}</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Preferences */}
        <Text style={styles.sectionHeader}>{language === "th" ? "การตั้งค่า" : "PREFERENCES"}</Text>
        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push("/(tabs)/notification" as any)}
          >
            <Ionicons name="notifications-outline" size={18} color={Colors.textDark} style={styles.menuIcon} />
            <Text style={styles.menuTitle}>{t("notificationSettings")}</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push("/profile/language" as any)}
          >
            <Ionicons name="globe-outline" size={18} color={Colors.textDark} style={styles.menuIcon} />
            <Text style={styles.menuTitle}>{t("language")}</Text>
            <View style={styles.langIndicator}>
              <Text style={styles.currentLangText}>{language === "th" ? "ไทย" : "English"}</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </View>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <Text style={styles.sectionHeader}>{language === "th" ? "ข้อมูลแอป" : "APP INFO"}</Text>
        <View style={styles.menuCard}>
          <TouchableOpacity style={styles.menuRow} onPress={() => {}}>
            <Ionicons name="information-circle-outline" size={18} color={Colors.textDark} style={styles.menuIcon} />
            <Text style={styles.menuTitle}>{t("aboutUs")}</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.replace("/(auth)/sign-in" as any)}
          >
            <Ionicons name="log-out-outline" size={18} color={Colors.danger} style={styles.menuIcon} />
            <Text style={[styles.menuTitle, { color: Colors.danger }]}>{t("signOut")}</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.danger} />
          </TouchableOpacity>
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
    paddingBottom: Spacing.lg,
  },
  headerProfileRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  headerInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  userName: {
    fontSize: Typography.fontSizeLg,
    fontWeight: "700",
    color: Colors.textDark,
  },
  userEmail: {
    fontSize: Typography.fontSizeSm,
    color: Colors.textDark,
    opacity: 0.8,
  },
  roleBadge: {
    backgroundColor: Colors.greenDark,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  roleText: {
    fontSize: 9,
    fontWeight: "700",
    color: Colors.textWhite,
  },
  badgeRow: {
    flexDirection: "row",
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    justifyContent: "space-around",
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  badgeItem: {
    alignItems: "center",
  },
  badgeLabel: {
    fontSize: Typography.fontSizeXs,
    fontWeight: "500",
    color: Colors.textDark,
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    fontSize: Typography.fontSizeXs,
    fontWeight: "700",
    color: Colors.textMuted,
    letterSpacing: 1,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  portalCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.greenPrimary + "40",
  },
  portalRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  portalIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.greenPrimary + "15",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  menuTextCol: {
    flex: 1,
  },
  portalTitle: {
    fontSize: Typography.fontSizeMd,
    fontWeight: "700",
    color: Colors.greenDark,
  },
  portalSubtitle: {
    fontSize: Typography.fontSizeXs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  menuCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  menuIcon: {
    marginRight: Spacing.md,
  },
  menuTitle: {
    flex: 1,
    fontSize: Typography.fontSizeSm,
    fontWeight: "500",
    color: Colors.textDark,
  },
  langIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  currentLangText: {
    fontSize: Typography.fontSizeXs,
    color: Colors.textMuted,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.inputBorder,
  },
});
