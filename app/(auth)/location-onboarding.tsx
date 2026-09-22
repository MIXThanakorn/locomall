/* eslint-disable react-hooks/set-state-in-effect */
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "../../src/components/Button";
import { SearchableDropdown } from "../../src/components/SearchableDropdown";
import { Colors, Spacing } from "../../src/constants/theme";
import { useAuth } from "../../src/context/AuthContext";
import { supabase } from "../../src/lib/supabase";

type Area = { code: string; name_th: string; postal_code?: string | null };

export default function LocationOnboarding() {
  const router = useRouter();
  const { refreshLocation } = useAuth();
  const [provinces, setProvinces] = useState<Area[]>([]);
  const [districts, setDistricts] = useState<Area[]>([]);
  const [subdistricts, setSubdistricts] = useState<Area[]>([]);
  const [province, setProvince] = useState<Area>();
  const [district, setDistrict] = useState<Area>();
  const [subdistrict, setSubdistrict] = useState<Area>();
  const [loading, setLoading] = useState(false);

  useEffect(() => { supabase.from("thai_provinces").select("code,name_th").order("name_th").then(({ data }) => setProvinces(data ?? [])); }, []);
  useEffect(() => {
    setDistrict(undefined); setSubdistrict(undefined); setSubdistricts([]);
    if (province) supabase.from("thai_districts").select("code,name_th").eq("province_code", province.code).order("name_th").then(({ data }) => setDistricts(data ?? []));
    else setDistricts([]);
  }, [province]);
  useEffect(() => {
    setSubdistrict(undefined);
    if (district) supabase.from("thai_subdistricts").select("code,name_th,postal_code").eq("district_code", district.code).order("name_th").then(({ data }) => setSubdistricts(data ?? []));
    else setSubdistricts([]);
  }, [district]);

  const save = async () => {
    if (!province || !district || !subdistrict) return Alert.alert("กรุณาเลือกพื้นที่ให้ครบ");
    setLoading(true);
    const { error } = await supabase.rpc("complete_location_onboarding", {
      p_province_code: province.code,
      p_district_code: district.code,
      p_subdistrict_code: subdistrict.code,
      p_lat: undefined,
      p_lng: undefined,
      p_gps_consent: false,
    });
    setLoading(false);
    if (error) return Alert.alert("บันทึกไม่สำเร็จ", "ไม่สามารถบันทึกพื้นที่หลักได้ กรุณาลองใหม่อีกครั้ง");
    await refreshLocation();
    router.replace("/(tabs)" as never);
  };

  return <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.pin}><Ionicons name="location" size={32} color={Colors.greenPrimary} /></View>
    <Text style={styles.title}>เลือกชุมชนหลักของคุณ</Text>
    <Text style={styles.desc}>ใช้ตรวจสอบสิทธิ์ผู้ขายและเป็นตำแหน่งสำรอง ระบบจะใช้ตำแหน่งจริงเพื่อค้นหาตลาดใกล้ตัวเมื่อคุณเข้าแอป</Text>
    <SearchableDropdown label="จังหวัด" placeholder="เลือกจังหวัด" options={provinces.map((item) => ({ value: item.code, label: item.name_th }))} value={province?.code} onChange={(code) => setProvince(provinces.find((item) => item.code === code))} />
    <SearchableDropdown label="อำเภอ / เขต" placeholder="เลือกอำเภอ / เขต" options={districts.map((item) => ({ value: item.code, label: item.name_th }))} value={district?.code} disabled={!province} onChange={(code) => setDistrict(districts.find((item) => item.code === code))} />
    <SearchableDropdown label="ตำบล / แขวง" placeholder="เลือกตำบล / แขวง" options={subdistricts.map((item) => ({ value: item.code, label: item.name_th }))} value={subdistrict?.code} disabled={!district} onChange={(code) => setSubdistrict(subdistricts.find((item) => item.code === code))} />
    <Button title="บันทึกพื้นที่หลัก" onPress={save} loading={loading} disabled={!province || !district || !subdistrict} style={styles.primary} />
    <View style={styles.notice}><Ionicons name="navigate-outline" size={19} color={Colors.greenPrimary} /><Text style={styles.noticeText}>ตำแหน่งจริงจะถูกขอเมื่อเข้าใช้งานหน้าหลัก และไม่บันทึกเป็นที่อยู่ของคุณ</Text></View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingTop: 70, paddingBottom: 50 },
  pin: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", backgroundColor: "#EAF1E9" },
  title: { fontFamily: "Kanit_700Bold", fontSize: 26, color: Colors.greenPrimary, marginTop: 18 },
  desc: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, lineHeight: 21, marginBottom: 24 },
  primary: { marginTop: 8, backgroundColor: Colors.goldPrimary },
  notice: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 16, paddingHorizontal: 8 },
  noticeText: { flex: 1, fontFamily: "Kanit_400Regular", color: Colors.greenPrimary, lineHeight: 20 },
});
