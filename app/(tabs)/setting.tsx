import { useResponsiveStyles } from "../../src/hooks/useResponsiveStyles";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, Linking, Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Spacing } from "../../src/constants/theme";
import { useAuth } from "../../src/context/AuthContext";
import { useCapabilities } from "../../src/hooks/useCapabilities";
import { getSettingsGroups, SettingsAction } from "../../src/lib/settingsMenu";
import { supabase } from "../../src/lib/supabase";

export default function Settings() {
  const styles = useResponsiveStyles(baseStyles, {});
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, loading, signOut } = useAuth();
  const userId = session?.user.id;
  const [profileResult, setProfileResult] = useState<{ userId: string; profile: { display_name: string | null; full_name: string | null; username: string | null; user_img_url: string | null } | null } | null>(null);
  const [leavingAccount, setLeavingAccount] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const permissions = useCapabilities(refreshVersion);
  const profile = profileResult && profileResult.userId === userId ? profileResult.profile : null;
  const loadGeneration = useRef(0);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    const version = ++loadGeneration.current;
    const result = await supabase.from("profiles").select("display_name,full_name,username,user_img_url").eq("user_id", userId).single();
    if (version !== loadGeneration.current) return;
    setLoadError(Boolean(result.error));
    if (!result.error) setProfileResult({ userId, profile: result.data });
  }, [userId]);
  useFocusEffect(useCallback(() => { void load(); return () => { loadGeneration.current++; }; }, [load]));

  const leaveAccount = () => Alert.alert(
    "ออกจากระบบ",
    "บัญชีนี้จะถูกนำออกจากรายการสลับบัญชีบนเครื่อง คุณจะต้องเข้าสู่ระบบอีกครั้ง",
    [
      { text: "ยกเลิก", style: "cancel" },
      { text: "ออกจากระบบ", style: "destructive", onPress: async () => {
        if (leavingAccount) return;
        setLeavingAccount(true);
        try { await signOut(); router.replace("/(auth)/sign-in" as never); }
        catch { Alert.alert("ออกจากระบบไม่สำเร็จ", "กรุณาลองใหม่อีกครั้ง"); }
        finally { setLeavingAccount(false); }
      } },
    ],
  );

  const groups = getSettingsGroups(permissions);
  const openAction = async (action: SettingsAction) => {
    if (action.command === "notification-permission") {
      if (Platform.OS === "web") return Alert.alert("สิทธิ์การแจ้งเตือน", "การแจ้งเตือนนอกแอปใช้ในแอป Android/iOS ที่ติดตั้งบนเครื่อง");
      try { await Linking.openSettings(); }
      catch { Alert.alert("เปิดการตั้งค่าไม่ได้", "กรุณาเปิดการตั้งค่าเครื่อง → แอป → Locomall → การแจ้งเตือน"); }
    } else if (action.route) router.push(action.route as never);
  };

  if (loading) return <View style={[styles.root, styles.center]}><ActivityIndicator color={Colors.greenPrimary} /></View>;
  if (!session) return <Redirect href="/(auth)/sign-in" />;

  return <View style={styles.root}>
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setRefreshVersion((value) => value + 1); void load().finally(() => setRefreshing(false)); }} tintColor={Colors.greenPrimary} />}>
    <View style={[styles.hero, { paddingTop: insets.top + 18 }]}>
      <Text style={styles.pageTitle}>ตั้งค่า</Text>
      <View style={styles.avatar}>{profile?.user_img_url
        ? <Image source={{ uri: profile.user_img_url }} style={styles.avatarImage} accessibilityLabel="รูปโปรไฟล์" />
        : <Ionicons name="person" size={34} color={Colors.greenPrimary} />}</View>
      <Text style={styles.name}>{profile?.display_name || profile?.full_name || "ผู้ใช้ Locomall"}</Text>
      <Text style={styles.email}>{session.user.email}</Text>
    </View>
      <View style={styles.content}>
      {loadError ? <TouchableOpacity onPress={() => void load()}><Text style={styles.error}>โหลดข้อมูลบัญชีไม่สำเร็จ · แตะเพื่อลองใหม่</Text></TouchableOpacity> : null}
      {permissions.loading ? <ActivityIndicator color={Colors.greenPrimary} /> : null}
      {groups.map((group) => <View key={group.title} style={styles.group}>
        <Text style={styles.groupTitle}>{group.title}</Text>
        {group.actions.map((action) => <TouchableOpacity accessibilityRole="button" key={action.route ?? action.command} style={styles.row} disabled={leavingAccount} onPress={() => void openAction(action)}>
          <Ionicons name={action.icon as keyof typeof Ionicons.glyphMap} size={21} color={Colors.greenPrimary} />
          <View style={styles.actionContent}><Text style={styles.action}>{action.title}</Text><Text style={styles.description}>{action.description}</Text></View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </TouchableOpacity>)}
      </View>)}
      <TouchableOpacity style={styles.logout} disabled={leavingAccount} onPress={leaveAccount}><Text style={styles.logoutText}>ออกจากระบบ</Text></TouchableOpacity>
      </View>
    </ScrollView>
  </View>;
}

const baseStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  center: { alignItems: "center", justifyContent: "center" },
  hero: { backgroundColor: Colors.greenPrimary, padding: Spacing.lg, paddingBottom: 26, alignItems: "center", borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  pageTitle: { color: Colors.textWhite, fontFamily: "Kanit_700Bold", fontSize: 26, alignSelf: "flex-start", marginBottom: 14 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: "white", alignItems: "center", justifyContent: "center" },
  avatarImage: { width: 72, height: 72, borderRadius: 36 },
  name: { fontFamily: "Kanit_700Bold", fontSize: 22, color: "white", marginTop: 10 },
  email: { fontFamily: "Kanit_400Regular", color: "#DDEBE2" },
  badge: { fontFamily: "Kanit_500Medium", color: Colors.greenDark, backgroundColor: Colors.goldPrimary, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 99, marginTop: 9 },
  content: { padding: Spacing.lg, paddingBottom: 40 },
  group: { marginBottom: 14 }, groupTitle: { fontFamily: "Kanit_700Bold", fontSize: 16, color: Colors.greenPrimary, marginBottom: 10 },
  row: { padding: 16, backgroundColor: "white", borderRadius: 14, marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 12 },
  actionContent: { flex: 1 }, action: { fontFamily: "Kanit_500Medium", color: Colors.textDark },
  description: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, fontSize: 11, marginTop: 3 }, error: { fontFamily: "Kanit_400Regular", color: Colors.danger, marginBottom: 12 },
  logout: { padding: 16, marginTop: 12 },
  logoutText: { fontFamily: "Kanit_500Medium", color: Colors.danger, textAlign: "center" },
});
