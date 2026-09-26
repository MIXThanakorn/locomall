import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "../../src/components/KeyboardAware";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { Button } from "../../src/components/Button";
import { HeaderGradient } from "../../src/components/HeaderGradient";
import { BorderRadius, Colors, Spacing, Typography } from "../../src/constants/theme";
import { supabase } from "../../src/lib/supabase";
import { translateAuthError } from "../../src/lib/authError";

export default function RecoverPasswordScreen() {
  const router = useRouter(); const [email, setEmail] = useState(""); const [loading, setLoading] = useState(false);
  const recover = async () => {
    if (!email.trim()) return Alert.alert("กรุณากรอกอีเมล");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: Linking.createURL("/(auth)/new-password") });
    setLoading(false);
    if (error) return Alert.alert("ส่งอีเมลไม่สำเร็จ", translateAuthError(error));
    Alert.alert("ตรวจสอบอีเมล", "เราได้ส่งลิงก์ตั้งรหัสผ่านใหม่แล้ว", [{ text: "ตกลง", onPress: () => router.back() }]);
  };
  return <View style={styles.container}><HeaderGradient title="กู้คืนรหัสผ่าน" subtitle="ระบบจะส่งลิงก์ตั้งรหัสผ่านใหม่ไปยังอีเมลของคุณ" variant="gold" showBack onBackPress={() => router.back()} style={styles.header} /><KeyboardAwareScrollView contentContainerStyle={styles.content}><View style={styles.card}><Text style={styles.label}>อีเมล</Text><TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="name@example.com" /><Button title="ส่งลิงก์กู้คืนรหัสผ่าน" onPress={recover} loading={loading} style={styles.button} /></View></KeyboardAwareScrollView></View>;
}
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: Colors.background }, header: { paddingTop: 50, paddingBottom: 40 }, content: { flex: 1, marginTop: -20, paddingHorizontal: Spacing.lg }, card: { backgroundColor: Colors.cardBackground, borderRadius: BorderRadius.xl, padding: Spacing.xl }, label: { fontSize: Typography.fontSizeSm, fontFamily: "Kanit_500Medium", color: Colors.textMuted, marginBottom: 6 }, input: { backgroundColor: Colors.inputBackground, borderRadius: BorderRadius.md, padding: Spacing.md, fontFamily: "Kanit_400Regular" }, button: { backgroundColor: Colors.greenDark, marginTop: Spacing.xl } });
