import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "../../src/components/KeyboardAware";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { Button } from "../../src/components/Button";
import { HeaderGradient } from "../../src/components/HeaderGradient";
import { BorderRadius, Colors, Spacing } from "../../src/constants/theme";
import { passwordValidationError } from "../../src/lib/password";
import { supabase } from "../../src/lib/supabase";
import { translateAuthError } from "../../src/lib/authError";

async function acceptRecoveryUrl(url: string | null) {
  if (!url) return;
  const parsed = new URL(url);
  const code = parsed.searchParams.get("code");
  if (code) { await supabase.auth.exchangeCodeForSession(code); return; }
  const hash = new URLSearchParams(parsed.hash.replace(/^#/, ""));
  const accessToken = hash.get("access_token"); const refreshToken = hash.get("refresh_token");
  if (accessToken && refreshToken) await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
}

export default function NewPasswordScreen() {
  const router = useRouter(); const [password, setPassword] = useState(""); const [confirmation, setConfirmation] = useState(""); const [loading, setLoading] = useState(false);
  useEffect(() => { void Linking.getInitialURL().then(acceptRecoveryUrl); const subscription = Linking.addEventListener("url", ({ url }) => { void acceptRecoveryUrl(url); }); return () => subscription.remove(); }, []);
  const update = async () => {
    const validation = passwordValidationError(password); if (validation) return Alert.alert("รหัสผ่านไม่ปลอดภัย", validation);
    if (password !== confirmation) return Alert.alert("รหัสผ่านไม่ตรงกัน");
    setLoading(true); const { error } = await supabase.auth.updateUser({ password }); setLoading(false);
    if (error) return Alert.alert("เปลี่ยนรหัสผ่านไม่สำเร็จ", translateAuthError(error));
    router.replace("/(auth)/success-password" as never);
  };
  return <View style={styles.container}><HeaderGradient title="สร้างรหัสผ่านใหม่" subtitle="อย่างน้อย 10 ตัว พร้อมตัวพิมพ์เล็ก/ใหญ่ ตัวเลข และสัญลักษณ์" variant="gold" showBack onBackPress={() => router.back()} style={styles.header} /><KeyboardAwareScrollView contentContainerStyle={styles.content}><View style={styles.card}><Text style={styles.label}>รหัสผ่านใหม่</Text><TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry /><Text style={styles.label}>ยืนยันรหัสผ่าน</Text><TextInput style={styles.input} value={confirmation} onChangeText={setConfirmation} secureTextEntry /><Button title="บันทึกรหัสผ่านใหม่" onPress={update} loading={loading} style={styles.button} /></View></KeyboardAwareScrollView></View>;
}
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: Colors.background }, header: { paddingTop: 50, paddingBottom: 40 }, content: { flex: 1, marginTop: -20, paddingHorizontal: Spacing.lg }, card: { backgroundColor: "white", borderRadius: BorderRadius.xl, padding: Spacing.xl }, label: { fontFamily: "Kanit_500Medium", color: Colors.textMuted, marginTop: 12, marginBottom: 6 }, input: { backgroundColor: Colors.inputBackground, borderRadius: BorderRadius.md, padding: 14, fontFamily: "Kanit_400Regular" }, button: { backgroundColor: Colors.greenDark, marginTop: 24 } });
