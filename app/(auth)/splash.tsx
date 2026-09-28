import React from "react";
import { Image, View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Typography, Spacing } from "../../src/constants/theme";
import { Button } from "../../src/components/Button";

export default function SplashScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.content}>
        <Image
          source={require("../../assets/images/APP_LOGO.png")}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="โลโก้ Locomall"
        />

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
  logo: {
    width: 240,
    height: 248,
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
