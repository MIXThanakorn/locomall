import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { AppTextInput } from "../../src/components/AppTextInput";
import { KeyboardAwareScrollView } from "../../src/components/KeyboardAware";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { makeRedirectUri } from "expo-auth-session";
import { acceptRecoveryCallback } from "../../src/lib/authRecovery";
import { useAuth } from "../../src/context/AuthContext";
import { Button } from "../../src/components/Button";
import { HeaderGradient } from "../../src/components/HeaderGradient";
import { BorderRadius, Colors, Spacing } from "../../src/constants/theme";
import { passwordValidationError } from "../../src/lib/password";
import { supabase } from "../../src/lib/supabase";
import { translateAuthError } from "../../src/lib/authError";

export default function NewPasswordScreen() {
  const router = useRouter(); const [password, setPassword] = useState(""); const [confirmation, setConfirmation] = useState(""); const [loading, setLoading] = useState(false);
  const { session } = useAuth();
  const [verifiedUser, setVerifiedUser] = useState<string | null>(null);
  const [linkError, setLinkError] = useState("กำลังตรวจสอบลิงก์กู้รหัสผ่าน…");
  useEffect(() => {
    let active = true;
    const accept = async (url: string | null) => {
      if (!url) { if (active) setLinkError("กรุณาเปิดลิงก์กู้รหัสผ่านที่ขอบนเครื่องนี้"); return; }
      try {
        const userId = await acceptRecoveryCallback(url, makeRedirectUri({ scheme: "locomall", path: "new-password" }));
        if (active) { setVerifiedUser(userId); setLinkError(""); }
      } catch { if (active) { setVerifiedUser(null); setLinkError("ลิงก์กู้รหัสผ่านใช้ไม่ได้ กรุณาขอลิงก์ใหม่บนเครื่องนี้"); } }
    };
    void Linking.getInitialURL().then(accept).catch(() => { if (active) setLinkError("เปิดลิงก์ไม่สำเร็จ กรุณาลองใหม่"); });
    const subscription = Linking.addEventListener("url", ({ url }) => { void accept(url); });
    return () => { active = false; subscription.remove(); };
  }, []);
  if (!verifiedUser || session?.user.id !== verifiedUser) return <View style={[styles.container, { padding: 24, justifyContent: "center" }]}><Text accessibilityRole="alert">{linkError || "กรุณาขอลิงก์กู้รหัสผ่านใหม่"}</Text><Button title="ขอลิงก์ใหม่" onPress={() => router.replace("/(auth)/recover-password" as never)} /></View>;
  const update = async () => {
    if (!verifiedUser || session?.user.id !== verifiedUser || loading) return Alert.alert("กรุณายืนยันลิงก์กู้รหัสผ่านอีกครั้ง");
    const validation = passwordValidationError(password); if (validation) return Alert.alert("รหัสผ่านไม่ปลอดภัย", validation);
    if (password !== confirmation) return Alert.alert("รหัสผ่านไม่ตรงกัน");
    setLoading(true); const { error } = await supabase.auth.updateUser({ password }); setLoading(false);
    if (error) return Alert.alert("เปลี่ยนรหัสผ่านไม่สำเร็จ", translateAuthError(error));
    setVerifiedUser(null); router.replace("/(auth)/success-password" as never);
  };
  return <View style={styles.container}><HeaderGradient title="สร้างรหัสผ่านใหม่" subtitle="อย่างน้อย 10 ตัว พร้อมตัวพิมพ์เล็ก/ใหญ่ ตัวเลข และสัญลักษณ์" variant="gold" showBack onBackPress={() => router.back()} style={styles.header} /><KeyboardAwareScrollView contentContainerStyle={styles.content}><View style={styles.card}><Text style={styles.label}>รหัสผ่านใหม่</Text><AppTextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry /><Text style={styles.label}>ยืนยันรหัสผ่าน</Text><AppTextInput style={styles.input} value={confirmation} onChangeText={setConfirmation} secureTextEntry /><Button title="บันทึกรหัสผ่านใหม่" onPress={update} loading={loading} style={styles.button} /></View></KeyboardAwareScrollView></View>;
}
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: Colors.background }, header: { paddingTop: 50, paddingBottom: 40 }, content: { flex: 1, marginTop: -20, paddingHorizontal: Spacing.lg }, card: { backgroundColor: "white", borderRadius: BorderRadius.xl, padding: Spacing.xl }, label: { fontFamily: "Kanit_500Medium", color: Colors.textMuted, marginTop: 12, marginBottom: 6 }, input: { backgroundColor: Colors.inputBackground, borderRadius: BorderRadius.md, padding: 14, fontFamily: "Kanit_400Regular" }, button: { backgroundColor: Colors.greenDark, marginTop: 24 } });
