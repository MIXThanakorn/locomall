import { PropsWithChildren } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Colors } from "../constants/theme";

export function PermissionGate({ allow, loading, children }: PropsWithChildren<{ allow: boolean; loading: boolean }>) {
  if (loading) return <View style={styles.center}><ActivityIndicator color={Colors.greenPrimary} /></View>;
  if (!allow) return <View style={styles.center}><Text style={styles.title}>ไม่มีสิทธิ์เข้าถึงหน้านี้</Text><Text style={styles.body}>เมนูนี้เปิดให้เฉพาะผู้ดูแลที่เกี่ยวข้องเท่านั้น</Text></View>;
  return children;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: Colors.background },
  title: { fontFamily: "Kanit_700Bold", fontSize: 20, color: Colors.greenPrimary },
  body: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, textAlign: "center", marginTop: 6 },
});
