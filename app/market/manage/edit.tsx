import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, Image, StyleSheet, Text, TouchableOpacity } from "react-native";
import { AppTextInput } from "../../../src/components/AppTextInput";
import { Button } from "../../../src/components/Button";
import { KeyboardAwareScrollView } from "../../../src/components/KeyboardAware";
import { BorderRadius, Colors, Spacing } from "../../../src/constants/theme";
import { translateDatabaseError } from "../../../src/lib/databaseError";
import { SelectedImage, selectSquareImage, uploadPublicImage } from "../../../src/lib/storage";
import { supabase } from "../../../src/lib/supabase";

export default function EditMarket() {
  const { marketId } = useLocalSearchParams<{ marketId: string }>();
  const router = useRouter();
  const [market, setMarket] = useState<any>();
  const [name, setName] = useState(""); const [description, setDescription] = useState(""); const [hubAddress, setHubAddress] = useState("");
  const [image, setImage] = useState<SelectedImage | null>(null); const [saving, setSaving] = useState(false);
  useEffect(() => { supabase.from("markets").select("*").eq("market_id", Number(marketId)).single().then(({ data }) => { setMarket(data); setName(data?.name ?? ""); setDescription(data?.description ?? ""); setHubAddress(data?.hub_address ?? ""); }); }, [marketId]);
  const save = async () => {
    if (!name.trim() || !hubAddress.trim()) return Alert.alert("กรุณากรอกชื่อและจุดรวมสินค้า");
    setSaving(true);
    try {
      let imageUrl: string | undefined;
      if (image) imageUrl = (await uploadPublicImage("market-images", Number(marketId), image)).publicUrl;
      const { error } = await supabase.rpc("update_market", { p_market_id: Number(marketId), p_name: name.trim(), p_description: description.trim(), p_hub_address: hubAddress.trim(), p_image_url: imageUrl });
      if (error) throw error;
      Alert.alert("บันทึกข้อมูลตลาดชุมชนแล้ว", undefined, [{ text: "ตกลง", onPress: () => router.back() }]);
    } catch (error: any) { Alert.alert("บันทึกไม่สำเร็จ", translateDatabaseError(error)); }
    finally { setSaving(false); }
  };
  return <KeyboardAwareScrollView contentContainerStyle={styles.root}>
    <Text style={styles.title}>แก้ไขตลาดชุมชน</Text><Text style={styles.sub}>จังหวัด อำเภอ และตำบลจะใช้ตามพื้นที่ที่ได้รับอนุมัติและไม่สามารถเปลี่ยนได้จากหน้านี้</Text>
    <TouchableOpacity style={styles.imageBox} onPress={async () => { try { setImage(await selectSquareImage()); } catch { Alert.alert("เลือกรูปไม่สำเร็จ", "กรุณาตรวจสอบสิทธิ์เข้าถึงรูปภาพแล้วลองใหม่อีกครั้ง"); } }}>
      {image?.uri || market?.image_url ? <Image source={{ uri: image?.uri ?? market.image_url }} style={styles.image} /> : <Text style={styles.imageText}>+ เปลี่ยนรูปตลาดชุมชน</Text>}
    </TouchableOpacity>
    <AppTextInput style={styles.input} placeholder="ชื่อตลาดชุมชน" value={name} onChangeText={setName} />
    <AppTextInput style={[styles.input, styles.multiline]} placeholder="รายละเอียด" value={description} onChangeText={setDescription} multiline />
    <AppTextInput style={[styles.input, styles.multiline]} placeholder="ที่อยู่จุดรวมสินค้า" value={hubAddress} onChangeText={setHubAddress} multiline />
    <Button title="บันทึกการแก้ไข" onPress={save} loading={saving} style={styles.button} />
  </KeyboardAwareScrollView>;
}
const styles = StyleSheet.create({ root: { padding: Spacing.lg, paddingTop: 58, paddingBottom: 70, backgroundColor: Colors.background, flexGrow: 1 }, title: { fontFamily: "Kanit_700Bold", fontSize: 27, color: Colors.greenPrimary }, sub: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, marginBottom: 14 }, imageBox: { height: 180, borderWidth: 1, borderStyle: "dashed", borderColor: Colors.greenPrimary, borderRadius: BorderRadius.lg, overflow: "hidden", alignItems: "center", justifyContent: "center", marginBottom: 14 }, image: { width: "100%", height: "100%" }, imageText: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary }, input: { minHeight: 54, backgroundColor: "white", borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: BorderRadius.md, padding: 14, marginBottom: 12, fontFamily: "Kanit_400Regular" }, multiline: { minHeight: 86, textAlignVertical: "top" }, button: { backgroundColor: Colors.goldPrimary, marginTop: 6 } });
