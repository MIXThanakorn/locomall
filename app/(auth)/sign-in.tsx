import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { AppTextInput } from "../../src/components/AppTextInput";
import { KeyboardAwareScrollView } from "../../src/components/KeyboardAware";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { Colors, Typography, Spacing, BorderRadius, Shadows } from "../../src/constants/theme";
import { HeaderGradient } from "../../src/components/HeaderGradient";
import { Button } from "../../src/components/Button";
import { supabase } from "../../src/lib/supabase";
import { translateAuthError } from "../../src/lib/authError";
import { GOOGLE_OAUTH_CALLBACK_PATH, parseGoogleOAuthCallback, withGoogleOAuthTimeout } from "../../src/lib/googleOAuth";
import { useAuth } from "../../src/context/AuthContext";

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const router = useRouter();
  const { savedAccounts } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert("กรอกข้อมูลไม่ครบ", "กรุณากรอกอีเมลและรหัสผ่าน");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      Alert.alert("เข้าสู่ระบบไม่สำเร็จ", translateAuthError(error));
    } else {
      router.replace("/" as any);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      // Route groups are not part of a native deep link. In the APK this is
      // locomall://sign-in; it must also be allowlisted in Supabase Auth.
      const redirectUrl = makeRedirectUri({ scheme: "locomall", path: GOOGLE_OAUTH_CALLBACK_PATH });
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
      });
      if (error) throw error;
      if (!data.url) throw new Error("ไม่สามารถเปิดหน้าเข้าสู่ระบบ Google ได้");

      const result = await withGoogleOAuthTimeout(WebBrowser.openAuthSessionAsync(data.url, redirectUrl));
      if (result.type === "cancel" || result.type === "dismiss") return;
      if (result.type !== "success") throw new Error("Google ไม่ส่งผลการเข้าสู่ระบบกลับมาที่แอป");

      const callback = parseGoogleOAuthCallback(result.url, redirectUrl);
      const sessionResult = await supabase.auth.exchangeCodeForSession(callback.code);
      if (sessionResult.error) throw sessionResult.error;
      if (!sessionResult.data.session) throw new Error("ไม่สามารถบันทึกการเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง");
      router.replace("/" as any);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "";
      Alert.alert("เข้าสู่ระบบด้วย Google ไม่สำเร็จ", message || translateAuthError(null));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <HeaderGradient
        title="สวัสดี!"
        subtitle="ยินดีต้อนรับสู่ Locomall"
        variant="gold"
        style={styles.header}
      />

      <KeyboardAwareScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.inputLabel}>อีเมล</Text>
          <AppTextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoComplete="email"
            autoCapitalize="none"
            placeholder="name@example.com"
          />

          <Text style={styles.inputLabel}>รหัสผ่าน</Text>
          <View style={styles.passwordContainer}>
            <AppTextInput
              style={styles.passwordInput}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="current-password"
              placeholder="กรอกรหัสผ่าน"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={Colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={() => router.push("/(auth)/recover-password" as any)}
          >
            <Text style={styles.forgotText}>ลืมรหัสผ่าน?</Text>
          </TouchableOpacity>

          <Button
            title="เข้าสู่ระบบ"
            variant="gold"
            size="lg"
            style={styles.signInBtn}
            textStyle={{ color: Colors.textWhite }}
            loading={loading}
            onPress={handleSignIn}
          />

          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>หรือ</Text>
            <View style={styles.divider} />
          </View>

          <Button
            title="เข้าสู่ระบบด้วย Google"
            variant="white"
            size="lg"
            style={styles.googleBtn}
            icon={<Ionicons name="logo-google" size={20} color={Colors.textDark} />}
            textStyle={{ color: Colors.textDark }}
            loading={loading}
            onPress={handleGoogleSignIn}
          />

          <Button
            title="ยังไม่มีบัญชี? สมัครสมาชิก"
            variant="outline"
            size="lg"
            style={styles.signUpBtn}
            onPress={() => router.push("/(auth)/sign-up" as any)}
          />
          {savedAccounts.length > 0 ? <TouchableOpacity style={styles.savedAccounts} onPress={() => router.push("/(auth)/switch-account" as any)}>
            <Text style={styles.savedAccountsText}>เลือกบัญชีที่เคยใช้บนเครื่องนี้</Text>
          </TouchableOpacity> : null}
        </View>
      </KeyboardAwareScrollView>
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
    paddingBottom: 40,
  },
  content: {
    flex: 1,
    marginTop: -20,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    ...Shadows.card,
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
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontSize: Typography.fontSizeMd,
    color: Colors.textDark,
  },
  forgotBtn: {
    alignSelf: "flex-end",
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  forgotText: {
    fontSize: Typography.fontSizeSm,
    color: Colors.goldDark,
    fontWeight: "500",
  },
  signInBtn: {
    backgroundColor: Colors.goldDeep,
    marginBottom: Spacing.md,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: Spacing.md,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.divider,
  },
  dividerText: {
    marginHorizontal: Spacing.md,
    color: Colors.textMuted,
    fontSize: Typography.fontSizeSm,
    fontWeight: "500",
  },
  googleBtn: {
    backgroundColor: Colors.cardBackground,
    borderColor: Colors.divider,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  signUpBtn: {
    borderColor: Colors.goldDeep,
  },
  savedAccounts: { marginTop: Spacing.lg, alignItems: "center" },
  savedAccountsText: { color: Colors.greenPrimary, fontFamily: "Kanit_500Medium" },
});
