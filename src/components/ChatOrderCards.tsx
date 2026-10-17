import { useResponsiveStyles } from "../hooks/useResponsiveStyles";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors } from "../constants/theme";
import { type ChatOrderContext, chatOrderDetailPath, shortChatOrderNumber } from "../lib/chatOrderContext";
import { orderStatusLabel } from "../lib/displayText";
import { formatChatDateTime } from "../lib/date";
import { formatSaleQuantity } from "../lib/productUnit";

export function ChatOrderCards({ items, error, onRetry }: { items: ChatOrderContext[]; error: boolean; onRetry: () => void }) {
  const styles = useResponsiveStyles(baseStyles, {"wrap":["toggle"]});
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();
  if (error) return <TouchableOpacity onPress={onRetry} style={styles.card}><Text style={styles.detail}>โหลดออเดอร์ที่เกี่ยวข้องไม่สำเร็จ · แตะเพื่อลองใหม่</Text></TouchableOpacity>;
  if (!items.length) return null;
  return <View style={styles.box}>
    <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)} style={styles.toggle}>
      <Text style={styles.title}>ออเดอร์ที่เกี่ยวข้อง ({items.length})</Text><Text style={styles.detail}>{expanded ? "ย่อ" : "ดูเพิ่มเติม"}</Text>
    </TouchableOpacity>
    {(expanded ? items : items.slice(0, 1)).map((item) => {
      const path = chatOrderDetailPath(item);
      return <View key={item.order_item_id} style={styles.card}>
        <Text style={styles.title}>{shortChatOrderNumber(item.order_number)} · {orderStatusLabel(item.order_status)}</Text>
        <Text style={styles.product} numberOfLines={2}>{item.product_name} × {formatSaleQuantity(item.quantity, item.unit)}</Text>
        <Text style={styles.detail}>ยอดเฉพาะสินค้าร้านนี้ ฿{Number(item.item_amount).toLocaleString()}</Text>
        {expanded ? <Text style={styles.detail}>สั่งเมื่อ {formatChatDateTime(item.created_at)}</Text> : null}
        {path ? <TouchableOpacity accessibilityRole="button" onPress={() => router.push(path as never)} style={styles.open}>
          <Text style={styles.link}>{item.viewer_is_buyer ? "ดูออเดอร์" : "ดูงานขายของฉัน"}</Text>
        </TouchableOpacity> : <Text style={styles.detail}>ข้อมูลสรุปสำหรับผู้ดูแลร้าน</Text>}
      </View>;
    })}
    {expanded ? <Text style={styles.detail}>แสดงไม่เกิน 3 รายการล่าสุด · ตรวจสอบการชำระเงินจากหน้าออเดอร์เท่านั้น</Text> : null}
  </View>;
}
const baseStyles = StyleSheet.create({
  box: { marginBottom: 16 }, toggle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44 },
  card: { borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: 14, backgroundColor: Colors.cardBackground, padding: 14, marginBottom: 8 },
  title: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary }, product: { fontFamily: "Kanit_500Medium", color: Colors.textDark, marginTop: 6 },
  detail: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, fontSize: 12, marginTop: 4 },
  link: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary }, open: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
});
