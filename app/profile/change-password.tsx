import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";
import { HeaderGradient } from "../../src/components/HeaderGradient";
import { Button } from "../../src/components/Button";

export default function ChangePasswordScreen() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("********");
  const [newPassword, setNewPassword] = useState("********");
  const [confirmPassword, setConfirmPassword] = useState("********");

  return (
    <View style={styles.container}>
      <HeaderGradient
        title="Change Password"
        variant="white"
        showBack
        onBackPress={() => router.back()}
        style={styles.header}
      />

      <View style={styles.content}>
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Security Update</Text>
          <Text style={styles.infoDesc}>
            Your new password must be at least 8 characters long and include a mix of letters, numbers, and symbols.
          </Text>
        </View>

        <Text style={styles.inputLabel}>Current Password</Text>
        <TextInput style={styles.input} value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />

        <Text style={styles.inputLabel}>New Password</Text>
        <TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} secureTextEntry />

        <Text style={styles.inputLabel}>Confirm New Password</Text>
        <TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />

        <Button
          title="Update Password"
          variant="gold"
          size="lg"
          style={styles.updateBtn}
          textStyle={{ color: Colors.textWhite }}
          onPress={() => router.back()}
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
  infoBox: {
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  infoTitle: {
    fontSize: Typography.fontSizeMd,
    fontWeight: "700",
    color: Colors.textDark,
  },
  infoDesc: {
    fontSize: Typography.fontSizeXs,
    color: Colors.textMuted,
    marginTop: 4,
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: Typography.fontSizeSm,
    fontWeight: "500",
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  input: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.fontSizeMd,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  updateBtn: {
    backgroundColor: Colors.goldDeep,
    marginTop: Spacing.xxl,
  },
});
