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

export default function EditStore() {
  const { storeId } = useLocalSearchParams<{ storeId: string }>(); const router = useRouter();
  const [store, setStore] = useState<any>(); const [name, setName] = useState(""); const [product, setProduct] = useState("");
  const [description, setDescription] = useState(""); const [unit, setUnit] = useState(""); const [price, setPrice] = useState("");
  const [image, setImage] = useState<SelectedImage | null>(null); const [saving, setSaving] = useState(false);
  useEffect(() => { supabase.from("stores").select("*").eq("store_id", Number(storeId)).single().then(({ data }) => { setStore(data); setName(data?.name ?? ""); setProduct(data?.product_name ?? ""); setDescription(data?.description ?? ""); setUnit(data?.unit ?? "ชิ้น"); setPrice(data ? String(data.unit_price) : ""); }); }, [storeId]);
  const save = async () => {
    const numericPrice = Number(price); if (!name.trim() || !product.trim() || !unit.trim() || !Number.isFinite(numericPrice) || numericPrice <= 0) return Alert.alert("กรอกข้อมูลให้ครบและราคาต้องมากกว่า 0");
    setSaving(true);
    try {
      let imageUrl: string | undefined; if (image) imageUrl = (await uploadPublicImage("store-images", Number(storeId), image)).publicUrl;
      const { error } = await supabase.rpc("update_store", { p_store_id: Number(storeId), p_name: name.trim(), p_product_name: product.trim(), p_description: description.trim(), p_unit: unit.trim(), p_unit_price: numericPrice, p_image_url: imageUrl });
      if (error) throw error; Alert.alert("บันทึกร้านค้าแล้ว", undefined, [{ text: "ตกลง", onPress: () => router.back() }]);
    } catch (error: any) { Alert.alert("บันทึกไม่สำเร็จ", translateDatabaseError(error)); } finally { setSaving(false); }
  };
  return <KeyboardAwareScrollView contentContainerStyle={styles.root}>
    <Text style={styles.title}>แก้ไขร้านค้า</Text><Text style={styles.sub}>ราคาที่แก้ไขจะใช้กับคำสั่งซื้อใหม่เท่านั้น คำสั่งซื้อเดิมยังใช้ราคาเดิม</Text>
    <TouchableOpacity style={styles.imageBox} onPress={async () => { try { setImage(await selectSquareImage()); } catch { Alert.alert("เลือกรูปไม่สำเร็จ", "กรุณาตรวจสอบสิทธิ์เข้าถึงรูปภาพแล้วลองใหม่อีกครั้ง"); } }}>
      {image?.uri || store?.image_url ? <Image source={{ uri: image?.uri ?? store.image_url }} style={styles.image} /> : <Text style={styles.imageText}>+ เปลี่ยนรูปร้าน/สินค้า</Text>}
    </TouchableOpacity>
    <AppTextInput style={styles.input} placeholder="ชื่อร้าน" value={name} onChangeText={setName} /><AppTextInput style={styles.input} placeholder="ชื่อสินค้า" value={product} onChangeText={setProduct} />
    <AppTextInput style={[styles.input, styles.multiline]} placeholder="รายละเอียด" value={description} onChangeText={setDescription} multiline /><AppTextInput style={styles.input} placeholder="หน่วย" value={unit} onChangeText={setUnit} />
    <AppTextInput style={styles.input} placeholder="ราคากลาง" value={price} onChangeText={setPrice} keyboardType="decimal-pad" /><Button title="บันทึกการแก้ไข" onPress={save} loading={saving} style={styles.button} />
  </KeyboardAwareScrollView>;
}
const styles = StyleSheet.create({ root: { padding: Spacing.lg, paddingTop: 58, paddingBottom: 70, backgroundColor: Colors.background, flexGrow: 1 }, title: { fontFamily: "Kanit_700Bold", fontSize: 27, color: Colors.greenPrimary }, sub: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, marginBottom: 14 }, imageBox: { height: 180, borderWidth: 1, borderStyle: "dashed", borderColor: Colors.greenPrimary, borderRadius: BorderRadius.lg, overflow: "hidden", alignItems: "center", justifyContent: "center", marginBottom: 14 }, image: { width: "100%", height: "100%" }, imageText: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary }, input: { minHeight: 54, backgroundColor: "white", borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: BorderRadius.md, padding: 14, marginBottom: 12, fontFamily: "Kanit_400Regular" }, multiline: { minHeight: 86, textAlignVertical: "top" }, button: { backgroundColor: Colors.goldPrimary, marginTop: 6 } });
