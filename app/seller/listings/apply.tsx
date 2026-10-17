import { useFocusEffect, useLocalSearchParams, useRouter, Redirect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppTextInput } from "../../../src/components/AppTextInput";
import { Button } from "../../../src/components/Button";
import { ContextImage } from "../../../src/components/ContextImage";
import { KeyboardAwareScrollView } from "../../../src/components/KeyboardAware";
import { ScreenHeader } from "../../../src/components/ScreenHeader";
import { LoadNotice } from "../../../src/components/LoadNotice";
import { Colors } from "../../../src/constants/theme";
import { useAuth } from "../../../src/context/AuthContext";
import { useResponsiveStyles } from "../../../src/hooks/useResponsiveStyles";
import { translateDatabaseError } from "../../../src/lib/databaseError";
import { parseJoinCatalog, sellerJoinAction, type JoinCatalog } from "../../../src/lib/sellerJoin";
import { selectSquareImage, uploadPrivateImage, type SelectedImage } from "../../../src/lib/storage";
import { supabase } from "../../../src/lib/supabase";

export default function ApplyToStore() {
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  const { session, loading } = useAuth();
  if (loading) return <ActivityIndicator color={Colors.greenPrimary} />;
  if (!session) return <Redirect href="/(auth)/sign-in" />;
  return <ApplyToStoreContent key={`${session.user.id}:${storeId}`} storeId={Number(storeId)} userId={session.user.id} />;
}

function ApplyToStoreContent({ storeId, userId }: { storeId: number; userId: string }) {
  const styles = useResponsiveStyles(baseStyles, {});
  const router = useRouter();
  const [catalog, setCatalog] = useState<JoinCatalog | null>(null);
  const [application, setApplication] = useState<{ status: string; review_note: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [image, setImage] = useState<SelectedImage | null>(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const generation = useRef(0);
  const mounted = useRef(true);
  const submitting = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const load = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true);
    try {
      if (!Number.isSafeInteger(storeId) || storeId <= 0) { setCatalog(null); return; }
      const [store, ownApplication] = await Promise.all([
        supabase.rpc("get_store_catalog", { p_store_id: storeId }),
        supabase.from("store_seller_applications").select("status,review_note").eq("store_id", storeId).eq("applicant_id", userId).maybeSingle(),
      ]);
      if (request !== generation.current) return;
      if (store.error || ownApplication.error) throw store.error || ownApplication.error;
      setCatalog(parseJoinCatalog(store.data, storeId));
      setApplication(ownApplication.data);
      setError(false);
    } catch { if (request === generation.current) setError(true); }
    finally { if (request === generation.current) setLoading(false); }
  }, [storeId, userId]);
  useFocusEffect(useCallback(() => { void load(); return () => { generation.current++; }; }, [load]));

  const eligible = catalog && sellerJoinAction({ signedIn: true, sameArea: catalog.same_area, isManager: catalog.is_manager, isSeller: catalog.is_seller, status: application?.status });
  const pending = application?.status === "pending" || application?.status === "approved";
  const submit = async () => {
    if (!eligible || pending || submitting.current || !image) return;
    submitting.current = true;
    setSending(true);
    let uploadedPath: string | null = null;
    let cleanupSafe = true;
    try {
      const uploaded = await uploadPrivateImage("seller-evidence", userId, image, `seller-product-${storeId}`);
      uploadedPath = uploaded.path;
      if (!mounted.current) return;
      // An uncertain network outcome might already have committed the request.
      // Do not delete its evidence image unless a database rejection is certain.
      cleanupSafe = false;
      const result = await supabase.rpc("apply_to_sell_in_store", { p_store_id: storeId, p_note: note.trim() || undefined, p_product_image_url: uploaded.path });
      if (result.error) {
        cleanupSafe = /^[0-9A-Z]{5}$/.test(result.error.code ?? "");
        throw result.error;
      }
      uploadedPath = null;
      if (!mounted.current) return;
      setImage(null);
      Alert.alert("ส่งคำขอร่วมขายแล้ว", "รอเจ้าของตลาดตรวจสอบและอนุมัติ", [{ text: "ตกลง", onPress: () => router.back() }]);
      await load();
    } catch (cause) {
      const failure = cause && typeof cause === "object" && "message" in cause
        ? { message: String(cause.message), code: "code" in cause ? String(cause.code) : undefined }
        : { message: "ไม่สามารถส่งคำขอได้ กรุณาลองใหม่" };
      if (mounted.current) Alert.alert("ส่งคำขอไม่สำเร็จ", translateDatabaseError(failure));
    } finally {
      if (uploadedPath && cleanupSafe) await supabase.storage.from("seller-evidence").remove([uploadedPath]);
      submitting.current = false;
      if (mounted.current) setSending(false);
    }
  };

  return <KeyboardAwareScrollView contentContainerStyle={styles.content}>
    <ScreenHeader title="ขอร่วมขายสินค้า" titleStyle={styles.heading} />
    {loading ? <ActivityIndicator color={Colors.greenPrimary} /> : error ? <LoadNotice onRetry={() => void load()} /> : !eligible ? <View style={styles.card}><Text style={styles.message}>ไม่สามารถส่งคำขอร่วมขายสำหรับร้านนี้ได้</Text><Button title="กลับหน้าร้าน" variant="outline" onPress={() => router.back()} /></View> : <>
      <View style={styles.product}><ContextImage uri={catalog?.image_url} name={catalog?.product_name} size={64} /><View style={styles.copy}><Text style={styles.name}>{catalog?.product_name}</Text><Text style={styles.message}>{catalog?.name}</Text></View></View>
      {pending ? <View style={styles.card}><Text style={styles.name}>{application?.status === "pending" ? "คำขออยู่ระหว่างตรวจสอบ" : "คำขอได้รับการอนุมัติแล้ว"}</Text><Button title="กลับหน้าร้าน" variant="outline" onPress={() => router.back()} /></View> : <>
        {application?.status === "rejected" ? <Text style={styles.rejected}>คำขอเดิมไม่ผ่าน: {application.review_note || "ไม่ระบุเหตุผล"}</Text> : null}
        <Text style={styles.label}>รูปสินค้าจริงของคุณ *</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={image ? "เปลี่ยนรูปสินค้า" : "แนบรูปสินค้า"} disabled={sending} style={styles.imagePicker} onPress={() => { void selectSquareImage().then((selected) => { if (mounted.current) setImage(selected); }).catch(() => { if (mounted.current) Alert.alert("เลือกรูปไม่สำเร็จ", "กรุณาลองอีกครั้ง"); }); }}>
          {image ? <Image source={{ uri: image.uri }} style={styles.image} /> : <><Ionicons name="camera-outline" size={32} color={Colors.greenPrimary} /><Text style={styles.message}>แตะเพื่อแนบรูปสินค้า</Text></>}
        </TouchableOpacity>
        <Text style={styles.label}>รายละเอียดเพิ่มเติม</Text>
        <AppTextInput editable={!sending} value={note} onChangeText={setNote} maxLength={1000} multiline style={styles.input} placeholder="แนะนำสินค้าที่คุณต้องการร่วมขาย" />
        <Text style={styles.hint}>เมื่ออนุมัติแล้ว จึงเพิ่มสต็อกพร้อมขายได้</Text>
        <Button title={application?.status === "rejected" ? "ส่งคำขอใหม่" : "ส่งคำขอร่วมขาย"} loading={sending} disabled={!image || sending} onPress={() => void submit()} />
      </>}
    </>}
  </KeyboardAwareScrollView>;
}

