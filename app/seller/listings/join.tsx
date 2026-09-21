import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity } from "react-native";
import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button } from "../../../src/components/Button";
import { BorderRadius, Colors, Spacing } from "../../../src/constants/theme";
import { supabase } from "../../../src/lib/supabase";
import { SelectedImage, selectSquareImage, uploadPublicImage } from "../../../src/lib/storage";

export default function CreateStore() {
  const { marketId } = useLocalSearchParams<{ marketId: string }>();
  const router = useRouter();
  const [name, setName] = useState("");
  const [product, setProduct] = useState("");
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState("ชิ้น");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState<SelectedImage | null>(null);
  const [loading, setLoading] = useState(false);

  const chooseImage = async () => {
    try { setImage(await selectSquareImage()); }
    catch (error: any) { Alert.alert("เลือกรูปไม่สำเร็จ", error.message); }
  };

  const submit = async () => {
    const numericPrice = Number(price);
    if (!marketId || !name.trim() || !product.trim() || !Number.isFinite(numericPrice) || numericPrice <= 0) return Alert.alert("กรอกข้อมูลให้ครบและราคาต้องมากกว่า 0");
    setLoading(true);
    try {
      const { data: storeId, error } = await supabase.rpc("apply_to_open_store", {
        p_market_id: Number(marketId), p_name: name.trim(), p_product_name: product.trim(),
        p_description: description.trim(), p_unit: unit.trim(), p_unit_price: numericPrice,
      });
      if (error) throw error;
      if (image && storeId) {
        const uploaded = await uploadPublicImage("store-images", storeId, image);
        const { error: imageError } = await supabase.rpc("set_store_image", { p_store_id: storeId, p_image_url: uploaded.publicUrl });
        if (imageError) throw imageError;
      }
      Alert.alert("ส่งคำขอแล้ว", "ผู้อนุมัติที่เกี่ยวข้องจะตรวจสอบคำขอของคุณ", [{ text: "ตกลง", onPress: () => router.back() }]);
    } catch (error: any) { Alert.alert("ส่งคำขอไม่สำเร็จ", error.message); }
    finally { setLoading(false); }
  };

  const inputs: Array<[string, string, (value: string) => void]> = [
    ["ชื่อร้าน", name, setName], ["ชื่อสินค้า", product, setProduct], ["รายละเอียด", description, setDescription],
    ["หน่วย เช่น กก. / ลูก / ขวด", unit, setUnit], ["ราคากลาง", price, setPrice],
  ];

  return <ScrollView style={styles.root} contentContainerStyle={styles.content}>
    <Text style={styles.title}>ขอเปิดร้าน</Text>
    <Text style={styles.note}>หนึ่งร้านขายสินค้าเพียงชนิดเดียว และใช้ราคากลางเดียวกันสำหรับผู้ขายทุกราย</Text>
    <TouchableOpacity style={styles.imagePicker} onPress={chooseImage}>
      {image ? <Image source={{ uri: image.uri }} style={styles.image} /> : <Text style={styles.imageText}>+ เพิ่มรูปสินค้า/ร้าน</Text>}
    </TouchableOpacity>
    {inputs.map(([label, value, setter]) => <TextInput key={label} style={styles.input} placeholder={label} value={value} onChangeText={setter} keyboardType={label === "ราคากลาง" ? "decimal-pad" : "default"} />)}
    <Button title="ส่งคำขอเปิดร้าน" onPress={submit} loading={loading} style={{ backgroundColor: Colors.goldPrimary, marginTop: 16 }} />
  </ScrollView>;
}

const styles = StyleSheet.create({
  root: { backgroundColor: Colors.background }, content: { padding: Spacing.lg, paddingTop: 58 },
  title: { fontFamily: "Kanit_700Bold", fontSize: 26, color: Colors.greenPrimary },
  note: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, marginBottom: 16 },
  imagePicker: { height: 170, borderRadius: BorderRadius.lg, borderWidth: 1, borderStyle: "dashed", borderColor: Colors.greenPrimary, alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: 14 },
  image: { width: "100%", height: "100%" }, imageText: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary },
  input: { backgroundColor: "white", borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: BorderRadius.md, padding: 14, marginBottom: 12, fontFamily: "Kanit_400Regular" },
});
