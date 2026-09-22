import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";
import { Button } from "../../src/components/Button";

export default function SplashScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.content}>
        {/* Emblem / Logo Circle matching Figma */}
        <View style={styles.logoCircle}>
          <View style={styles.iconContainer}>
            <Ionicons name="bag-handle" size={48} color={Colors.greenPrimary} />
            <Feather name="feather" size={24} color={Colors.goldDark} style={styles.leafBadge} />
          </View>
          <Text style={styles.logoTitle}>LOCOMALL</Text>
          <Text style={styles.logoSubtitle}>ตลาดออนไลน์ของชุมชน</Text>
        </View>

        <Text style={styles.tagline}>
          ซื้อสินค้าชุมชนใกล้ตัว ส่งตรงจากผู้ขายในพื้นที่
        </Text>
      </View>

      <View style={styles.footer}>
        <Button
          title="เข้าสู่ระบบ"
          variant="white"
          size="lg"
          style={styles.btn}
          textStyle={{ color: Colors.textDark }}
          onPress={() => router.push("/(auth)/sign-in" as any)}
        />
        <Button
          title="สมัครสมาชิก"
          variant="outline"
          size="lg"
          style={styles.btnOutline}
          textStyle={{ color: Colors.textDark }}
          onPress={() => router.push("/(auth)/sign-up" as any)}
        />
        <Button
          title="เลือกดูตลาดโดยยังไม่เข้าสู่ระบบ"
          variant="ghost"
          size="md"
          textStyle={{ color: Colors.textDark }}
          onPress={() => router.replace("/(tabs)" as any)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.goldPrimary,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  logoCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.cardBackground,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: Colors.greenPrimary,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  iconContainer: {
    position: "relative",
    marginBottom: Spacing.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  leafBadge: {
    position: "absolute",
    top: -4,
    right: -10,
  },
  logoTitle: {
    fontSize: Typography.fontSizeXl,
    fontWeight: "700",
    color: Colors.greenDark,
    letterSpacing: 2,
  },
  logoSubtitle: {
    fontSize: Typography.fontSizeXs,
    fontWeight: "500",
    color: Colors.textMuted,
    marginTop: 2,
  },
  tagline: {
    fontSize: Typography.fontSizeMd,
    fontWeight: "500",
    color: Colors.textDark,
    textAlign: "center",
    marginTop: Spacing.xl,
    opacity: 0.9,
    paddingHorizontal: Spacing.md,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  btn: {
    backgroundColor: Colors.cardBackground,
  },
  btnOutline: {
    backgroundColor: "transparent",
    borderColor: Colors.textDark,
    borderWidth: 1.5,
  },
});
