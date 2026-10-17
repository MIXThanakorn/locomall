import { useResponsiveStyles } from "../../src/hooks/useResponsiveStyles";
import { ScreenHeader } from "../../src/components/ScreenHeader";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../src/context/AuthContext";
import { LoadNotice } from "../../src/components/LoadNotice";
import { AppTextInput } from "../../src/components/AppTextInput";
import { Button } from "../../src/components/Button";
import { KeyboardAwareScrollView } from "../../src/components/KeyboardAware";
import { BorderRadius, Colors, Spacing } from "../../src/constants/theme";
import { translateDatabaseError } from "../../src/lib/databaseError";
import { supabase } from "../../src/lib/supabase";

export default function PurchaseReview() {
  const { session } = useAuth();
  const { orderId, itemId } = useLocalSearchParams<{ orderId: string; itemId?: string }>();
  return <ReviewContent key={`${session?.user.id}:${orderId}:${itemId ?? "market"}`} />;
}

function ReviewContent() {
  const styles = useResponsiveStyles(baseStyles, { wrap: ["stars"] });
  const { orderId, itemId } = useLocalSearchParams<{ orderId: string; itemId?: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const submitting = useRef(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [editing, setEditing] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [retry, setRetry] = useState(0);
  const [stars, setStars] = useState(5);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("รีวิวตลาดชุมชน");
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
      if (!session?.user.id || !Number.isSafeInteger(Number(orderId)) || Number(orderId) <= 0 || (itemId && (!Number.isSafeInteger(Number(itemId)) || Number(itemId) <= 0))) throw new Error("invalid review");
      const [order, existing] = await Promise.all([
        supabase.from("orders").select("order_id,buyer_id,status,market_id,markets(name),order_items(order_item_id,product_name)").eq("order_id", Number(orderId)).eq("buyer_id", session.user.id).single(),
        (itemId
          ? (supabase as any).from("purchase_reviews").select("stars,body,hidden_at").eq("buyer_id", session.user.id).eq("order_item_id", Number(itemId))
          : (supabase as any).from("purchase_reviews").select("stars,body,hidden_at").eq("buyer_id", session.user.id).eq("order_id", Number(orderId)).is("order_item_id", null)).maybeSingle(),
      ]);
      if (!active) return;
      if (order.error || existing.error || !order.data || order.data.status !== "delivered") throw new Error("unavailable");
      const item = (order.data as any)?.order_items?.find((row: any) => row.order_item_id === Number(itemId));
      if (itemId && !item) throw new Error("invalid item");
      setTitle(item ? `รีวิวร้าน: ${item.product_name}` : `รีวิวตลาด: ${(order.data as any)?.markets?.name ?? "ตลาดชุมชน"}`);
      setEditing(Boolean(existing.data)); setHidden(Boolean(existing.data?.hidden_at));
      if (existing.data) { setStars(existing.data.stars); setBody(existing.data.body); }
      setLoadError(false);
      } catch { if (active) setLoadError(true); }
      finally { if (active) setInitialLoading(false); }
    })();
    return () => { active = false; };
  }, [orderId, itemId, session?.user.id, retry]);
  const save = async () => {
    if (submitting.current || initialLoading || loadError || hidden) return;
    submitting.current = true; setBusy(true);
    try {
      const { error } = await (supabase as any).rpc("save_purchase_review", {
        p_order_id: Number(orderId), p_order_item_id: itemId ? Number(itemId) : null,
        p_stars: stars, p_body: body.trim(),
      });
      if (error) Alert.alert("บันทึกรีวิวไม่สำเร็จ", translateDatabaseError(error));
      else { Alert.alert(editing ? "แก้ไขการรีวิวแล้ว" : "บันทึกรีวิวแล้ว"); router.back(); }
    } catch { Alert.alert("บันทึกรีวิวไม่สำเร็จ", "กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่"); }
    finally { submitting.current = false; setBusy(false); }
  };

  return <KeyboardAwareScrollView style={styles.root} contentContainerStyle={styles.content}>
    <ScreenHeader title={editing ? title.replace("รีวิว", "แก้ไขการรีวิว") : title} titleStyle={styles.title} /><Text style={styles.hint}>รีวิวได้หลังรับสินค้าแล้วเท่านั้น · แก้ไขรีวิวของตนเองได้</Text>
    {initialLoading ? <Text style={styles.hint}>กำลังโหลดการรีวิว…</Text> : null}
    {loadError ? <LoadNotice onRetry={() => { setInitialLoading(true); setRetry((value) => value + 1); }} /> : null}
    {hidden ? <Text style={styles.hint}>รีวิวนี้ถูกระงับ จึงไม่สามารถแก้ไขได้</Text> : null}
    <View style={styles.stars}>{[1,2,3,4,5].map((star) => <TouchableOpacity disabled={initialLoading || loadError || hidden || busy} style={styles.starButton} accessibilityRole="radio" accessibilityState={{ checked: star === stars }} key={star} onPress={() => setStars(star)} accessibilityLabel={`${star} ดาว`}><Text allowFontScaling={false} style={[styles.star, star<=stars && styles.active]}>★</Text></TouchableOpacity>)}</View>
    <AppTextInput editable={!initialLoading && !loadError && !hidden && !busy} multiline value={body} onChangeText={setBody} maxLength={1000} placeholder="เล่าประสบการณ์ (ไม่บังคับ)" style={styles.input} />
    <Button title={editing ? "บันทึกการแก้ไขรีวิว" : "บันทึกรีวิว"} disabled={initialLoading || loadError || hidden} loading={busy} onPress={save} />
  </KeyboardAwareScrollView>;
}
const baseStyles = StyleSheet.create({ root: { flex: 1, backgroundColor: Colors.background }, content: { padding: Spacing.lg, paddingTop: 0, paddingBottom: 80 }, back: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary }, title: { fontFamily: "Kanit_700Bold", color: Colors.greenPrimary, fontSize: 25, marginTop: 18 }, hint: { fontFamily: "Kanit_400Regular", color: Colors.textMuted }, starButton: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }, stars: { flexDirection: "row", justifyContent: "space-around", marginVertical: 22 }, star: { fontSize: 39, color: Colors.inputBorder }, active: { color: Colors.goldPrimary }, input: { minHeight: 130, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.inputBorder, backgroundColor: "white", color: Colors.textDark, padding: 14, textAlignVertical: "top", marginBottom: 16 } });
