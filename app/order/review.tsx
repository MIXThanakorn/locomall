import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AppTextInput } from "../../src/components/AppTextInput";
import { Button } from "../../src/components/Button";
import { KeyboardAwareScrollView } from "../../src/components/KeyboardAware";
import { BorderRadius, Colors, Spacing } from "../../src/constants/theme";
import { translateDatabaseError } from "../../src/lib/databaseError";
import { supabase } from "../../src/lib/supabase";

export default function PurchaseReview() {
  const { orderId, itemId } = useLocalSearchParams<{ orderId: string; itemId?: string }>();
  const router = useRouter();
  const [stars, setStars] = useState(5);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("รีวิวตลาดชุมชน");
  useEffect(() => {
    void (async () => {
      const [order, existing] = await Promise.all([
        supabase.from("orders").select("order_id,market_id,markets(name),order_items(order_item_id,product_name)").eq("order_id", Number(orderId)).single(),
        (itemId
          ? (supabase as any).from("purchase_reviews").select("stars,body").eq("order_item_id", Number(itemId))
          : (supabase as any).from("purchase_reviews").select("stars,body").eq("order_id", Number(orderId)).is("order_item_id", null)).maybeSingle(),
      ]);
      const item = (order.data as any)?.order_items?.find((row: any) => row.order_item_id === Number(itemId));
      setTitle(item ? `รีวิวร้าน: ${item.product_name}` : `รีวิวตลาด: ${(order.data as any)?.markets?.name ?? "ตลาดชุมชน"}`);
      if (existing.data) { setStars(existing.data.stars); setBody(existing.data.body); }
    })();
  }, [orderId, itemId]);
  const save = async () => {
    setBusy(true);
    const { error } = await (supabase as any).rpc("save_purchase_review", {
      p_order_id: Number(orderId), p_order_item_id: itemId ? Number(itemId) : null,
      p_stars: stars, p_body: body.trim(),
    });
    setBusy(false);
    if (error) Alert.alert("บันทึกรีวิวไม่สำเร็จ", translateDatabaseError(error));
    else { Alert.alert("บันทึกรีวิวแล้ว"); router.back(); }
  };
  return <KeyboardAwareScrollView style={styles.root} contentContainerStyle={styles.content}>
    <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>← กลับ</Text></TouchableOpacity>
    <Text style={styles.title}>{title}</Text><Text style={styles.hint}>รีวิวได้หลังรับสินค้าแล้วเท่านั้น · แก้ไขรีวิวของตนเองได้</Text>
    <View style={styles.stars}>{[1,2,3,4,5].map((star) => <TouchableOpacity key={star} onPress={() => setStars(star)} accessibilityLabel={`${star} ดาว`}><Text style={[styles.star, star<=stars && styles.active]}>★</Text></TouchableOpacity>)}</View>
    <AppTextInput multiline value={body} onChangeText={setBody} maxLength={1000} placeholder="เล่าประสบการณ์ (ไม่บังคับ)" style={styles.input} />
    <Button title="บันทึกรีวิว" loading={busy} onPress={save} />
  </KeyboardAwareScrollView>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: Colors.background }, content: { padding: Spacing.lg, paddingTop: 58, paddingBottom: 80 }, back: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary }, title: { fontFamily: "Kanit_700Bold", color: Colors.greenPrimary, fontSize: 25, marginTop: 18 }, hint: { fontFamily: "Kanit_400Regular", color: Colors.textMuted }, stars: { flexDirection: "row", justifyContent: "space-around", marginVertical: 22 }, star: { fontSize: 39, color: Colors.inputBorder }, active: { color: Colors.goldPrimary }, input: { minHeight: 130, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.inputBorder, backgroundColor: "white", color: Colors.textDark, padding: 14, textAlignVertical: "top", marginBottom: 16 } });