const baseStyles = StyleSheet.create({
  content: { flexGrow: 1, padding: 24, paddingTop: 0, paddingBottom: 64, backgroundColor: Colors.background },
  heading: { fontFamily: "Kanit_700Bold", color: Colors.greenPrimary, fontSize: 24 },
  product: { flexDirection: "row", gap: 12, alignItems: "center", marginVertical: 16 }, copy: { flex: 1 },
  name: { fontFamily: "Kanit_700Bold", color: Colors.textDark, fontSize: 17 },
  message: { fontFamily: "Kanit_400Regular", color: Colors.textMuted },
  card: { padding: 16, borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: 16, backgroundColor: "white", gap: 16 },
  label: { fontFamily: "Kanit_500Medium", color: Colors.textDark, marginBottom: 8, marginTop: 16 },
  imagePicker: { width: "100%", minHeight: 160, aspectRatio: 2, borderRadius: 14, borderWidth: 1, borderStyle: "dashed", borderColor: Colors.greenPrimary, alignItems: "center", justifyContent: "center", gap: 12, overflow: "hidden", backgroundColor: "#EAF1E9" },
  image: { width: "100%", height: "100%" }, input: { minHeight: 110, padding: 14, borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: 12, backgroundColor: "white", textAlignVertical: "top", fontFamily: "Kanit_400Regular" },
  hint: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, fontSize: 12, marginVertical: 16 },
  rejected: { fontFamily: "Kanit_400Regular", color: Colors.danger, marginVertical: 12 },
});
