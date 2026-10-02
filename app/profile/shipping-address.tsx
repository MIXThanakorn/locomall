import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AppTextInput } from "../../src/components/AppTextInput";
import { Button } from "../../src/components/Button";
import { KeyboardAwareScrollView } from "../../src/components/KeyboardAware";
import { SearchableDropdown } from "../../src/components/SearchableDropdown";
import { BorderRadius, Colors, Spacing } from "../../src/constants/theme";
import { useAuth } from "../../src/context/AuthContext";
import { translateDatabaseError } from "../../src/lib/databaseError";
import { supabase } from "../../src/lib/supabase";
import { mobilePhoneError, normalizeMobilePhone } from "../../src/lib/fieldValidation";

type Area = { code: string; name_th: string; postal_code?: string | null };

export default function ShippingAddress() {
  const { session } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const [list, setList] = useState<any[]>([]);
  const [provinces, setProvinces] = useState<Area[]>([]);
  const [districts, setDistricts] = useState<Area[]>([]);
  const [subdistricts, setSubdistricts] = useState<Area[]>([]);
  const [province, setProvince] = useState<Area>();
  const [district, setDistrict] = useState<Area>();
  const [subdistrict, setSubdistrict] = useState<Area>();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const loadAddresses = useCallback(async () => {
    const result = await supabase.from("user_addresses").select("*,thai_subdistricts(name_th,thai_districts(name_th,thai_provinces(name_th)))").order("is_default", { ascending: false });
    setList(result.data ?? []);
  }, []);

  useEffect(() => {
    if (!session?.user.id) return;
    (async () => {
      await loadAddresses();
      const [{ data: provinceRows }, { data: location }] = await Promise.all([
        supabase.from("thai_provinces").select("code,name_th").order("name_th"),
        supabase.from("user_locations").select("province_code,district_code,subdistrict_code").eq("user_id", session.user.id).maybeSingle(),
      ]);
      setProvinces(provinceRows ?? []);
      if (!location) return;
      const [{ data: districtRows }, { data: subdistrictRows }] = await Promise.all([
        supabase.from("thai_districts").select("code,name_th").eq("province_code", location.province_code).order("name_th"),
        supabase.from("thai_subdistricts").select("code,name_th,postal_code").eq("district_code", location.district_code).order("name_th"),
      ]);
      setDistricts(districtRows ?? []); setSubdistricts(subdistrictRows ?? []);
      setProvince((provinceRows ?? []).find((item) => item.code === location.province_code));
      setDistrict((districtRows ?? []).find((item) => item.code === location.district_code));
      setSubdistrict((subdistrictRows ?? []).find((item) => item.code === location.subdistrict_code));
    })();
  }, [loadAddresses, session?.user.id]);

  const chooseProvince = async (code: string) => {
    setProvince(provinces.find((item) => item.code === code)); setDistrict(undefined); setSubdistrict(undefined); setSubdistricts([]);
    const { data } = await supabase.from("thai_districts").select("code,name_th").eq("province_code", code).order("name_th");
    setDistricts(data ?? []);
  };
  const chooseDistrict = async (code: string) => {
    setDistrict(districts.find((item) => item.code === code)); setSubdistrict(undefined);
    const { data } = await supabase.from("thai_subdistricts").select("code,name_th,postal_code").eq("district_code", code).order("name_th");
    setSubdistricts(data ?? []);
  };

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setPhone("");
    setAddressLine("");
  };

  const startEditing = async (address: any) => {
    const { data: selectedSubdistrict, error } = await supabase
      .from("thai_subdistricts")
      .select("code,name_th,postal_code,district_code,thai_districts(code,name_th,province_code,thai_provinces(code,name_th))")
      .eq("code", address.subdistrict_code)
      .single();
    if (error || !selectedSubdistrict) return Alert.alert("เปิดข้อมูลที่อยู่ไม่สำเร็จ", translateDatabaseError(error));

    const selectedDistrict = selectedSubdistrict.thai_districts as any;
    const selectedProvince = selectedDistrict?.thai_provinces as any;
    const [{ data: districtRows }, { data: subdistrictRows }] = await Promise.all([
      supabase.from("thai_districts").select("code,name_th").eq("province_code", selectedDistrict.province_code).order("name_th"),
      supabase.from("thai_subdistricts").select("code,name_th,postal_code").eq("district_code", selectedSubdistrict.district_code).order("name_th"),
    ]);

    setEditingId(address.address_id);
    setName(address.recipient_name);
    setPhone(address.phone);
    setAddressLine(address.address_line);
    setProvince({ code: selectedProvince.code, name_th: selectedProvince.name_th });
    setDistrict({ code: selectedDistrict.code, name_th: selectedDistrict.name_th });
    setSubdistrict({ code: selectedSubdistrict.code, name_th: selectedSubdistrict.name_th, postal_code: selectedSubdistrict.postal_code });
    setDistricts(districtRows ?? []);
    setSubdistricts(subdistrictRows ?? []);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  };

  const save = async () => {
    if (!session || !province || !district || !subdistrict || !name.trim() || !phone.trim() || !addressLine.trim()) return Alert.alert("กรอกข้อมูลให้ครบ");
    const phoneError = mobilePhoneError(phone);
    if (phoneError) return Alert.alert("เบอร์มือถือไม่ถูกต้อง", phoneError);
    const wasEditing = editingId !== null;
    setLoading(true);
    const { error } = await supabase.rpc("save_my_address", {
      p_address_id: editingId,
      p_recipient_name: name.trim(), p_phone: phone.trim(), p_address_line: addressLine.trim(),
      p_subdistrict_code: subdistrict.code,
      p_is_default: editingId ? Boolean(list.find((item) => item.address_id === editingId)?.is_default) : list.length === 0,
    });
    setLoading(false);
    if (error) return Alert.alert("บันทึกที่อยู่ไม่สำเร็จ", translateDatabaseError(error));
    resetForm();
    await loadAddresses();
    Alert.alert(wasEditing ? "แก้ไขที่อยู่แล้ว" : "บันทึกที่อยู่แล้ว");
  };

  return <KeyboardAwareScrollView ref={scrollRef} style={styles.root} contentContainerStyle={styles.content}>
    <Text style={styles.title}>ที่อยู่จัดส่ง</Text>
    {list.map((address) => {
      const sub = address.thai_subdistricts;
      return <View key={address.address_id} style={styles.card}>
        <View style={styles.cardHeader}><Text style={styles.name}>{address.recipient_name} · {address.phone}</Text><TouchableOpacity onPress={() => startEditing(address)} style={styles.editButton}><Text style={styles.editText}>แก้ไข</Text></TouchableOpacity></View>
        <Text style={styles.detail}>{address.address_line} {sub?.name_th} {sub?.thai_districts?.name_th} {sub?.thai_districts?.thai_provinces?.name_th} {address.postal_code}</Text>
      </View>;
    })}
    <Text style={styles.section}>{editingId ? "แก้ไขที่อยู่" : "เพิ่มที่อยู่"}</Text>
    <Text style={styles.hint}>จังหวัด อำเภอ และตำบลตั้งต้นจากพื้นที่หลัก แต่เปลี่ยนเป็นที่อยู่รับสินค้าอื่นได้</Text>
    <AppTextInput style={styles.input} placeholder="ชื่อผู้รับ" value={name} onChangeText={setName} />
    <AppTextInput style={styles.input} placeholder="เบอร์มือถือ 10 หลัก" value={phone} onChangeText={(value) => setPhone(normalizeMobilePhone(value))} keyboardType="number-pad" maxLength={10} />
    <AppTextInput style={[styles.input, styles.multiline]} placeholder="บ้านเลขที่ ถนน หมู่บ้าน" value={addressLine} onChangeText={setAddressLine} multiline />
    <SearchableDropdown label="จังหวัด" placeholder="เลือกจังหวัด" options={provinces.map((item) => ({ value: item.code, label: item.name_th }))} value={province?.code} onChange={chooseProvince} />
    <SearchableDropdown label="อำเภอ / เขต" placeholder="เลือกอำเภอ / เขต" options={districts.map((item) => ({ value: item.code, label: item.name_th }))} value={district?.code} disabled={!province} onChange={chooseDistrict} />
    <SearchableDropdown label="ตำบล / แขวง" placeholder="เลือกตำบล / แขวง" options={subdistricts.map((item) => ({ value: item.code, label: item.name_th, description: item.postal_code ?? undefined }))} value={subdistrict?.code} disabled={!district} onChange={(code) => setSubdistrict(subdistricts.find((item) => item.code === code))} />
    <Button title={editingId ? "บันทึกการแก้ไข" : "บันทึกที่อยู่"} onPress={save} loading={loading} disabled={!province || !district || !subdistrict} style={styles.button} />
    {editingId ? <Button title="ยกเลิกการแก้ไข" variant="outline" onPress={resetForm} disabled={loading} style={styles.cancelButton} /> : null}
  </KeyboardAwareScrollView>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background }, content: { padding: Spacing.lg, paddingTop: 64, paddingBottom: 70 },
  title: { fontFamily: "Kanit_700Bold", fontSize: 28, color: Colors.greenPrimary, marginBottom: 20 },
  section: { fontFamily: "Kanit_700Bold", fontSize: 21, color: Colors.textDark, marginTop: 18, marginBottom: 2 },
  hint: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, marginBottom: 12 },
  card: { backgroundColor: "white", borderRadius: BorderRadius.lg, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: Colors.inputBorder },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 }, name: { flex: 1, fontFamily: "Kanit_700Bold", color: Colors.textDark }, detail: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, lineHeight: 20, marginTop: 3 },
  editButton: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: BorderRadius.round, backgroundColor: Colors.greenPrimary + "12" }, editText: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary },
  input: { minHeight: 54, backgroundColor: "white", borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: BorderRadius.md, paddingHorizontal: 16, marginBottom: 14, fontFamily: "Kanit_400Regular", color: Colors.textDark },
  multiline: { minHeight: 82, paddingTop: 14, textAlignVertical: "top" }, button: { backgroundColor: Colors.goldPrimary, marginTop: 6 }, cancelButton: { marginTop: 10 },
});
