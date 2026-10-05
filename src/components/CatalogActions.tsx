import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { translateDatabaseError } from "../lib/databaseError";
import { supabase } from "../lib/supabase";

type Target = "market" | "store";
export function CatalogActions({ targetType, targetId, refreshVersion = 0 }: { targetType: Target; targetId: number; refreshVersion?: number }) {
  const router = useRouter();
  const { session } = useAuth();
  const [favorite, setFavorite] = useState(false);
  const [follow, setFollow] = useState(false);
  const [rating, setRating] = useState({ average: 0, count: 0 });
  const [reviews, setReviews] = useState<any[]>([]);
  const lastRefresh = useRef(refreshVersion);
  const load = useCallback(async () => {
    const table = targetType === "market" ? "markets" : "stores";
    const idColumn = targetType === "market" ? "market_id" : "store_id";
    const [score, reviewResult, links] = await Promise.all([
      (supabase as any).from(table).select("rating_average,rating_count").eq(idColumn, targetId).maybeSingle(),
      (supabase as any).rpc("get_catalog_reviews", { p_target_type: targetType, p_target_id: targetId }),
      session ? (supabase as any).from("user_catalog_links").select("kind")
        .eq("target_type", targetType).eq("target_id", targetId) : Promise.resolve({ data: [] }),
    ]);
    setRating({ average: Number(score.data?.rating_average ?? 0), count: Number(score.data?.rating_count ?? 0) });
    setReviews(reviewResult.data ?? []);
    setFavorite(Boolean(links.data?.some((entry: any) => entry.kind === "favorite")));
    setFollow(Boolean(links.data?.some((entry: any) => entry.kind === "follow")));
  }, [targetId, targetType, session]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useEffect(() => {
    if (lastRefresh.current === refreshVersion) return;
    lastRefresh.current = refreshVersion;
    void load();
  }, [load, refreshVersion]);
  const toggle = async (kind: "favorite" | "follow", current: boolean) => {
    if (!session) return router.push("/(auth)/sign-in" as never);
    const { error } = await (supabase as any).rpc("set_catalog_link", {
      p_kind: kind, p_target_type: targetType, p_target_id: targetId, p_enabled: !current,
    });
    if (error) Alert.alert("บันทึกไม่สำเร็จ", translateDatabaseError(error));
    else { if (kind === "favorite") setFavorite(!current); else setFollow(!current); }
  };
  return <View style={styles.root}>
    <Text style={styles.rating}>{rating.count ? `★ ${rating.average.toFixed(1)} จาก ${rating.count} รีวิว` : "ยังไม่มีรีวิว"}</Text>
    <View style={styles.row}>
      <TouchableOpacity style={styles.action} onPress={() => toggle("favorite", favorite)}><Ionicons name={favorite ? "heart" : "heart-outline"} size={20} color={Colors.greenPrimary} /><Text style={styles.label}>{favorite ? "บันทึกแล้ว" : "บันทึก"}</Text></TouchableOpacity>
      <TouchableOpacity style={styles.action} onPress={() => toggle("follow", follow)}><Ionicons name={follow ? "notifications" : "notifications-outline"} size={20} color={Colors.greenPrimary} /><Text style={styles.label}>{follow ? "ติดตามแล้ว" : "ติดตาม"}</Text></TouchableOpacity>
    </View>
    {follow ? <Text style={styles.hint}>แจ้งเฉพาะร้านใหม่ที่อนุมัติหรือสินค้าที่กลับมาพร้อมขาย ไม่แจ้งทุกครั้งที่สต็อกเปลี่ยน</Text> : null}
    {reviews.length ? <><Text style={styles.heading}>รีวิวล่าสุด</Text>{reviews.map((item) => <View key={item.review_id} style={styles.review}><Text style={styles.label}>{"★".repeat(item.stars)}{"☆".repeat(5-item.stars)}</Text>{item.body ? <Text style={styles.body}>{item.body}</Text> : null}</View>)}</> : null}
  </View>;
}
const styles = StyleSheet.create({ root: { marginVertical: 14 }, rating: { fontFamily: "Kanit_700Bold", color: Colors.textDark }, row: { flexDirection: "row", gap: 8, marginTop: 10 }, action: { flex: 1, alignItems: "center", gap: 3, backgroundColor: "white", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 4 }, label: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary, fontSize: 12 }, hint: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, marginTop: 8, fontSize: 12 }, heading: { fontFamily: "Kanit_700Bold", color: Colors.textDark, fontSize: 18, marginTop: 18 }, review: { backgroundColor: "white", padding: 12, borderRadius: 12, marginTop: 6 }, body: { fontFamily: "Kanit_400Regular", color: Colors.textDark } });
