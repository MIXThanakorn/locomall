import { useResponsiveStyles } from "../../src/hooks/useResponsiveStyles";
import { BackButton } from "../../src/components/BackButton";
import { ScreenHeader } from "../../src/components/ScreenHeader";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../../src/constants/theme";
import { useAuth } from "../../src/context/AuthContext";
import { useCatalogPreferences } from "../../src/context/CatalogPreferencesContext";
import { supabase } from "../../src/lib/supabase";

type Area = { userId: string; label: string | null; loading: boolean; error: boolean };
export default function CatalogSettings() {
  const styles = useResponsiveStyles(baseStyles, {});
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, loading: authLoading } = useAuth();
  const userId = session?.user.id;
  const { sameArea, ready, saving, error: preferenceError, setSameArea } = useCatalogPreferences();
  const [area, setArea] = useState<Area | null>(null);
  const request = useRef(0);
  const load = useCallback(async () => {
    if (!userId) return;
    const version = ++request.current;
    setArea((current) => ({ userId, label: current?.userId === userId ? current.label : null, loading: true, error: false }));
    const { data, error } = await supabase.from("user_locations").select("subdistrict_code,thai_subdistricts(name_th),thai_districts(name_th),thai_provinces(name_th)").eq("user_id", userId).maybeSingle();
    if (version !== request.current) return;
    const label = data ? [data.thai_subdistricts?.name_th, data.thai_districts?.name_th, data.thai_provinces?.name_th].filter(Boolean).join(" · ") : null;
    setArea({ userId, label: label || null, loading: false, error: Boolean(error) });
  }, [userId]);
  useFocusEffect(useCallback(() => { void load(); return () => { request.current++; }; }, [load]));
  const areaReady = area?.userId === userId && !area?.loading && !area?.error;
  const choose = async (value: boolean) => {
    if (!ready || saving || (value && !areaReady)) return;
    if (value && !area?.label) {
      Alert.alert("ยังไม่ได้ตั้งพื้นที่หลัก", "เลือกจังหวัด อำเภอ และตำบลก่อนเปิดตัวกรอง", [{ text: "ยกเลิก", style: "cancel" }, { text: "ตั้งพื้นที่หลัก", onPress: () => router.push("/profile/location" as never) }]);
      return;
    }
    if (!(await setSameArea(value))) Alert.alert("บันทึกตัวกรองไม่สำเร็จ", "กรุณาลองใหม่อีกครั้ง");
  };
  if (authLoading) return <View style={styles.center}><BackButton floating /><ActivityIndicator color={Colors.greenPrimary} /></View>;
  if (!session) return <Redirect href="/(auth)/sign-in" />;
  return <ScrollView style={styles.root} contentContainerStyle={[styles.content, { paddingTop: 0, paddingBottom: insets.bottom + 30 }]} refreshControl={<RefreshControl refreshing={Boolean(area && area.userId === userId && area.loading)} onRefresh={() => void load()} tintColor={Colors.greenPrimary} />}>
    <ScreenHeader contentInset={20} title="กรองตลาดชุมชน" titleStyle={styles.title} />
    <Text style={styles.body}>ตัวเลือกนี้ใช้กับตลาด ร้านค้า และผลค้นหาในหน้าแรก บันทึกแยกตามบัญชีบนเครื่องนี้</Text>
    <View style={styles.card}><Text style={styles.heading}>พื้นที่หลักของคุณ</Text>{!area || area.userId !== userId || area.loading ? <ActivityIndicator color={Colors.greenPrimary} /> : area.error ? <TouchableOpacity onPress={() => void load()}><Text style={styles.error}>โหลดพื้นที่ไม่สำเร็จ · แตะเพื่อลองใหม่</Text></TouchableOpacity> : <Text style={styles.body}>{area.label ?? "ยังไม่ได้ตั้งพื้นที่หลัก"}</Text>}<TouchableOpacity onPress={() => router.push("/profile/location" as never)}><Text style={styles.link}>เปลี่ยนพื้นที่หลัก</Text></TouchableOpacity></View>
    {preferenceError ? <Text style={styles.error}>อ่านหรือบันทึกตัวกรองบนเครื่องไม่สำเร็จ กรุณาเลือกใหม่อีกครั้ง</Text> : null}
    {[{ value: false, title: "ทุกพื้นที่", detail: "แสดงทั้งหมด เรียงจากใกล้ไปไกล ไม่มีข้อจำกัด 10 กม." }, { value: true, title: "เฉพาะพื้นที่เดียวกัน", detail: "แสดงเฉพาะตลาดและร้านในตำบล/แขวงเดียวกับพื้นที่หลัก ไม่ใช่รัศมีจาก GPS" }].map((option) => {
      const disabled = !ready || saving || (option.value && !areaReady);
      const selected = ready && sameArea === option.value;
      return <TouchableOpacity key={String(option.value)} accessibilityRole="radio" accessibilityState={{ checked: selected, disabled }} style={[styles.option, selected && styles.selected]} disabled={disabled} onPress={() => void choose(option.value)}>
        <View style={styles.flex}><Text style={styles.heading}>{option.title}</Text><Text style={styles.body}>{option.detail}</Text></View>
        <Ionicons name={selected ? "radio-button-on" : "radio-button-off"} size={24} color={Colors.greenPrimary} />
      </TouchableOpacity>;
    })}
    {!ready || saving ? <ActivityIndicator color={Colors.greenPrimary} /> : null}
    <TouchableOpacity style={styles.home} onPress={() => router.replace("/(tabs)" as never)}><Text style={styles.homeText}>ดูตลาดในหน้าแรก</Text></TouchableOpacity>
  </ScrollView>;
}
const baseStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background }, content: { paddingHorizontal: 20 }, center: { flex: 1, justifyContent: "center", backgroundColor: Colors.background },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }, title: { flex: 1, fontFamily: "Kanit_700Bold", color: Colors.greenPrimary, fontSize: 22 },
  card: { backgroundColor: Colors.cardBackground, padding: 18, borderRadius: 16, marginVertical: 18 }, heading: { fontFamily: "Kanit_500Medium", color: Colors.textDark, fontSize: 16 },
  body: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, fontSize: 13, lineHeight: 23, marginTop: 5 }, link: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary, marginTop: 10 },
  error: { fontFamily: "Kanit_400Regular", color: Colors.danger, marginVertical: 10 }, option: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, marginBottom: 12, borderRadius: 16, borderWidth: 1, borderColor: Colors.inputBorder, backgroundColor: Colors.cardBackground },
  selected: { borderColor: Colors.greenPrimary, backgroundColor: "#EAF3EC" }, flex: { flex: 1 }, home: { marginTop: 14, padding: 16, borderRadius: 16, backgroundColor: Colors.greenPrimary, alignItems: "center" }, homeText: { fontFamily: "Kanit_500Medium", color: Colors.textWhite },
});
