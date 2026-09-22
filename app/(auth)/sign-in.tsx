import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";
import { HeaderGradient } from "../../src/components/HeaderGradient";
import { Button } from "../../src/components/Button";
import { supabase } from "../../src/lib/supabase";
import { translateAuthError } from "../../src/lib/authError";

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const router = useRouter();
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
      const { makeRedirectUri } = require("expo-auth-session");
      const redirectUrl = makeRedirectUri({
        path: '/(auth)/sign-in'
      });
      
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const authUrl = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectUrl)}`;

      const res = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      if (res.type === 'success') {
        // Parse url to get the session from the hash
        const urlObj = new URL(res.url);
        const hashParams = new URLSearchParams(urlObj.hash.substring(1));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;
          router.replace("/" as any);
        } else {
          // Check if there's an error in URL
          const errorDesc = hashParams.get("error_description");
          if (errorDesc) throw new Error(errorDesc);
        }
      }
    } catch (error: any) {
      Alert.alert("เข้าสู่ระบบด้วย Google ไม่สำเร็จ", translateAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <HeaderGradient
        title="สวัสดี!"
        subtitle="ยินดีต้อนรับสู่ Locomall"
        variant="gold"
        style={styles.header}
      />

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}>
        <View style={styles.card}>
          <Text style={styles.inputLabel}>อีเมล</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="name@example.com"
          />

          <Text style={styles.inputLabel}>รหัสผ่าน</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
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
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
});
