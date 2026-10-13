import { PropsWithChildren } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Colors } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { BackButton } from "./BackButton";
import { ScreenHeader } from "./ScreenHeader";

export function AdminGate({ children }: PropsWithChildren) {
  const { loading, isAdmin } = useAuth();
  if (loading || isAdmin === null) return <View style={styles.center}><BackButton floating /><ActivityIndicator color={Colors.greenPrimary} /></View>;
  if (!isAdmin) return <View style={{ flex: 1, backgroundColor: Colors.background }}><ScreenHeader contentInset={0} title="บัญชีนี้ไม่มีสิทธิ์ผู้ดูแลระบบ" titleStyle={styles.denied} /></View>;
  return children;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: Colors.background },
  denied: { fontFamily: "Kanit_700Bold", color: Colors.danger, textAlign: "center" },
});
