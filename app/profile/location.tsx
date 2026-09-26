import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "../../src/components/Button";
import { SearchableDropdown } from "../../src/components/SearchableDropdown";
import { BorderRadius, Colors, Spacing } from "../../src/constants/theme";
import { useAuth } from "../../src/context/AuthContext";
import { translateDatabaseError } from "../../src/lib/databaseError";
import { supabase } from "../../src/lib/supabase";

type Area = { code: string; name_th: string; postal_code?: string | null };

export default function PrimaryLocation() {
  const { session, refreshLocation } = useAuth();
  const [provinces, setProvinces] = useState<Area[]>([]);
  const [districts, setDistricts] = useState<Area[]>([]);
  const [subdistricts, setSubdistricts] = useState<Area[]>([]);
  const [province, setProvince] = useState<Area>();
  const [district, setDistrict] = useState<Area>();
  const [subdistrict, setSubdistrict] = useState<Area>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session?.user.id) return;
    (async () => {
      const [{ data: provinceRows }, { data: location }] = await Promise.all([
        supabase.from("thai_provinces").select("code,name_th").order("name_th"),
        supabase.from("user_locations").select("province_code,district_code,subdistrict_code").eq("user_id", session.user.id).single(),
      ]);
      const [{ data: districtRows }, { data: subdistrictRows }] = await Promise.all([
        supabase.from("thai_districts").select("code,name_th").eq("province_code", location?.province_code ?? "").order("name_th"),
        supabase.from("thai_subdistricts").select("code,name_th,postal_code").eq("district_code", location?.district_code ?? "").order("name_th"),
      ]);
      setProvinces(provinceRows ?? []); setDistricts(districtRows ?? []); setSubdistricts(subdistrictRows ?? []);
      setProvince((provinceRows ?? []).find((item) => item.code === location?.province_code));
      setDistrict((districtRows ?? []).find((item) => item.code === location?.district_code));
      setSubdistrict((subdistrictRows ?? []).find((item) => item.code === location?.subdistrict_code));
      setLoading(false);
    })();
  }, [session?.user.id]);

  const chooseProvince = async (code: string) => {
    const next = provinces.find((item) => item.code === code);
    setProvince(next); setDistrict(undefined); setSubdistrict(undefined); setSubdistricts([]);
    const { data } = await supabase.from("thai_districts").select("code,name_th").eq("province_code", code).order("name_th");
    setDistricts(data ?? []);
  };
  const chooseDistrict = async (code: string) => {
    const next = districts.find((item) => item.code === code);
    setDistrict(next); setSubdistrict(undefined);
    const { data } = await supabase.from("thai_subdistricts").select("code,name_th,postal_code").eq("district_code", code).order("name_th");
    setSubdistricts(data ?? []);
  };

  const save = async () => {
    if (!province || !district || !subdistrict) return Alert.alert("กรุณาเลือกพื้นที่ให้ครบ");
    setSaving(true);
    const { error } = await supabase.rpc("complete_location_onboarding", {
      p_province_code: province.code, p_district_code: district.code, p_subdistrict_code: subdistrict.code,
      p_lat: undefined, p_lng: undefined, p_gps_consent: false,
    });
    setSaving(false);
    if (error) return Alert.alert("เปลี่ยนพื้นที่ไม่สำเร็จ", translateDatabaseError(error));
    await refreshLocation();
    Alert.alert("บันทึกพื้นที่หลักแล้ว", "สิทธิ์เปิดร้านและร่วมขายครั้งถัดไปจะตรวจจากพื้นที่ใหม่นี้");
  };

  if (loading) return <View style={styles.center}><Text style={styles.muted}>กำลังโหลดพื้นที่...</Text></View>;
  return <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Text style={styles.title}>พื้นที่หลัก</Text>
    <View style={styles.notice}><Ionicons name="information-circle-outline" size={22} color={Colors.greenPrimary} /><Text style={styles.noticeText}>ระบบใช้พื้นที่นี้ค้นหาตลาดชุมชนใกล้คุณ และตรวจสอบพื้นที่ก่อนเปิดร้านหรือร่วมขาย การเปลี่ยนพื้นที่หลักจะไม่เปลี่ยนที่อยู่จัดส่งเดิม</Text></View>
    <SearchableDropdown label="จังหวัด" placeholder="เลือกจังหวัด" options={provinces.map((item) => ({ value: item.code, label: item.name_th }))} value={province?.code} onChange={chooseProvince} />
    <SearchableDropdown label="อำเภอ / เขต" placeholder="เลือกอำเภอ / เขต" options={districts.map((item) => ({ value: item.code, label: item.name_th }))} value={district?.code} disabled={!province} onChange={chooseDistrict} />
    <SearchableDropdown label="ตำบล / แขวง" placeholder="เลือกตำบล / แขวง" options={subdistricts.map((item) => ({ value: item.code, label: item.name_th }))} value={subdistrict?.code} disabled={!district} onChange={(code) => setSubdistrict(subdistricts.find((item) => item.code === code))} />
    <Button title="บันทึกพื้นที่หลัก" onPress={save} loading={saving} disabled={!province || !district || !subdistrict} style={styles.button} />
  </ScrollView>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background }, content: { padding: Spacing.lg, paddingTop: 60, paddingBottom: 70 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.background },
  title: { fontFamily: "Kanit_700Bold", fontSize: 28, color: Colors.greenPrimary, marginBottom: 14 },
  notice: { flexDirection: "row", gap: 10, padding: 14, backgroundColor: "#EAF1E9", borderRadius: BorderRadius.lg, marginBottom: 18 },
  noticeText: { flex: 1, fontFamily: "Kanit_400Regular", color: Colors.greenDark, lineHeight: 20 },
  muted: { fontFamily: "Kanit_400Regular", color: Colors.textMuted }, button: { marginTop: 8, backgroundColor: Colors.goldPrimary },
});
