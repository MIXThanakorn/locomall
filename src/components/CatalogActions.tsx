import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { translateDatabaseError } from "../lib/databaseError";
import { supabase } from "../lib/supabase";
import { useCatalogReviews } from "../hooks/useCatalogReviews";
import { CatalogReviewCard } from "./CatalogReviewCard";

type Target = "market" | "store";
export function CatalogActions({ targetType, targetId, refreshVersion = 0 }: { targetType: Target; targetId: number; refreshVersion?: number }) {
  const router = useRouter();
  const { session } = useAuth();
  const [favorite, setFavorite] = useState(false);
  const [follow, setFollow] = useState(false);
  const { page, error, loading, refresh } = useCatalogReviews(targetType, targetId, null, 3);
  const lastRefresh = useRef(refreshVersion);
  const linkGeneration = useRef(0);
  const load = useCallback(async () => {
    const version = ++linkGeneration.current;
    setFavorite(false); setFollow(false);
    const links = session ? await (supabase as any).from("user_catalog_links").select("kind")
      .eq("user_id", session.user.id).eq("target_type", targetType).eq("target_id", targetId) : { data: [] };
    if (version !== linkGeneration.current) return;
    setFavorite(Boolean(links.data?.some((entry: any) => entry.kind === "favorite")));
    setFollow(Boolean(links.data?.some((entry: any) => entry.kind === "follow")));
  }, [targetId, targetType, session]);
  useFocusEffect(useCallback(() => { void load(); return () => { linkGeneration.current++; }; }, [load]));
  useEffect(() => {
    if (lastRefresh.current === refreshVersion) return;
    lastRefresh.current = refreshVersion;
    void load();
    void refresh();
  }, [load, refresh, refreshVersion]);
  const toggle = async (kind: "favorite" | "follow", current: boolean) => {
    if (!session) return router.push("/(auth)/sign-in" as never);
    const { error } = await (supabase as any).rpc("set_catalog_link", {
      p_kind: kind, p_target_type: targetType, p_target_id: targetId, p_enabled: !current,
    });
    if (error) Alert.alert("บันทึกไม่สำเร็จ", translateDatabaseError(error));
    else { if (kind === "favorite") setFavorite(!current); else setFollow(!current); }
  };
  return <View style={styles.root}>
    <Text style={styles.rating}>{page ? (page.total ? `★ ${page.average.toFixed(1)} จาก ${page.total} รีวิว` : "ยังไม่มีรีวิว") : error ? "ยังโหลดคะแนนรีวิวไม่ได้" : "กำลังโหลดคะแนนรีวิว"}</Text>
    <View style={styles.row}>
      <TouchableOpacity style={styles.action} onPress={() => toggle("favorite", favorite)}><Ionicons name={favorite ? "heart" : "heart-outline"} size={20} color={Colors.greenPrimary} /><Text style={styles.label}>{favorite ? "บันทึกแล้ว" : "บันทึก"}</Text></TouchableOpacity>
      <TouchableOpacity style={styles.action} onPress={() => toggle("follow", follow)}><Ionicons name={follow ? "notifications" : "notifications-outline"} size={20} color={Colors.greenPrimary} /><Text style={styles.label}>{follow ? "ติดตามแล้ว" : "ติดตาม"}</Text></TouchableOpacity>
    </View>
    {follow ? <Text style={styles.hint}>แจ้งเฉพาะร้านใหม่ที่อนุมัติหรือสินค้าที่กลับมาพร้อมขาย ไม่แจ้งทุกครั้งที่สต็อกเปลี่ยน</Text> : null}
    {loading && !page ? <ActivityIndicator color={Colors.greenPrimary} style={{ marginTop: 12 }} /> : null}
    {page?.items.length ? <><Text style={styles.heading}>รีวิวล่าสุด</Text>
      <Text style={styles.hint}>แสดง {page.items.length} จาก {page.total} รีวิว · เรียงจากใหม่ไปเก่า</Text>
      {page.items.map((item) => <CatalogReviewCard key={item.review_id} review={item} targetType={targetType} />)}
      <TouchableOpacity accessibilityRole="button" style={styles.more} onPress={() => router.push({ pathname: "/catalog/reviews", params: { targetType, targetId: String(targetId) } } as never)}>
        <Text style={styles.label}>{page.total > 3 ? `ดูเพิ่มเติม · ทั้งหมด ${page.total} รีวิว` : "ดูสรุปและกรองคะแนนรีวิว"}</Text><Ionicons name="chevron-forward" size={16} color={Colors.greenPrimary} />
      </TouchableOpacity></> : null}
    {error ? <TouchableOpacity accessibilityRole="button" onPress={() => void refresh()}><Text style={styles.error}>{error} · แตะเพื่อลองใหม่</Text></TouchableOpacity> : null}
  </View>;
}
const styles = StyleSheet.create({ root: { marginVertical: 14 }, rating: { fontFamily: "Kanit_700Bold", color: Colors.textDark }, row: { flexDirection: "row", gap: 8, marginTop: 10 }, action: { flex: 1, alignItems: "center", gap: 3, backgroundColor: "white", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 4 }, label: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary, fontSize: 12 }, hint: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, marginTop: 8, fontSize: 12 }, heading: { fontFamily: "Kanit_700Bold", color: Colors.textDark, fontSize: 18, marginTop: 18 }, more: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 4, padding: 14, marginTop: 8, borderRadius: 12, borderWidth: 1, borderColor: Colors.inputBorder, backgroundColor: Colors.cardBackground }, error: { fontFamily: "Kanit_400Regular", color: Colors.danger, fontSize: 12, marginTop: 10 } });
