import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";
import { HeaderGradient } from "../../src/components/HeaderGradient";
import { Button } from "../../src/components/Button";

export default function NewPasswordScreen() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("Abcdefghjklmn123456");
  const [confirmPassword, setConfirmPassword] = useState("Abcdefghjklmn123456");

  return (
    <View style={styles.container}>
      <HeaderGradient
        title="Create new password"
        subtitle="Create a new password and please never share it with anyone for safe use."
        variant="gold"
        showBack
        onBackPress={() => router.back()}
        style={styles.header}
      />

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.inputLabel}>New Password</Text>
          <TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} secureTextEntry />

          <Text style={styles.inputLabel}>Confirm Password</Text>
          <TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />

          <Button
            title="Recover Password"
            variant="green"
            size="lg"
            style={styles.recoverBtn}
            onPress={() => router.push("/(auth)/success-password" as any)}
          />
        </View>
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
    paddingTop: 50,
    paddingBottom: 40,
  },
  content: {
    flex: 1,
    marginTop: -20,
    paddingHorizontal: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  inputLabel: {
    fontSize: Typography.fontSizeSm,
    fontWeight: "500",
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  input: {
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.fontSizeMd,
    color: Colors.textDark,
  },
  recoverBtn: {
    backgroundColor: Colors.greenDark,
    marginTop: Spacing.xxl,
  },
});
