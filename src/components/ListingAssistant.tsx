import React, { useEffect, useRef, useState } from "react";
import { Alert, Modal, StyleSheet, Text, View } from "react-native";
import { Colors, BorderRadius, Spacing } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { suggestListing, type ListingAiInput, type ListingAiResult } from "../lib/listingAi";
import { AppTextInput } from "./AppTextInput";
import { Button } from "./Button";
import { KeyboardAwareScrollView } from "./KeyboardAware";

type Props = ListingAiInput & { existingImage?: boolean; disabled?: boolean; onApply: (product: string, description: string) => void };
export function ListingAssistant(props: Props) {
  const { session } = useAuth();
  // A changed source/account gets a fresh draft. Pending responses cannot populate another context.
  const contextKey = JSON.stringify([session?.user.id, props.marketId, props.storeId, props.productName, props.description, props.image?.uri, props.existingImage]);
  return <ListingAssistantForm key={contextKey} {...props} userId={session?.user.id} />;
}
function ListingAssistantForm({ marketId, storeId, productName, description, image, existingImage, disabled, onApply, userId }: Props & { userId?: string }) {
  const [busy, setBusy] = useState(false); const [result, setResult] = useState<ListingAiResult | null>(null);
  const [draftName, setDraftName] = useState(""); const [draftDescription, setDraftDescription] = useState("");
  const [error, setError] = useState(""); const [visible, setVisible] = useState(false);
  const pending = useRef({ controller: null as AbortController | null, active: true });
  useEffect(() => {
    const state = pending.current;
    state.active = true;
    return () => { state.active = false; state.controller?.abort(); };
  }, []);

  const generate = async () => {
    const state = pending.current;
    if (state.controller || !state.active) return;
    if (image && image.base64.length > Math.ceil(4 * 1024 * 1024 / 3) * 4) return setError("กรุณาใช้รูปขนาดไม่เกิน 4 MB");
    const controller = new AbortController(); state.controller = controller;
    const timer = setTimeout(() => controller.abort(), 48000);
    setBusy(true); setError(""); setResult(null);
    try {
      const response = await suggestListing({ marketId, storeId, productName, description, image }, controller.signal);
      if (!state.active) return;
      setResult(response); setDraftName(response.suggestion.product_name); setDraftDescription(response.suggestion.description); setVisible(true);
    } catch (failure) {
      if (!state.active) return;
      setError(controller.signal.aborted ? "การวิเคราะห์ใช้เวลานานเกินไป กรุณาลองใหม่ภายหลังหรือกรอกข้อมูลเอง" : failure instanceof Error ? failure.message : "วิเคราะห์ข้อมูลไม่สำเร็จ");
    } finally { clearTimeout(timer); if (state.active) { setBusy(false); state.controller = null; } }
  };
  const ask = () => {
    // User consciously opts in; no product image/text is sent just by opening this page.
    Alert.alert("ให้ระบบวิเคราะห์ข้อมูลสินค้า?", "รูปและข้อความสินค้าจะส่งไปยังบริการของ Google เพื่อวิเคราะห์ และอาจใช้ข้อมูลเพื่อปรับปรุงบริการ ห้ามใส่ข้อมูลส่วนตัวหรือเอกสารลับ ผลลัพธ์เป็นเพียงคำแนะนำที่อาจคลาดเคลื่อน กรุณาตรวจสอบก่อนนำไปใช้", [
      { text: "ยกเลิก", style: "cancel" }, { text: "ยินยอมและวิเคราะห์", onPress: () => { void generate(); } },
    ]);
  };
  const canGenerate = !!userId && !disabled && (!!image || !!existingImage || !!productName.trim() || !!description.trim());
  return <View style={styles.box}>
    <Text style={styles.title}>ระบบช่วยวิเคราะห์ข้อมูลสินค้า</Text>
    <Text style={styles.note}>เพิ่มรูปหรือข้อมูลเบื้องต้น เพื่อรับคำแนะนำจากระบบและตรวจแก้ก่อนนำไปใช้ ระบบไม่แก้ราคา สต็อก หรือบันทึกร้านแทนคุณ</Text>
    <Button title={busy ? "กำลังวิเคราะห์ข้อมูล…" : "วิเคราะห์ข้อมูลสินค้า"} variant="outline" onPress={ask} disabled={!canGenerate} loading={busy} />
    {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
    <Modal visible={visible} animationType="slide" onRequestClose={() => setVisible(false)}>
      <KeyboardAwareScrollView style={styles.modal} contentContainerStyle={styles.content}>
        <Text style={styles.title}>คำแนะนำจากการวิเคราะห์ของระบบ</Text>
        <Text style={styles.note}>คำแนะนำอาจคลาดเคลื่อน กรุณาตรวจชื่อ รูป สภาพ และคำกล่าวอ้างให้ถูกต้องก่อนนำไปใช้ คุณยังต้องกดบันทึกร้านด้วยตนเอง</Text>
        {result?.usedFallback ? <Text style={styles.note}>บริการหลักไม่พร้อม ระบบใช้บริการสำรองในการวิเคราะห์ครั้งนี้</Text> : null}
        <Text style={styles.label}>ชื่อสินค้า</Text>
        <AppTextInput style={styles.input} value={draftName} onChangeText={setDraftName} maxLength={120} />
        <Text style={styles.label}>รายละเอียดสินค้า</Text>
        <AppTextInput style={[styles.input, styles.multiline]} value={draftDescription} onChangeText={setDraftDescription} maxLength={1500} multiline />
        <Text style={styles.label}>คำค้นแนะนำ (ยังไม่บันทึกเป็นแท็ก)</Text>
        <Text style={styles.note}>{result?.suggestion.keywords.join(" · ") || "ไม่มีคำค้นแนะนำ"}</Text>
        <Text style={styles.label}>ข้อมูลที่ควรระบุเพิ่ม</Text>
        {result?.suggestion.missing_information.length ? result.suggestion.missing_information.map((entry, index) => <Text key={index} style={styles.note}>• {entry}</Text>) : <Text style={styles.note}>ระบบไม่มีคำแนะนำเพิ่มเติม กรุณาตรวจสอบข้อมูลด้วยตนเอง</Text>}
        <Button title="ตรวจแล้ว นำชื่อและรายละเอียดไปใช้" onPress={() => { setVisible(false); onApply(draftName.trim(), draftDescription.trim()); }} disabled={!!disabled || !draftName.trim() || !draftDescription.trim()} style={styles.button} />
        <Button title="ปิดโดยไม่เปลี่ยนข้อมูล" variant="ghost" onPress={() => setVisible(false)} />
      </KeyboardAwareScrollView>
    </Modal>
  </View>;
}
const styles = StyleSheet.create({
  box: { padding: Spacing.md, borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: BorderRadius.lg, backgroundColor: Colors.cardBackground, marginBottom: 16 },
  title: { fontFamily: "Kanit_700Bold", fontSize: 19, color: Colors.greenPrimary, marginBottom: 8 },
  note: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, marginBottom: 10 },
  error: { fontFamily: "Kanit_400Regular", color: Colors.danger, marginTop: 10 },
  modal: { flex: 1, backgroundColor: Colors.background }, content: { padding: Spacing.lg, paddingTop: 60, paddingBottom: 55 },
  label: { fontFamily: "Kanit_500Medium", color: Colors.textDark, marginBottom: 8 },
  input: { padding: 14, backgroundColor: Colors.cardBackground, borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: BorderRadius.md, marginBottom: 16, fontFamily: "Kanit_400Regular" },
  multiline: { minHeight: 120, textAlignVertical: "top" }, button: { marginTop: 16, marginBottom: 10 },
});
