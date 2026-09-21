import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity } from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Button } from "../../src/components/Button";
import { BorderRadius, Colors, Spacing } from "../../src/constants/theme";
import { supabase } from "../../src/lib/supabase";
import { SelectedImage, selectSquareImage, uploadPublicImage } from "../../src/lib/storage";

export default function CreateMarket() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [hub, setHub] = useState("");
  const [subdistrict, setSubdistrict] = useState<string>();
  const [area, setArea] = useState("");
  const [image, setImage] = useState<SelectedImage | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("user_locations")
      .select("subdistrict_code,thai_subdistricts(name_th,thai_districts(name_th,thai_provinces(name_th)))")
      .single()
      .then(({ data }: any) => {
        setSubdistrict(data?.subdistrict_code);
        const location = data?.thai_subdistricts;
        setArea(location ? `${location.name_th} ${location.thai_districts?.name_th} ${location.thai_districts?.thai_provinces?.name_th}` : "");
      });
  }, []);

  const chooseImage = async () => {
    try { setImage(await selectSquareImage()); }
    catch (error: any) { Alert.alert("เลือกรูปไม่สำเร็จ", error.message); }
  };

  const submit = async () => {
    if (!subdistrict) return Alert.alert("กรุณาตั้งค่าพื้นที่หลักก่อน");
    if (!name.trim() || !hub.trim()) return Alert.alert("กรอกข้อมูลให้ครบ");
    setLoading(true);
    try {
      const { data: marketId, error } = await supabase.rpc("apply_for_market", {
        p_name: name.trim(), p_description: description.trim(), p_subdistrict_code: subdistrict, p_hub_address: hub.trim(),
      });
      if (error) throw error;
      if (image && marketId) {
        const uploaded = await uploadPublicImage("market-images", marketId, image);
        const { error: imageError } = await supabase.rpc("set_market_image", { p_market_id: marketId, p_image_url: uploaded.publicUrl });
        if (imageError) throw imageError;
      }
      Alert.alert("ส่งคำขอแล้ว", "Platform Admin จะตรวจสอบ Market", [{ text: "ตกลง", onPress: () => router.back() }]);
    } catch (error: any) { Alert.alert("ส่งคำขอไม่สำเร็จ", error.message); }
    finally { setLoading(false); }
  };

  return <ScrollView contentContainerStyle={styles.root}>
    <Text style={styles.title}>ขอเปิด Market ชุมชน</Text>
    <Text style={styles.area}>พื้นที่หลัก: {area || "กำลังโหลด..."}</Text>
    <TouchableOpacity style={styles.imagePicker} onPress={chooseImage}>
      {image ? <Image source={{ uri: image.uri }} style={styles.image} /> : <Text style={styles.imageText}>+ เพิ่มรูป Market</Text>}
    </TouchableOpacity>
    <TextInput style={styles.input} placeholder="ชื่อ Market" value={name} onChangeText={setName} />
    <TextInput style={[styles.input, styles.multiline]} multiline placeholder="เรื่องราวและรายละเอียดชุมชน" value={description} onChangeText={setDescription} />
    <TextInput style={[styles.input, styles.multiline]} multiline placeholder="ที่อยู่จุดรวมสินค้า" value={hub} onChangeText={setHub} />
    <Button title="ส่งให้ Platform Admin ตรวจสอบ" onPress={submit} loading={loading} style={{ backgroundColor: Colors.goldPrimary }} />
  </ScrollView>;
}

const styles = StyleSheet.create({
  root: { padding: Spacing.lg, paddingTop: 58, backgroundColor: Colors.background, flexGrow: 1 },
  title: { fontFamily: "Kanit_700Bold", fontSize: 26, color: Colors.greenPrimary },
  area: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, marginBottom: 16 },
  imagePicker: { height: 170, borderRadius: BorderRadius.lg, borderWidth: 1, borderStyle: "dashed", borderColor: Colors.greenPrimary, alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: 14 },
  image: { width: "100%", height: "100%" }, imageText: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary },
  input: { backgroundColor: "white", borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: BorderRadius.md, padding: 14, marginBottom: 12, fontFamily: "Kanit_400Regular" },
  multiline: { minHeight: 92, textAlignVertical: "top" },
});
