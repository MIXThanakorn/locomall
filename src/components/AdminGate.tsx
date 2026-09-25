import { PropsWithChildren } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Colors } from "../constants/theme";
import { useAuth } from "../context/AuthContext";

export function AdminGate({ children }: PropsWithChildren) {
  const { loading, isAdmin } = useAuth();
  if (loading || isAdmin === null) return <View style={styles.center}><ActivityIndicator color={Colors.greenPrimary} /></View>;
  if (!isAdmin) return <View style={styles.center}><Text style={styles.denied}>บัญชีนี้ไม่มีสิทธิ์ผู้ดูแลระบบ</Text></View>;
  return children;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: Colors.background },
  denied: { fontFamily: "Kanit_700Bold", color: Colors.danger, textAlign: "center" },
});
