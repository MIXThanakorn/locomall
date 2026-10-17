import { useResponsiveStyles } from "../../src/hooks/useResponsiveStyles";
import { ScreenHeader } from "../../src/components/ScreenHeader";
import { BackButton } from "../../src/components/BackButton";
import { Redirect, useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { AppTextInput } from "../../src/components/AppTextInput";
import { Button } from "../../src/components/Button";
import { KeyboardAwareScrollView } from "../../src/components/KeyboardAware";
import { BorderRadius, Colors, Spacing } from "../../src/constants/theme";
import { useAuth } from "../../src/context/AuthContext";
import { translateDatabaseError } from "../../src/lib/databaseError";
import { mobilePhoneError, normalizeMobilePhone } from "../../src/lib/fieldValidation";
import { supabase } from "../../src/lib/supabase";

export default function PhoneOnboarding() {
  const styles = useResponsiveStyles(baseStyles, {});
  const router = useRouter();
  const { session, loading, hasPhone, refreshPhone, signOut, savedAccounts } = useAuth();
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  if (loading || (session && hasPhone === null)) return <View style={styles.center}><BackButton floating /><ActivityIndicator color={Colors.greenPrimary} /></View>;
  if (!session) return <Redirect href="/(auth)/sign-in" />;
  if (hasPhone) return <Redirect href="/" />;

  const save = async () => {
    const error = mobilePhoneError(phone);
    if (error) return Alert.alert("เบอร์มือถือไม่ถูกต้อง", error);
    setSaving(true);
    try {
      const { error: updateError } = await supabase.from("profiles")
        .update({ phone_num: phone })
        .eq("user_id", session.user.id)
        .select("user_id")
        .single();
      if (updateError) throw updateError;
      if (!await refreshPhone()) throw new Error("บันทึกเบอร์แล้วแต่ยืนยันข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      router.replace("/");
    } catch (caught) {
      Alert.alert("บันทึกเบอร์ไม่สำเร็จ", translateDatabaseError(caught instanceof Error ? caught : null));
    } finally {
      setSaving(false);
    }
  };

  return <KeyboardAwareScrollView style={styles.root} contentContainerStyle={styles.content}>
    <ScreenHeader title={"ยืนยันข้อมูลติดต่อ"} titleStyle={styles.title} />
    <Text style={styles.description}>กรุณาเพิ่มเบอร์มือถือก่อนใช้งาน Locomall เพื่อให้ติดต่อเกี่ยวกับคำสั่งซื้อและการรับสินค้าได้ บัญชีที่เคยสมัครผ่าน Google หรือมีเบอร์ไม่ครบสามารถกรอกที่นี่ได้</Text>
    <Text style={styles.label}>เบอร์มือถือ *</Text>
    <AppTextInput value={phone} onChangeText={(value) => setPhone(normalizeMobilePhone(value))} keyboardType="phone-pad" autoComplete="tel" maxLength={10} placeholder="เช่น 0812345678" style={styles.input} />
    <Text style={styles.hint}>ต้องเป็นตัวเลข 10 หลักและขึ้นต้นด้วย 0</Text>
    <Button title="บันทึกและใช้งานต่อ" onPress={() => void save()} loading={saving} />
    {savedAccounts.length > 1 ? <Button title="เลือกบัญชีอื่น" variant="outline" onPress={() => router.replace("/(auth)/switch-account" as never)} style={styles.secondary} /> : null}
    <Button title="ออกจากระบบ" variant="outline" onPress={() => { void signOut().then(() => router.replace("/(auth)/sign-in" as never)).catch(() => Alert.alert("ออกจากระบบไม่สำเร็จ", "กรุณาลองใหม่อีกครั้ง")); }} style={styles.secondary} />
  </KeyboardAwareScrollView>;
}

const baseStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.background },
  content: { flexGrow: 1, padding: Spacing.lg, paddingTop: 0, paddingBottom: 80 },
  title: { fontFamily: "Kanit_700Bold", fontSize: 28, color: Colors.greenPrimary, marginBottom: 12 },
  description: { fontFamily: "Kanit_400Regular", color: Colors.textMedium, marginBottom: 24 },
  label: { fontFamily: "Kanit_500Medium", color: Colors.textDark, marginBottom: 8 },
  input: { minHeight: 54, backgroundColor: "white", borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: BorderRadius.md, padding: 14 },
  hint: { fontFamily: "Kanit_400Regular", fontSize: 12, color: Colors.textMuted, marginBottom: 20, marginTop: 7 },
  secondary: { marginTop: 12 },
});
