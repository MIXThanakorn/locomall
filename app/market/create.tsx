import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity } from "react-native";
import { KeyboardAwareScrollView } from "../../src/components/KeyboardAware";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Button } from "../../src/components/Button";
import { BorderRadius, Colors, Spacing } from "../../src/constants/theme";
import { supabase } from "../../src/lib/supabase";
import { SelectedImage, selectSquareImage, uploadPublicImage } from "../../src/lib/storage";
import { translateDatabaseError } from "../../src/lib/databaseError";

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
    catch { Alert.alert("เลือกรูปไม่สำเร็จ", "กรุณาตรวจสอบสิทธิ์เข้าถึงรูปภาพแล้วลองใหม่อีกครั้ง"); }
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
        try {
          const uploaded = await uploadPublicImage("market-images", marketId, image);
          const { error: imageError } = await supabase.rpc("set_market_image", { p_market_id: marketId, p_image_url: uploaded.publicUrl });
          if (imageError) throw imageError;
        } catch {
          return Alert.alert("ส่งคำขอแล้ว แต่รูปยังไม่ถูกบันทึก", "คำขอเปิดตลาดชุมชนถูกส่งเรียบร้อยแล้ว คุณสามารถกลับมาเลือกรูปและส่งอีกครั้งเพื่ออัปเดตคำขอเดิม", [{ text: "ตกลง", onPress: () => router.back() }]);
        }
      }
      Alert.alert("ส่งคำขอแล้ว", "ผู้ดูแลระบบจะตรวจสอบข้อมูลตลาดชุมชนของคุณ", [{ text: "ตกลง", onPress: () => router.back() }]);
    } catch (error: any) { Alert.alert("ส่งคำขอไม่สำเร็จ", translateDatabaseError(error)); }
    finally { setLoading(false); }
  };

  return <KeyboardAwareScrollView contentContainerStyle={styles.root}>
    <Text style={styles.title}>ขอเปิดตลาดชุมชน</Text>
    <Text style={styles.area}>พื้นที่หลัก: {area || "กำลังโหลด..."}</Text>
    <TouchableOpacity style={styles.imagePicker} onPress={chooseImage}>
      {image ? <Image source={{ uri: image.uri }} style={styles.image} /> : <Text style={styles.imageText}>+ เพิ่มรูปตลาดชุมชน</Text>}
    </TouchableOpacity>
    <TextInput style={styles.input} placeholder="ชื่อตลาดชุมชน" value={name} onChangeText={setName} />
    <TextInput style={[styles.input, styles.multiline]} multiline placeholder="เรื่องราวและรายละเอียดชุมชน" value={description} onChangeText={setDescription} />
    <TextInput style={[styles.input, styles.multiline]} multiline placeholder="ที่อยู่จุดรวมสินค้า" value={hub} onChangeText={setHub} />
    <Button title="ส่งคำขอให้ผู้ดูแลระบบตรวจสอบ" onPress={submit} loading={loading} style={{ backgroundColor: Colors.goldPrimary }} />
  </KeyboardAwareScrollView>;
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
