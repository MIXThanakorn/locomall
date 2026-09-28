import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius, Shadows } from "../../src/constants/theme";
import { HeaderGradient } from "../../src/components/HeaderGradient";
import { Button } from "../../src/components/Button";

export default function SuccessPasswordScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <HeaderGradient
        title=""
        variant="green"
        showBack
        onBackPress={() => router.replace("/(auth)/sign-in" as any)}
        style={styles.header}
      />

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>เปลี่ยนรหัสผ่านแล้ว</Text>
          <Text style={styles.subtitle}>
            ตั้งรหัสผ่านใหม่สำเร็จแล้ว คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้ทันที
          </Text>

          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={54} color="#06B6D4" />
          </View>

          <Button
            title="กลับไปหน้าเข้าสู่ระบบ"
            variant="green"
            size="lg"
            style={styles.backBtn}
            textStyle={{ color: Colors.textWhite }}
            onPress={() => router.replace("/(auth)/sign-in" as any)}
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
    paddingBottom: 60,
  },
  content: {
    flex: 1,
    marginTop: -40,
    paddingHorizontal: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: "center",
    ...Shadows.card,
  },
  title: {
    fontSize: Typography.fontSizeXl,
    fontWeight: "700",
    color: Colors.greenDark,
    marginTop: Spacing.md,
  },
  subtitle: {
    fontSize: Typography.fontSizeSm,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  checkCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    borderColor: "#06B6D4",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: Spacing.xl,
  },
  backBtn: {
    width: "100%",
    backgroundColor: Colors.greenDark,
    marginTop: Spacing.xl,
  },
});
