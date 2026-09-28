import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BorderRadius, Colors, Spacing } from "../../src/constants/theme";
import { useAuth } from "../../src/context/AuthContext";
import { useCapabilities } from "../../src/hooks/useCapabilities";
import { useOrders, useSellerAllocations } from "../../src/hooks/useCommerce";
import { formatThaiDateTime } from "../../src/lib/date";
import { buyerOrderStatusLabel, sellerAllocationStatusLabel } from "../../src/lib/displayText";

type OrderView = "buying" | "selling";

export default function OrdersTab() {
  const router = useRouter();
  const { view } = useLocalSearchParams<{ view?: string }>();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const capabilities = useCapabilities();
  const buyer = useOrders();
  const seller = useSellerAllocations();
  const canSell = capabilities.isSeller || seller.allocations.length > 0;
  const active: OrderView = view === "selling" && canSell ? "selling" : "buying";

  if (auth.loading) return <View style={[styles.root, styles.center]}><ActivityIndicator color={Colors.greenPrimary} /></View>;
  if (!auth.session) return <Redirect href="/(auth)/sign-in" />;
  const loading = active === "buying" ? buyer.loading : seller.loading;
  const error = active === "buying" ? buyer.error : seller.error;

  return <View style={styles.root}>
    <View style={[styles.head, { paddingTop: insets.top + 12 }]}>
      <Text style={styles.title}>{canSell ? "คำสั่งซื้อและงานขาย" : "คำสั่งซื้อของฉัน"}</Text>
      <Text style={styles.sub}>{active === "buying" ? "ติดตามสินค้าที่คุณสั่งซื้อ" : "รับงานและติดตามสินค้าที่คุณต้องเตรียม"}</Text>
      {canSell ? <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, active === "buying" && styles.tabActive]} onPress={() => router.setParams({ view: "buying" })}><Text style={[styles.tabText, active === "buying" && styles.tabTextActive]}>รายการที่ซื้อ</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.tab, active === "selling" && styles.tabActive]} onPress={() => router.setParams({ view: "selling" })}><Text style={[styles.tabText, active === "selling" && styles.tabTextActive]}>รายการที่ขาย</Text></TouchableOpacity>
      </View> : null}
    </View>
    <ScrollView contentContainerStyle={styles.content}>
      {loading ? <ActivityIndicator color={Colors.greenPrimary} /> : null}
      {error ? <Text style={styles.error}>โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</Text> : null}
      {active === "buying" ? <>
        {!buyer.loading && !buyer.orders.length ? <Text style={styles.empty}>ยังไม่มีรายการที่คุณสั่งซื้อ</Text> : null}
        {buyer.orders.map((order) => <TouchableOpacity key={order.order_id} style={styles.card} onPress={() => router.push(`/order/${order.order_id}` as never)}>
          <View style={styles.row}><Text style={styles.number}>{order.order_number}</Text><Text style={styles.status}>{buyerOrderStatusLabel(order.status)}</Text></View>
          <Text style={styles.market}>{order.markets?.name ?? "ตลาดชุมชน"} · {order.fulfillment_method === "pickup" ? "นัดรับที่จุดรวม" : "จัดส่งถึงที่อยู่"}</Text>
          <Text style={styles.date}>วันที่สั่ง {formatThaiDateTime(order.created_at)}</Text>
          {order.order_items?.map((item: any) => <ProductRow key={item.order_item_id} item={item} quantity={item.quantity} total={Number(item.total_amount)} />)}
          <View style={[styles.row, styles.footer]}><Text style={styles.detailLink}>ดูรายละเอียดคำสั่งซื้อ</Text><Text style={styles.total}>฿{Number(order.total_amount).toLocaleString()}</Text></View>
        </TouchableOpacity>)}
      </> : <>
        {!seller.loading && !seller.allocations.length ? <Text style={styles.empty}>ยังไม่มีรายการสินค้าที่ต้องเตรียม</Text> : null}
        {seller.allocations.map((allocation) => {
          const item = allocation.order_items; const order = item?.orders; const subtotal = allocation.quantity * Number(item?.unit_price ?? 0);
          return <TouchableOpacity key={allocation.allocation_id} style={styles.card} onPress={() => router.push(`/seller/allocations/${allocation.allocation_id}` as never)}>
            <View style={styles.row}><Text style={styles.number}>{order?.order_number}</Text><Text style={styles.status}>{sellerAllocationStatusLabel(allocation.status)}</Text></View>
            <Text style={styles.market}>{item?.stores?.name ?? "ร้านค้า"} · {item?.stores?.markets?.name ?? "ตลาดชุมชน"}</Text>
            <Text style={styles.date}>วันที่ลูกค้าสั่ง {formatThaiDateTime(order?.created_at)}</Text>
            <ProductRow item={item} quantity={allocation.quantity} total={subtotal} />
            <View style={[styles.row, styles.footer]}><Text style={styles.detailLink}>{allocation.status === "awaiting_preparation" ? "เปิดเพื่อรับออเดอร์" : allocation.status === "preparing" ? "เปิดเพื่อแจ้งว่าเตรียมเสร็จ" : "ดูรายละเอียดงานขาย"}</Text><Text style={styles.total}>฿{subtotal.toLocaleString()}</Text></View>
          </TouchableOpacity>;
        })}
      </>}
    </ScrollView>
  </View>;
}

