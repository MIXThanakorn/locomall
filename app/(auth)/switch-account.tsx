import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Spacing } from "../../src/constants/theme";
import { useAuth } from "../../src/context/AuthContext";

export default function SwitchAccount() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, savedAccounts, refreshSavedAccounts, switchAccount } = useAuth();
  const [busyId, setBusyId] = useState<string | null>(null);

  useFocusEffect(useCallback(() => { void refreshSavedAccounts().catch(() => undefined); }, [refreshSavedAccounts]));

  const select = async (id: string) => {
    if (busyId) return;
    if (session?.user.id === id) { router.replace("/" as never); return; }
    setBusyId(id);
    try {
      await switchAccount(id);
      router.replace("/" as never);
    } catch (error) {
      Alert.alert("สลับบัญชีไม่สำเร็จ", error instanceof Error ? error.message : "กรุณาลองใหม่หรือเข้าสู่ระบบอีกครั้ง");
    } finally {
      setBusyId(null);
    }
  };

  return <View style={[styles.root, { paddingTop: insets.top + 18 }]}>
    <TouchableOpacity style={styles.back} onPress={() => router.back()} accessibilityLabel="กลับ"><Ionicons name="arrow-back" size={24} color={Colors.greenPrimary} /></TouchableOpacity>
    <Text style={styles.title}>สลับบัญชี</Text>
    <Text style={styles.subtitle}>เลือกบัญชีที่เคยเข้าสู่ระบบบนเครื่องนี้</Text>
    <ScrollView contentContainerStyle={styles.content}>
      {Platform.OS === "web" ? <Text style={styles.note}>การสลับบัญชีแบบแตะครั้งเดียวใช้ได้ในแอป Android และ iOS เท่านั้น</Text> : null}
      {savedAccounts.map((account) => {
        const active = session?.user.id === account.id;
        return <TouchableOpacity key={account.id} style={styles.account} disabled={Boolean(busyId)} onPress={() => void select(account.id)}>
          <View style={styles.avatar}><Ionicons name="person" size={24} color={Colors.greenPrimary} /></View>
          <View style={styles.accountText}><Text style={styles.email} numberOfLines={1}>{account.email}</Text><Text style={styles.note}>{active ? "กำลังใช้งาน" : "แตะเพื่อสลับบัญชี"}</Text></View>
          {busyId === account.id ? <ActivityIndicator color={Colors.greenPrimary} /> : <Ionicons name={active ? "checkmark-circle" : "chevron-forward"} size={22} color={Colors.greenPrimary} />}
        </TouchableOpacity>;
      })}
      <TouchableOpacity style={styles.add} disabled={Boolean(busyId)} onPress={() => router.push("/(auth)/sign-in" as never)}>
        <Ionicons name="add-circle-outline" size={23} color={Colors.greenPrimary} /><Text style={styles.addText}>เพิ่มบัญชีอื่น</Text>
      </TouchableOpacity>
      <Text style={styles.note}>บัญชีที่เคยใช้จะอยู่บนเครื่องนี้เท่านั้น ปุ่ม “ออกจากระบบ” จะนำบัญชีปัจจุบันออกจากรายการสลับบัญชี</Text>
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: Spacing.lg },
  back: { alignSelf: "flex-start", padding: 8 },
  title: { fontFamily: "Kanit_700Bold", fontSize: 28, color: Colors.greenPrimary, marginTop: 10 },
  subtitle: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, marginBottom: 18 },
  content: { paddingBottom: 48, gap: 10 },
  account: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 16, backgroundColor: "white", gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#E8F2EB", justifyContent: "center", alignItems: "center" },
  accountText: { flex: 1 },
  email: { fontFamily: "Kanit_500Medium", color: Colors.textDark, fontSize: 16 },
  note: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, fontSize: 13 },
  add: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 16, borderRadius: 16, borderWidth: 1, borderColor: Colors.greenPrimary, gap: 8 },
  addText: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary },
});
