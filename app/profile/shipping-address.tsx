/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "../../src/components/Button";
import { SearchableDropdown } from "../../src/components/SearchableDropdown";
import { BorderRadius, Colors, Spacing } from "../../src/constants/theme";
import { useAuth } from "../../src/context/AuthContext";
import { supabase } from "../../src/lib/supabase";

type Area = { code: string; name_th: string; postal_code?: string | null };

export default function ShippingAddress() {
  const { session } = useAuth();
  const [list, setList] = useState<any[]>([]);
  const [areas, setAreas] = useState<{ provinces: Area[]; districts: Area[]; subdistricts: Area[] }>({ provinces: [], districts: [], subdistricts: [] });
  const [province, setProvince] = useState<Area>();
  const [district, setDistrict] = useState<Area>();
  const [subdistrict, setSubdistrict] = useState<Area>();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const result = await supabase.from("user_addresses").select("*,thai_subdistricts(name_th,thai_districts(name_th,thai_provinces(name_th)))").order("is_default", { ascending: false });
    setList(result.data ?? []);
  };

  useEffect(() => {
    void load();
    supabase.from("thai_provinces").select("code,name_th").order("name_th").then(({ data }) => setAreas((current) => ({ ...current, provinces: data ?? [] })));
  }, []);
  useEffect(() => {
    setDistrict(undefined); setSubdistrict(undefined);
    setAreas((current) => ({ ...current, districts: [], subdistricts: [] }));
    if (province) supabase.from("thai_districts").select("code,name_th").eq("province_code", province.code).order("name_th").then(({ data }) => setAreas((current) => ({ ...current, districts: data ?? [] })));
  }, [province]);
  useEffect(() => {
    setSubdistrict(undefined);
    setAreas((current) => ({ ...current, subdistricts: [] }));
    if (district) supabase.from("thai_subdistricts").select("code,name_th,postal_code").eq("district_code", district.code).order("name_th").then(({ data }) => setAreas((current) => ({ ...current, subdistricts: data ?? [] })));
  }, [district]);

  const save = async () => {
    if (!session || !province || !district || !subdistrict || !name.trim() || !phone.trim() || !addressLine.trim()) return Alert.alert("กรอกข้อมูลให้ครบ");
    setLoading(true);
    const { error } = await supabase.from("user_addresses").insert({
      user_id: session.user.id,
      recipient_name: name.trim(),
      phone: phone.trim(),
      address_line: addressLine.trim(),
      subdistrict_code: subdistrict.code,
      postal_code: subdistrict.postal_code ?? "",
      is_default: list.length === 0,
    });
    setLoading(false);
    if (error) return Alert.alert("บันทึกที่อยู่ไม่สำเร็จ", error.message);
    setName(""); setPhone(""); setAddressLine(""); setProvince(undefined); setDistrict(undefined); setSubdistrict(undefined);
    await load();
  };

  return <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Text style={styles.title}>ที่อยู่จัดส่ง</Text>
    {list.map((address) => {
      const sub = address.thai_subdistricts;
      const districtName = sub?.thai_districts?.name_th ?? "";
      const provinceName = sub?.thai_districts?.thai_provinces?.name_th ?? "";
      return <View key={address.address_id} style={styles.card}>
        <Text style={styles.name}>{address.recipient_name} · {address.phone}</Text>
        <Text style={styles.detail}>{address.address_line} {sub?.name_th} {districtName} {provinceName} {address.postal_code}</Text>
      </View>;
    })}

    <Text style={styles.section}>เพิ่มที่อยู่</Text>
    <TextInput style={styles.input} placeholder="ชื่อผู้รับ" value={name} onChangeText={setName} />
    <TextInput style={styles.input} placeholder="เบอร์โทร" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
    <TextInput style={[styles.input, styles.multiline]} placeholder="บ้านเลขที่ ถนน หมู่บ้าน" value={addressLine} onChangeText={setAddressLine} multiline />
    <SearchableDropdown label="จังหวัด" placeholder="เลือกจังหวัด" options={areas.provinces.map((item) => ({ value: item.code, label: item.name_th }))} value={province?.code} onChange={(code) => setProvince(areas.provinces.find((item) => item.code === code))} />
    <SearchableDropdown label="อำเภอ / เขต" placeholder="เลือกอำเภอ / เขต" options={areas.districts.map((item) => ({ value: item.code, label: item.name_th }))} value={district?.code} disabled={!province} onChange={(code) => setDistrict(areas.districts.find((item) => item.code === code))} />
    <SearchableDropdown label="ตำบล / แขวง" placeholder="เลือกตำบล / แขวง" options={areas.subdistricts.map((item) => ({ value: item.code, label: item.name_th, description: item.postal_code ?? undefined }))} value={subdistrict?.code} disabled={!district} onChange={(code) => setSubdistrict(areas.subdistricts.find((item) => item.code === code))} />
    <Button title="บันทึกที่อยู่" onPress={save} loading={loading} disabled={!province || !district || !subdistrict} style={styles.button} />
  </ScrollView>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingTop: 64, paddingBottom: 70 },
  title: { fontFamily: "Kanit_700Bold", fontSize: 28, color: Colors.greenPrimary, marginBottom: 20 },
  section: { fontFamily: "Kanit_700Bold", fontSize: 21, color: Colors.textDark, marginTop: 18, marginBottom: 12 },
  card: { backgroundColor: "white", borderRadius: BorderRadius.lg, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: Colors.inputBorder },
  name: { fontFamily: "Kanit_700Bold", color: Colors.textDark },
  detail: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, lineHeight: 20, marginTop: 3 },
  input: { minHeight: 54, backgroundColor: "white", borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: BorderRadius.md, paddingHorizontal: 16, marginBottom: 14, fontFamily: "Kanit_400Regular", color: Colors.textDark },
  multiline: { minHeight: 82, paddingTop: 14, textAlignVertical: "top" },
  button: { backgroundColor: Colors.goldPrimary, marginTop: 6 },
});
