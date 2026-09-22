import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";
import { HeaderGradient } from "../../src/components/HeaderGradient";
import { Button } from "../../src/components/Button";

export default function OTPScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <HeaderGradient
        title="กรอกรหัสยืนยัน"
        subtitle="กรุณากรอกรหัส 6 หลักที่ส่งไปยังหมายเลขโทรศัพท์ของคุณ"
        variant="gold"
        showBack
        onBackPress={() => router.back()}
        style={styles.header}
      />

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.otpRow}>
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <View key={index} style={styles.otpBox}>
                <View style={styles.otpDot} />
              </View>
            ))}
          </View>

          <Button
            title="ยืนยัน"
            variant="green"
            size="lg"
            style={styles.submitBtn}
            onPress={() => router.push("/(auth)/new-password" as any)}
          />

          <View style={styles.resendRow}>
            <Text style={styles.resendText}>ยังไม่ได้รับรหัส? </Text>
            <TouchableOpacity onPress={() => {}}>
              <Text style={styles.resendLink}>ส่งอีกครั้ง</Text>
            </TouchableOpacity>
          </View>
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
    alignItems: "center",
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  otpRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginVertical: Spacing.xl,
  },
  otpBox: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.inputBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  otpDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.textMuted,
  },
  submitBtn: {
    width: "100%",
    backgroundColor: Colors.greenDark,
    marginTop: Spacing.md,
  },
  resendRow: {
    flexDirection: "row",
    marginTop: Spacing.lg,
  },
  resendText: {
    fontSize: Typography.fontSizeSm,
    color: Colors.textMuted,
  },
  resendLink: {
    fontSize: Typography.fontSizeSm,
    color: Colors.goldDark,
    fontWeight: "700",
  },
});
