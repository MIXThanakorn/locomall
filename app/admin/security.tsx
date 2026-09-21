import { useEffect, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "../../src/components/Button";
import { PermissionGate } from "../../src/components/PermissionGate";
import { BorderRadius, Colors, Spacing } from "../../src/constants/theme";
import { useCapabilities } from "../../src/hooks/useCapabilities";
import { supabase } from "../../src/lib/supabase";

type Enrollment = { id: string; totp: { qr_code: string; secret: string; uri: string } };

export default function AdminSecurity() {
  const router = useRouter();
  const permissions = useCapabilities();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!permissions.isAdmin) return;
    Promise.all([supabase.auth.mfa.getAuthenticatorAssuranceLevel(), supabase.auth.mfa.listFactors()]).then(([level, factors]) => {
      if (level.data?.currentLevel === "aal2") { router.replace("/admin/markets" as never); return; }
      const verified = factors.data?.totp.find((factor) => factor.status === "verified");
      setFactorId(verified?.id ?? null); setReady(true);
    });
  }, [permissions.isAdmin, router]);

  const enroll = async () => {
    setLoading(true);
    const factors = await supabase.auth.mfa.listFactors();
    if (factors.error) {
      setLoading(false);
      return Alert.alert("ตรวจสอบ MFA ไม่สำเร็จ", factors.error.message);
    }
    for (const factor of factors.data.all.filter((item) => item.factor_type === "totp" && item.status === "unverified")) {
      const cleanup = await supabase.auth.mfa.unenroll({ factorId: factor.id });
      if (cleanup.error) {
        setLoading(false);
        return Alert.alert("เริ่มตั้งค่า MFA ใหม่ไม่สำเร็จ", cleanup.error.message);
      }
    }
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Locomall Admin" });
    setLoading(false);
    if (error) return Alert.alert("เปิด MFA ไม่สำเร็จ", error.message);
    setEnrollment(data as Enrollment); setFactorId(data.id);
  };

  const verify = async () => {
    if (!factorId || code.trim().length !== 6) return Alert.alert("กรอกรหัส 6 หลักจาก Authenticator");
    setLoading(true);
    const challenge = await supabase.auth.mfa.challenge({ factorId });
    if (challenge.error) { setLoading(false); return Alert.alert("สร้าง challenge ไม่สำเร็จ", challenge.error.message); }
    const result = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.data.id, code: code.trim() });
    setLoading(false);
    if (result.error) return Alert.alert("รหัสไม่ถูกต้อง", result.error.message);
    router.replace("/admin/markets" as never);
  };

  return <PermissionGate allow={permissions.isAdmin} loading={permissions.loading || (permissions.isAdmin && !ready)}>
    <ScrollView contentContainerStyle={styles.root}>
      <Text style={styles.title}>ความปลอดภัย Platform Admin</Text>
      <Text style={styles.body}>งานอนุมัติและ Admin override ต้องใช้ Authenticator MFA ทุก session</Text>
      {!factorId ? <Button title="เริ่มตั้งค่า Authenticator" onPress={enroll} loading={loading} /> : null}
      {enrollment ? <View style={styles.card}>
        <Text style={styles.label}>สแกน QR ด้วย Google Authenticator, 1Password หรือแอป TOTP</Text>
        <Image source={{ uri: enrollment.totp.qr_code }} style={styles.qr} />
        <Text selectable style={styles.secret}>Secret: {enrollment.totp.secret}</Text>
      </View> : null}
      {factorId ? <><TextInput style={styles.input} value={code} onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" placeholder="รหัส 6 หลัก" /><Button title="ยืนยัน MFA และเปิดหน้า Admin" onPress={verify} loading={loading} /></> : null}
    </ScrollView>
  </PermissionGate>;
}

const styles = StyleSheet.create({ root: { flexGrow: 1, padding: Spacing.lg, paddingTop: 60, backgroundColor: Colors.background }, title: { fontFamily: "Kanit_700Bold", fontSize: 24, color: Colors.greenPrimary }, body: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, marginBottom: 18 }, card: { backgroundColor: "white", borderRadius: BorderRadius.lg, padding: 16, alignItems: "center", marginBottom: 14 }, label: { fontFamily: "Kanit_500Medium", textAlign: "center" }, qr: { width: 220, height: 220, marginVertical: 12 }, secret: { fontFamily: "Kanit_400Regular", color: Colors.textMuted }, input: { backgroundColor: "white", borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: BorderRadius.md, padding: 14, fontFamily: "Kanit_700Bold", fontSize: 20, textAlign: "center", letterSpacing: 6, marginBottom: 12 } });
