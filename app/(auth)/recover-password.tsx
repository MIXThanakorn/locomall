import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";
import { HeaderGradient } from "../../src/components/HeaderGradient";
import { Button } from "../../src/components/Button";

export default function RecoverPasswordScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState("087*******");
  const [email, setEmail] = useState("Hello@gmail.com");

  return (
    <View style={styles.container}>
      <HeaderGradient
        title="Recover Your Password"
        subtitle="Select credentials which should we use to recover your password"
        variant="gold"
        showBack
        onBackPress={() => router.back()}
        style={styles.header}
      />

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.inputLabel}>Phone number</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

          <Text style={styles.inputLabel}>Email</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" />

          <Button
            title="Recover Password"
            variant="green"
            size="lg"
            style={styles.recoverBtn}
            onPress={() => router.push("/(auth)/otp" as any)}
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
