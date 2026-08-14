import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Switch } from "react-native";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";
import { HeaderGradient } from "../../src/components/HeaderGradient";

export default function NotificationScreen() {
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [promoOffers, setPromoOffers] = useState(true);
  const [accountActivity, setAccountActivity] = useState(true);
  const [newsletter, setNewsletter] = useState(false);

  return (
    <View style={styles.container}>
      <HeaderGradient title="Notification" variant="white" style={styles.header} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* SHOPPING UPDATES */}
        <Text style={styles.sectionTitle}>SHOPPING UPDATES</Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.textCol}>
              <Text style={styles.itemTitle}>Order Updates</Text>
              <Text style={styles.itemSubtitle}>Status changes, allocation alerts, and delivery confirmations.</Text>
            </View>
            <Switch
              value={orderUpdates}
              onValueChange={setOrderUpdates}
              trackColor={{ false: "#CBD5E1", true: Colors.greenPrimary }}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.textCol}>
              <Text style={styles.itemTitle}>Promotional Offers</Text>
              <Text style={styles.itemSubtitle}>Exclusive discounts, flash community sales, and seasonal events.</Text>
            </View>
            <Switch
              value={promoOffers}
              onValueChange={setPromoOffers}
              trackColor={{ false: "#CBD5E1", true: Colors.greenPrimary }}
            />
          </View>
        </View>

        {/* ACCOUNT & SECURITY */}
        <Text style={styles.sectionTitle}>ACCOUNT & SECURITY</Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.textCol}>
              <Text style={styles.itemTitle}>Account Activity</Text>
              <Text style={styles.itemSubtitle}>New logins, security verification codes, and password changes.</Text>
            </View>
            <Switch
              value={accountActivity}
              onValueChange={setAccountActivity}
              trackColor={{ false: "#CBD5E1", true: Colors.greenPrimary }}
            />
          </View>
        </View>

        {/* CURATION */}
        <Text style={styles.sectionTitle}>CURATION</Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.textCol}>
              <Text style={styles.itemTitle}>Newsletter</Text>
              <Text style={styles.itemSubtitle}>Weekly curation of community market stories and new produce.</Text>
            </View>
            <Switch
              value={newsletter}
              onValueChange={setNewsletter}
              trackColor={{ false: "#CBD5E1", true: Colors.greenPrimary }}
            />
          </View>
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
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.inputBorder,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSizeXs,
    fontWeight: "700",
    color: Colors.textMuted,
    letterSpacing: 1,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.xs,
  },
  textCol: {
    flex: 1,
    marginRight: Spacing.md,
  },
  itemTitle: {
    fontSize: Typography.fontSizeMd,
    fontWeight: "700",
    color: Colors.textDark,
  },
  itemSubtitle: {
    fontSize: Typography.fontSizeXs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.inputBorder,
    marginVertical: Spacing.md,
  },
});
