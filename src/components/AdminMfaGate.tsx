import { PropsWithChildren, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Colors } from "../constants/theme";
import { useCapabilities } from "../hooks/useCapabilities";
import { supabase } from "../lib/supabase";

export function AdminMfaGate({ children }: PropsWithChildren) {
  const router = useRouter();
  const permissions = useCapabilities();
  const [isAal2, setAal2] = useState<boolean | null>(null);

  useEffect(() => {
    if (!permissions.isAdmin) return;
    supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data }) => {
      const verified = data?.currentLevel === "aal2";
      setAal2(verified);
      if (!verified) router.replace("/admin/security" as never);
    });
  }, [permissions.isAdmin, router]);

  if (permissions.loading) return <View style={styles.center}><ActivityIndicator color={Colors.greenPrimary} /></View>;
  if (!permissions.isAdmin) return <View style={styles.center}><Text style={styles.title}>ไม่มีสิทธิ์ Platform Admin</Text></View>;
  if (isAal2 === null) return <View style={styles.center}><ActivityIndicator color={Colors.greenPrimary} /></View>;
  if (!isAal2) return <View style={styles.center}><Text style={styles.title}>กำลังเปิดหน้าการยืนยัน MFA…</Text></View>;
  return children;
}

const styles = StyleSheet.create({ center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.background, padding: 24 }, title: { fontFamily: "Kanit_700Bold", color: Colors.greenPrimary, textAlign: "center" } });
