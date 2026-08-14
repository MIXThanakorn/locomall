import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";
import { HeaderGradient } from "../../src/components/HeaderGradient";
import { Button } from "../../src/components/Button";
import { mockAddresses } from "../../src/mock/data";

export default function ShippingAddressScreen() {
  const router = useRouter();
  const [showAddForm, setShowAddForm] = useState(false);
  const [addressTitle, setAddressTitle] = useState<"Home" | "Work" | "Other">("Home");

  return (
    <View style={styles.container}>
      <HeaderGradient
        title="Shipping Address"
        variant="white"
        showBack
        onBackPress={() => router.back()}
        style={styles.header}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {!showAddForm ? (
          <React.Fragment>
            {mockAddresses.map((addr) => (
              <View key={addr.id} style={styles.addressCard}>
                <View style={styles.cardHeaderRow}>
                  <View
                    style={[
                      styles.tagBadge,
                      { backgroundColor: addr.title === "Home" ? Colors.greenPrimary : addr.title === "Work" ? Colors.goldDark : Colors.info },
                    ]}
                  >
                    <Text style={styles.tagText}>{addr.title.toUpperCase()}</Text>
                  </View>
                  <View style={styles.actionIcons}>
                    <TouchableOpacity style={styles.iconBtn}>
                      <Ionicons name="pencil-outline" size={16} color={Colors.textDark} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconBtn}>
                      <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.addressDetails}>{addr.house_no_details}</Text>

                {addr.is_primary && (
                  <View style={styles.primaryBadge}>
                    <Ionicons name="checkmark-circle" size={14} color={Colors.info} />
                    <Text style={styles.primaryText}>Primary Address</Text>
                  </View>
                )}
              </View>
            ))}

            <Button
              title="+ Add New Address"
              variant="gold"
              size="lg"
              style={styles.addBtn}
              textStyle={{ color: Colors.textDark }}
              onPress={() => setShowAddForm(true)}
            />
          </React.Fragment>
        ) : (
          /* Add Address Form */
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Address Details</Text>

            <Text style={styles.inputLabel}>Province</Text>
            <View style={styles.dropdown}>
              <Text style={styles.dropdownText}>Select Province</Text>
              <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
            </View>

            <Text style={styles.inputLabel}>District</Text>
            <View style={styles.dropdown}>
              <Text style={styles.dropdownText}>Select District</Text>
              <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
            </View>

            <Text style={styles.inputLabel}>Sub-district</Text>
            <View style={styles.dropdown}>
              <Text style={styles.dropdownText}>Select Sub-district</Text>
              <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
            </View>

            <Text style={styles.inputLabel}>House No. & Details</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Apartment, suite, unit, building, floor, etc."
              multiline
            />

            {/* Tag Buttons */}
            <Text style={styles.inputLabel}>Label As</Text>
            <View style={styles.tagRow}>
              {(["Home", "Work", "Other"] as const).map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={[
                    styles.tagChoiceBtn,
                    addressTitle === tag && styles.activeTagChoice,
                  ]}
                  onPress={() => setAddressTitle(tag)}
                >
                  <Text
                    style={[
                      styles.tagChoiceText,
                      addressTitle === tag && styles.activeTagChoiceText,
                    ]}
                  >
                    {tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button
              title="Add Address"
              variant="gold"
              size="lg"
              style={styles.saveBtn}
              textStyle={{ color: Colors.textDark }}
              onPress={() => setShowAddForm(false)}
            />

            <Button
              title="Cancel"
              variant="ghost"
              size="md"
              onPress={() => setShowAddForm(false)}
            />
          </View>
        )}
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
  addressCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  tagBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  tagText: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.textWhite,
  },
  actionIcons: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  iconBtn: {
    padding: 2,
  },
  addressDetails: {
    fontSize: Typography.fontSizeSm,
    color: Colors.textDark,
    lineHeight: 20,
  },
  primaryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: Spacing.sm,
  },
  primaryText: {
    fontSize: Typography.fontSizeXs,
    color: Colors.info,
    fontWeight: "700",
  },
  addBtn: {
    marginTop: Spacing.md,
  },
  formCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  formTitle: {
    fontSize: Typography.fontSizeLg,
    fontWeight: "700",
    color: Colors.textDark,
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: Typography.fontSizeSm,
    fontWeight: "500",
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  dropdown: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  dropdownText: {
    fontSize: Typography.fontSizeSm,
    color: Colors.textMuted,
  },
  input: {
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.fontSizeSm,
  },
  textArea: {
    height: 70,
    textAlignVertical: "top",
  },
  tagRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginVertical: Spacing.sm,
  },
  tagChoiceBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: "center",
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.inputBackground,
  },
  activeTagChoice: {
    backgroundColor: Colors.greenDark,
  },
  tagChoiceText: {
    fontSize: Typography.fontSizeSm,
    fontWeight: "500",
    color: Colors.textDark,
  },
  activeTagChoiceText: {
    color: Colors.textWhite,
    fontWeight: "700",
  },
  saveBtn: {
    marginTop: Spacing.xl,
  },
});
