import { useResponsiveStyles } from "../../src/hooks/useResponsiveStyles";
import { ScreenHeader } from "../../src/components/ScreenHeader";
import { BackButton } from "../../src/components/BackButton";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { LoadNotice } from "../../src/components/LoadNotice";
import { Alert, Image, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "../../src/components/Button";
import { BorderRadius, Colors, Spacing } from "../../src/constants/theme";
import { useAuth } from "../../src/context/AuthContext";
import { formatThaiDateTime } from "../../src/lib/date";
import { translateDatabaseError } from "../../src/lib/databaseError";
import { supabase } from "../../src/lib/supabase";
import { RealtimeWatch, useRealtimeRefresh } from "../../src/hooks/useRealtimeRefresh";
import { formatSaleQuantity } from "../../src/lib/productUnit";
import { canBuyerCancel } from "../../src/lib/cartMarkets";
import { DeliveryAddressCard } from "../../src/components/DeliveryAddressCard";

const deliverySteps = ["awaiting_preparation", "preparing", "at_hub", "consolidated", "shipped", "delivered"];
const pickupSteps = ["awaiting_preparation", "preparing", "at_hub", "delivered"];
const deliveryLabels: Record<string, string> = { awaiting_preparation: "รับคำสั่งซื้อ", preparing: "ผู้ขายกำลังเตรียม", at_hub: "สินค้าถึงจุดรวม", consolidated: "รวมเป็นพัสดุเดียว", shipped: "กำลังจัดส่ง", delivered: "รับสินค้าแล้ว", cancelled: "ยกเลิกแล้ว" };
const pickupLabels: Record<string, string> = { awaiting_preparation: "รับคำสั่งซื้อ", preparing: "ผู้ขายกำลังเตรียม", at_hub: "สินค้าถึงจุดรวม พร้อมให้รับสินค้า", delivered: "รับสินค้าแล้ว", cancelled: "ยกเลิกแล้ว" };
const buyerDeliveryLabels: Record<string, string> = { awaiting_preparation: "รอผู้ขายรับคำสั่งซื้อ", preparing: "ผู้ขายกำลังเตรียมสินค้าให้คุณ", at_hub: "สินค้าของคุณถึงจุดรวม", consolidated: "รวมสินค้าเป็นพัสดุของคุณแล้ว", shipped: "สินค้ากำลังส่งมาหาคุณ", delivered: "คุณได้รับสินค้าแล้ว", cancelled: "คำสั่งซื้อของคุณถูกยกเลิก" };
const buyerPickupLabels: Record<string, string> = { awaiting_preparation: "รอผู้ขายรับคำสั่งซื้อ", preparing: "ผู้ขายกำลังเตรียมสินค้าให้คุณ", at_hub: "สินค้าพร้อมให้คุณรับที่จุดรวม", delivered: "คุณได้รับสินค้าแล้ว", cancelled: "คำสั่งซื้อของคุณถูกยกเลิก" };

export default function OrderDetail() {
  const styles = useResponsiveStyles(baseStyles, {"wrap":["itemDetail","totalRow"]});
  const { id } = useLocalSearchParams<{ id: string }>(); const router = useRouter(); const { session } = useAuth(); const [order, setOrder] = useState<any>(); const [loading, setLoading] = useState(false); const [refreshing, setRefreshing] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewError, setReviewError] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const userId = session?.user.id;
  const generation = useRef(0);
  const load = useCallback(async () => {
    const version = ++generation.current;
    try {
      if (!userId || !Number.isSafeInteger(Number(id)) || Number(id) <= 0) throw new Error("invalid order");
      const { data, error } = await supabase.from("orders").select("*,markets(name,hub_address),order_items(*,stores(name,image_url),order_allocations(status,stock_deducted_at))").eq("order_id", Number(id)).single();
      if (version !== generation.current) return;
      if (error || !data) throw error ?? new Error("unavailable");
      setOrder(data); setLoadError(false);
      if (data.buyer_id === userId && data.status === "delivered") {
        const result = await (supabase as any).from("purchase_reviews").select("order_item_id,hidden_at").eq("order_id", Number(id)).eq("buyer_id", userId);
        if (version !== generation.current) return;
        setReviewError(Boolean(result.error)); setReviews(result.data ?? []);
      } else { setReviews([]); setReviewError(false); }
    } catch { if (version === generation.current) { setOrder(undefined); setLoadError(true); } }
  }, [id, userId]);
  useFocusEffect(useCallback(() => { void load(); const counter = generation; return () => { counter.current++; }; }, [load]));
  const watches = useMemo<RealtimeWatch[]>(() => [{ table: "orders", event: "UPDATE", filter: `order_id=eq.${Number(id)}` }, { table: "order_allocations", event: "UPDATE" }], [id]);
  useRealtimeRefresh(`order-detail-${id}`, load, watches, Number.isSafeInteger(Number(id)) && Number(id) > 0);
  const cancel = async () => { setLoading(true); const { error } = await supabase.rpc("cancel_order", { p_order_id: Number(id), p_reason: "ยกเลิกโดยผู้ซื้อ" }); setLoading(false); if (error) Alert.alert("ยกเลิกไม่สำเร็จ", translateDatabaseError(error)); else await load(); };
  const confirm = () => Alert.alert("ยืนยันการรับสินค้า", order?.fulfillment_method === "pickup" ? "ยืนยันว่าคุณได้รับสินค้าจากจุดรวมเรียบร้อยแล้ว" : "ยืนยันว่าคุณได้รับพัสดุเรียบร้อยแล้ว", [{ text: "ยกเลิก", style: "cancel" }, { text: "ยืนยัน", onPress: async () => { setLoading(true); const { error } = await supabase.rpc("confirm_delivery", { p_order_id: Number(id) }); setLoading(false); if (error) Alert.alert("ยืนยันไม่สำเร็จ", translateDatabaseError(error)); else { Alert.alert("ยืนยันรับสินค้าแล้ว"); await load(); } } }]);
  if (!order) return <View style={styles.center}><BackButton floating />{loadError ? <LoadNotice onRetry={() => void load()} /> : <Text>กำลังโหลด...</Text>}</View>;
  const pickup = order.fulfillment_method === "pickup"; const isBuyer = session?.user.id === order.buyer_id; const steps = pickup ? pickupSteps : deliverySteps; const labels = isBuyer ? (pickup ? buyerPickupLabels : buyerDeliveryLabels) : (pickup ? pickupLabels : deliveryLabels); const current = steps.indexOf(order.status);
  const canConfirm = isBuyer && ((pickup && order.status === "at_hub") || (!pickup && order.status === "shipped"));
  return <ScrollView contentContainerStyle={styles.root} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load().finally(() => setRefreshing(false)); }} tintColor={Colors.greenPrimary} />}>
    <ScreenHeader title={order.order_number} titleStyle={styles.number} /><Text style={styles.market}>{order.markets?.name}</Text><Text style={styles.date}>วันที่สั่ง {formatThaiDateTime(order.created_at)}</Text>
    <View style={styles.method}><Text style={styles.methodTitle}>{pickup ? "นัดรับที่จุดรวมสินค้า" : "จัดส่งถึงที่อยู่"}</Text><Text style={styles.methodDetail}>{pickup ? `${order.markets?.hub_address}${order.pickup_distance_km ? ` · ${order.pickup_distance_km} กม.` : ""}` : "รวมส่งเป็นพัสดุเดียว"}</Text></View>
    {!pickup ? <DeliveryAddressCard value={order.delivery_address_snapshot} /> : null}
    <View style={styles.timeline}>{steps.map((step, index) => <View key={step} style={styles.step}><View style={[styles.dot, index <= current && styles.done]} /><Text style={[styles.stepText, index <= current && styles.doneText]}>{labels[step]}</Text></View>)}</View>
    {order.order_items.map((item: any) => <View style={styles.card} key={item.order_item_id}>{item.product_image_url||item.stores?.image_url?<Image source={{uri:item.product_image_url||item.stores?.image_url}} style={styles.productImage}/>:null}<View style={styles.productBody}><Text style={styles.item}>{item.product_name}</Text><Text style={styles.store}>ร้าน {item.stores?.name ?? "ร้านค้า"}</Text><View style={styles.itemDetail}><Text style={styles.alloc}>{formatSaleQuantity(item.quantity, item.unit)} × ฿{Number(item.unit_price).toLocaleString()}</Text><Text style={styles.price}>฿{Number(item.total_amount).toLocaleString()}</Text></View></View></View>)}
    <View style={styles.totalRow}><Text style={styles.item}>{order.payment_method === "demo_wallet" ? "ชำระด้วยยอดจำลองแล้ว · ไม่ใช่เงินจริง" : "ยอดชำระเมื่อได้รับสินค้า"}</Text><Text style={styles.total}>฿{Number(order.total_amount).toLocaleString()}</Text></View>
    {order.tracking_number ? <View style={styles.tracking}><Text style={styles.item}>เลขติดตาม: {order.tracking_number}</Text><Text style={styles.alloc}>{order.courier_name}</Text></View> : null}
    {canConfirm ? <Button title={pickup ? "ยืนยันว่าได้รับสินค้าที่จุดรวมแล้ว" : "ยืนยันว่าได้รับสินค้าแล้ว"} onPress={confirm} loading={loading} /> : null}
    {isBuyer && order.status === "delivered" ? <View style={styles.reviewBox}><Text style={styles.item}>รีวิวหลังได้รับสินค้า</Text>{reviewError ? <LoadNotice onRetry={() => void load()} /> : null}<Button title={reviews.some((review) => review.order_item_id === null) ? "แก้ไขการรีวิวตลาดชุมชน" : "รีวิวตลาดชุมชน"} disabled={reviewError || reviews.some((review) => review.order_item_id === null && review.hidden_at)} variant="outline" onPress={() => router.push({ pathname: "/order/review", params: { orderId: id } } as never)} />{order.order_items.map((item: any) => <Button key={item.order_item_id} title={`${reviews.some((review) => review.order_item_id === item.order_item_id) ? "แก้ไขการรีวิว" : "รีวิว"}ร้าน ${item.stores?.name ?? item.product_name}`} disabled={reviewError || reviews.some((review) => review.order_item_id === item.order_item_id && review.hidden_at)} variant="outline" onPress={() => router.push({ pathname: "/order/review", params: { orderId: id, itemId: String(item.order_item_id) } } as never)} style={{ marginTop: 8 }} />)}</View> : null}
    {!isBuyer && ((pickup && order.status === "at_hub") || (!pickup && order.status === "shipped")) ? <Text style={styles.onlyBuyer}>รอผู้ซื้อยืนยันการรับสินค้า</Text> : null}
    {isBuyer && canBuyerCancel(order) ? <Button title="ยกเลิกคำสั่งซื้อ" variant="outline" onPress={cancel} loading={loading} style={{ marginTop: 10 }} /> : null}
    {isBuyer && !canBuyerCancel(order) && !["cancelled", "delivered"].includes(order.status) ? <Text style={styles.onlyBuyer}>ไม่สามารถยกเลิกได้หลังเจ้าของตลาดรับสินค้าจากผู้ขายรายแรกแล้ว</Text> : null}
  </ScrollView>;
}

