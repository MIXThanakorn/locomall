import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { AppTextInput } from "../../src/components/AppTextInput";
import { KeyboardAwareScrollView } from "../../src/components/KeyboardAware";
import { useRouter } from "expo-router";
import { Button } from "../../src/components/Button";
import { HeaderGradient } from "../../src/components/HeaderGradient";
import { BorderRadius, Colors, Spacing } from "../../src/constants/theme";
import { translateAuthError } from "../../src/lib/authError";
import { passwordValidationError } from "../../src/lib/password";
import { supabase } from "../../src/lib/supabase";

export default function ChangePasswordScreen() {
  const router = useRouter(); const [password, setPassword] = useState(""); const [confirmation, setConfirmation] = useState(""); const [nonce, setNonce] = useState(""); const [nonceSent, setNonceSent] = useState(false); const [loading, setLoading] = useState(false);
  const requestNonce = async () => { setLoading(true); const { error } = await supabase.auth.reauthenticate(); setLoading(false); if (error) Alert.alert("ส่งรหัสไม่สำเร็จ", translateAuthError(error)); else { setNonceSent(true); Alert.alert("ตรวจสอบอีเมล", "กรอกรหัสยืนยันที่ได้รับก่อนเปลี่ยนรหัสผ่าน"); } };
  const update = async () => {
    const validation = passwordValidationError(password); if (validation) return Alert.alert("รหัสผ่านไม่ปลอดภัย", validation);
    if (password !== confirmation) return Alert.alert("รหัสผ่านไม่ตรงกัน");
    setLoading(true); const { error } = await supabase.auth.updateUser({ password, ...(nonce.trim() ? { nonce: nonce.trim() } : {}) }); setLoading(false);
    if (error) return Alert.alert("เปลี่ยนรหัสผ่านไม่สำเร็จ", translateAuthError(error));
    Alert.alert("สำเร็จ", "เปลี่ยนรหัสผ่านแล้ว", [{ text: "ตกลง", onPress: () => router.back() }]);
  };
  return <View style={styles.container}><HeaderGradient title="เปลี่ยนรหัสผ่าน" variant="white" showBack onBackPress={() => router.back()} style={styles.header} /><KeyboardAwareScrollView contentContainerStyle={styles.content}><Text style={styles.note}>ใช้รหัสผ่านอย่างน้อย 10 ตัว โดยมีตัวพิมพ์เล็ก ตัวพิมพ์ใหญ่ ตัวเลข และสัญลักษณ์ หากเข้าสู่ระบบไว้นานกว่า 24 ชั่วโมง ระบบอาจขอรหัสยืนยันเพิ่มเติม</Text><Text style={styles.label}>รหัสผ่านใหม่</Text><AppTextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry /><Text style={styles.label}>ยืนยันรหัสผ่าน</Text><AppTextInput style={styles.input} value={confirmation} onChangeText={setConfirmation} secureTextEntry />{nonceSent ? <><Text style={styles.label}>รหัสยืนยันจากอีเมล</Text><AppTextInput style={styles.input} value={nonce} onChangeText={setNonce} keyboardType="number-pad" /></> : <Button title="ขอรหัสยืนยันเพิ่มเติม" variant="outline" onPress={requestNonce} loading={loading} style={styles.secondary} />}<Button title="เปลี่ยนรหัสผ่าน" onPress={update} loading={loading} style={styles.button} /></KeyboardAwareScrollView></View>;
}
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: Colors.background }, header: { paddingTop: 54, paddingBottom: 20 }, content: { flex: 1, padding: Spacing.lg }, note: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, backgroundColor: Colors.inputBackground, borderRadius: BorderRadius.md, padding: 14 }, label: { fontFamily: "Kanit_500Medium", color: Colors.textMuted, marginTop: 14, marginBottom: 6 }, input: { backgroundColor: "white", borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: BorderRadius.md, padding: 14 }, secondary: { marginTop: 18 }, button: { backgroundColor: Colors.goldDeep, marginTop: 14 } });
