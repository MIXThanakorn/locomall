import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors, Spacing } from "../../src/constants/theme";
import { useCapabilities } from "../../src/hooks/useCapabilities";

export default function SellerDashboard() {
  const router = useRouter();
  const permissions = useCapabilities();
  if (permissions.loading) return <View style={styles.center}><ActivityIndicator color={Colors.greenPrimary} /></View>;

  const actions = [
    { show: permissions.isStoreManager, title: "จัดการร้านของฉัน", desc: "แก้ไขชื่อสินค้า ราคา และรายละเอียดร้าน", icon: "create-outline", route: "/seller/stores" },
    { show: permissions.isSeller || permissions.isStoreManager, title: "จำนวนสินค้าที่พร้อมขาย", desc: "เพิ่มหรือลดจำนวนสินค้าของคุณ", icon: "cube-outline", route: "/seller/listings" },
    { show: permissions.isSeller, title: "รายการสินค้าที่ต้องเตรียม", desc: "ดูจำนวนที่ต้องเตรียมและแจ้งเมื่อสินค้าเสร็จแล้ว", icon: "clipboard-outline", route: "/seller/allocations" },
    { show: permissions.isMarketOwner || permissions.isAdmin, title: "จัดการตลาดชุมชน", desc: "แก้ไขข้อมูล ตรวจคำขอ ดูร้านค้า และจัดการจุดรวมสินค้า", icon: "business-outline", route: "/market/manage/home" },
    { show: permissions.isMarketOwner || permissions.isAdmin, title: "จุดรวมและจัดส่ง", desc: "รับของ รวมพัสดุ และบันทึกเลขติดตาม", icon: "car-outline", route: "/market/manage/logistics" },
  ].filter((item) => item.show);

  return <ScrollView contentContainerStyle={styles.root}>
    <Text style={styles.title}>งานขายสินค้าของฉัน</Text>
    <Text style={styles.sub}>ดูแลร้าน จำนวนสินค้า และงานที่ต้องเตรียมได้จากหน้านี้</Text>
    {!actions.length ? <View style={styles.empty}><Text style={styles.emptyTitle}>ยังไม่มีสิทธิ์จัดการร้าน</Text><Text style={styles.desc}>สมัครเปิดร้านหรือเข้าร่วมขายในร้านที่อยู่ตำบลเดียวกับคุณก่อน</Text></View> : null}
    {actions.map((action) => <TouchableOpacity key={action.route} style={styles.card} onPress={() => router.push(action.route as never)}>
      <View style={styles.icon}><Ionicons name={action.icon as any} size={25} color={Colors.greenPrimary} /></View>
      <View style={{ flex: 1 }}><Text style={styles.name}>{action.title}</Text><Text style={styles.desc}>{action.desc}</Text></View>
      <Ionicons name="chevron-forward" size={20} />
    </TouchableOpacity>)}
  </ScrollView>;
}

const styles = StyleSheet.create({
  root: { padding: Spacing.lg, paddingTop: 60, backgroundColor: Colors.background, flexGrow: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.background },
  title: { fontFamily: "Kanit_700Bold", fontSize: 25, color: Colors.greenPrimary },
  sub: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, marginBottom: 12 },
  card: { padding: 16, backgroundColor: "white", borderRadius: 16, marginTop: 10, flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { width: 48, height: 48, borderRadius: 14, backgroundColor: "#EAF1E9", alignItems: "center", justifyContent: "center" },
  name: { fontFamily: "Kanit_700Bold" }, desc: { fontFamily: "Kanit_400Regular", color: Colors.textMuted },
  empty: { backgroundColor: "white", padding: 20, borderRadius: 16, marginTop: 12 }, emptyTitle: { fontFamily: "Kanit_700Bold", color: Colors.greenPrimary },
});