const baseStyles = StyleSheet.create({ root: { padding: Spacing.lg, paddingTop: 0, paddingBottom: 60, backgroundColor: Colors.background, flexGrow: 1 }, center: { flex: 1, alignItems: "center", justifyContent: "center" }, number: { fontFamily: "Kanit_700Bold", fontSize: 24, color: Colors.greenPrimary }, market: { fontFamily: "Kanit_500Medium", color: Colors.textMedium }, date: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, fontSize: 12 }, method: { backgroundColor: "#FFF5D9", borderRadius: BorderRadius.lg, padding: 14, marginTop: 14 }, methodTitle: { fontFamily: "Kanit_700Bold", color: Colors.textDark }, methodDetail: { fontFamily: "Kanit_400Regular", color: Colors.textMuted }, timeline: { marginVertical: 22 }, step: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }, dot: { width: 15, height: 15, borderRadius: 8, backgroundColor: Colors.inputBorder }, done: { backgroundColor: Colors.greenPrimary }, stepText: { fontFamily: "Kanit_400Regular", color: Colors.textMuted }, doneText: { color: Colors.textDark, fontFamily: "Kanit_500Medium" }, card: { backgroundColor: "white", padding: 12, borderRadius: 16, marginBottom: 10, flexDirection: "row", gap: 12 }, productImage: { width: 64, height: 64, borderRadius: 12, backgroundColor: "#EAF1E9" }, productBody: { flex: 1 }, item: { fontFamily: "Kanit_700Bold" }, store: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, fontSize: 13 }, itemDetail: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 }, price: { fontFamily: "Kanit_700Bold", color: Colors.greenPrimary, fontSize: 18 }, alloc: { fontFamily: "Kanit_400Regular", fontSize: 12, color: Colors.textMuted }, totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 16 }, total: { fontFamily: "Kanit_700Bold", fontSize: 22, color: Colors.greenPrimary }, tracking: { padding: 16, backgroundColor: "#EAF1E9", borderRadius: 16, marginBottom: 16 }, onlyBuyer: { fontFamily: "Kanit_500Medium", color: Colors.textMuted, textAlign: "center", padding: 14 }, reviewBox: { marginTop: 18, gap: 8 } });