function ProductRow({ item, quantity, total }: { item: any; quantity: number; total: number }) {
  const image = item?.product_image_url || item?.stores?.image_url;
  return <View style={styles.itemRow}>{image ? <Image source={{ uri: image }} style={styles.itemImage} /> : <View style={styles.itemImagePlaceholder} />}<View style={styles.itemText}><Text style={styles.item}>{item?.product_name} × {quantity} {item?.unit}</Text><Text style={styles.store}>{item?.stores?.name ?? "ร้านค้า"} · ฿{Number(item?.unit_price ?? 0).toLocaleString()}/{item?.unit}</Text></View><Text style={styles.itemTotal}>฿{total.toLocaleString()}</Text></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background }, center: { alignItems: "center", justifyContent: "center" }, head: { padding: Spacing.lg, backgroundColor: Colors.greenPrimary, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }, title: { fontFamily: "Kanit_700Bold", fontSize: 24, color: "white" }, sub: { fontFamily: "Kanit_400Regular", color: "#DDEBE2" },
  tabs: { flexDirection: "row", backgroundColor: "#FFFFFF22", borderRadius: BorderRadius.round, padding: 4, marginTop: 14 }, tab: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: BorderRadius.round }, tabActive: { backgroundColor: "white" }, tabText: { fontFamily: "Kanit_500Medium", color: "#DDEBE2" }, tabTextActive: { color: Colors.greenPrimary },
  content: { padding: Spacing.lg, paddingBottom: 80 }, card: { padding: Spacing.md, backgroundColor: "white", borderRadius: BorderRadius.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.inputBorder }, row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }, number: { fontFamily: "Kanit_700Bold", color: Colors.textDark, flex: 1 }, status: { fontFamily: "Kanit_500Medium", fontSize: 11, color: Colors.greenPrimary, backgroundColor: "#EAF1E9", paddingHorizontal: 7, paddingVertical: 5, borderRadius: 8, maxWidth: "48%", textAlign: "center" }, market: { fontFamily: "Kanit_500Medium", color: Colors.textMedium, marginTop: 8 }, date: { fontFamily: "Kanit_400Regular", fontSize: 12, color: Colors.textMuted, marginBottom: 10 }, itemRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.inputBorder, gap: 10 }, itemImage: { width: 58, height: 58, borderRadius: 10, backgroundColor: "#EAF1E9" }, itemImagePlaceholder: { width: 58, height: 58, borderRadius: 10, backgroundColor: "#EAF1E9" }, itemText: { flex: 1 }, item: { fontFamily: "Kanit_500Medium", color: Colors.textDark }, store: { fontFamily: "Kanit_400Regular", fontSize: 12, color: Colors.textMuted }, itemTotal: { fontFamily: "Kanit_700Bold", color: Colors.textDark }, footer: { marginTop: 10 }, detailLink: { fontFamily: "Kanit_500Medium", fontSize: 12, color: Colors.greenPrimary }, total: { fontFamily: "Kanit_700Bold", fontSize: 18, color: Colors.greenPrimary }, error: { color: Colors.danger, fontFamily: "Kanit_400Regular" }, empty: { fontFamily: "Kanit_400Regular", textAlign: "center", color: Colors.textMuted, marginTop: 40 },
});
