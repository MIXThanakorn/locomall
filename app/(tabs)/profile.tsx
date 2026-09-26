import { Ionicons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Spacing } from "../../src/constants/theme";
import { useAuth } from "../../src/context/AuthContext";
import { supabase } from "../../src/lib/supabase";

type Action = { title: string; icon: keyof typeof Ionicons.glyphMap; route: string };

export default function Profile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, loading, signOut } = useAuth();
  const [profile, setProfile] = useState<any>();
  const [isAdmin, setAdmin] = useState(false);
  const [hasMarket, setHasMarket] = useState(false);

  useEffect(() => {
    if (!session) return;
    Promise.all([
      supabase.from("profiles").select("display_name,full_name,username,user_img_url").eq("user_id", session.user.id).single(),
      supabase.from("platform_roles").select("role").eq("user_id", session.user.id).maybeSingle(),
      supabase.from("markets").select("market_id").eq("owner_id", session.user.id).limit(1),
    ]).then(([profileResult, roleResult, marketResult]) => {
      setProfile(profileResult.data);
      setAdmin(roleResult.data?.role === "platform_admin");
      setHasMarket(Boolean(marketResult.data?.length));
    });
  }, [session]);

  const logout = () => Alert.alert(
    "ออกจากระบบ",
    "เมื่อออกจากระบบ คุณจะต้องเข้าสู่ระบบอีกครั้งเพื่อซื้อสินค้าและดูข้อมูลบัญชี",
    [
      { text: "ยกเลิก", style: "cancel" },
      { text: "ออกจากระบบ", style: "destructive", onPress: async () => {
        try { await signOut(); router.replace("/(auth)/sign-in" as never); }
        catch { Alert.alert("ออกจากระบบไม่สำเร็จ", "กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง"); }
      } },
    ],
  );

  const actions: Action[] = [
    { title: "แก้ไขโปรไฟล์", icon: "person-outline", route: "/profile/edit-profile" },
    { title: "พื้นที่หลัก", icon: "navigate-outline", route: "/profile/location" },
    { title: "ที่อยู่จัดส่ง", icon: "location-outline", route: "/profile/shipping-address" },
    { title: "เปลี่ยนรหัสผ่าน", icon: "lock-closed-outline", route: "/profile/change-password" },
    { title: "คู่มือการใช้งาน", icon: "help-circle-outline", route: "/guide" },
    { title: "งานขายสินค้าของฉัน", icon: "storefront-outline", route: "/seller/dashboard" },
    hasMarket
      ? { title: "จัดการตลาดชุมชน", icon: "business-outline", route: "/market/manage/home" }
      : { title: "ขอเปิดตลาดชุมชน", icon: "people-outline", route: "/market/create" },
  ];

  if (loading) return <View style={[styles.root, styles.center]}><ActivityIndicator color={Colors.greenPrimary} /></View>;
  if (!session) return <Redirect href="/(auth)/sign-in" />;

  return <View style={styles.root}>
    <View style={[styles.hero, { paddingTop: insets.top + 18 }]}>
      <View style={styles.avatar}><Ionicons name="person" size={34} color={Colors.greenPrimary} /></View>
      <Text style={styles.name}>{profile?.display_name || profile?.full_name || "ผู้ใช้ Locomall"}</Text>
      <Text style={styles.email}>{session.user.email}</Text>
      {hasMarket ? <Text style={styles.badge}>เจ้าของตลาดชุมชน · ซื้อสินค้าได้ตามปกติ</Text> : null}
    </View>
    <ScrollView contentContainerStyle={styles.content}>
      {actions.map((action) => <TouchableOpacity key={action.route} style={styles.row} onPress={() => router.push(action.route as never)}>
        <Ionicons name={action.icon} size={21} color={Colors.greenPrimary} />
        <Text style={styles.action}>{action.title}</Text>
        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
      </TouchableOpacity>)}
      {isAdmin ? <TouchableOpacity style={styles.row} onPress={() => router.push("/admin" as never)}>
        <Ionicons name="shield-checkmark-outline" size={21} color={Colors.goldDark} />
        <Text style={styles.action}>เปิดหน้าผู้ดูแลระบบ</Text>
        <Ionicons name="chevron-forward" size={18} />
      </TouchableOpacity> : null}
      <TouchableOpacity style={styles.logout} onPress={logout}><Text style={styles.logoutText}>ออกจากระบบ</Text></TouchableOpacity>
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  center: { alignItems: "center", justifyContent: "center" },
  hero: { backgroundColor: Colors.greenPrimary, padding: Spacing.lg, paddingBottom: 26, alignItems: "center", borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: "white", alignItems: "center", justifyContent: "center" },
  name: { fontFamily: "Kanit_700Bold", fontSize: 22, color: "white", marginTop: 10 },
  email: { fontFamily: "Kanit_400Regular", color: "#DDEBE2" },
  badge: { fontFamily: "Kanit_500Medium", color: Colors.greenDark, backgroundColor: Colors.goldPrimary, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 99, marginTop: 9 },
  content: { padding: Spacing.lg, paddingBottom: 80 },
  row: { padding: 16, backgroundColor: "white", borderRadius: 14, marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 12 },
  action: { fontFamily: "Kanit_500Medium", flex: 1, color: Colors.textDark },
  logout: { padding: 16, marginTop: 12 },
  logoutText: { fontFamily: "Kanit_500Medium", color: Colors.danger, textAlign: "center" },
});
