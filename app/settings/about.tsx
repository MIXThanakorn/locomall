import { ScreenHeader } from "../../src/components/ScreenHeader";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../../src/constants/theme";

export default function AboutLocomall() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return <ScrollView contentContainerStyle={[styles.content, { paddingTop: 0, paddingBottom: insets.bottom + 24 }]}>
    <ScreenHeader contentInset={20} title="เกี่ยวกับ Locomall" titleStyle={styles.heading} />
    <View style={styles.card}><Text style={styles.title}>ตลาดชุมชนออนไลน์</Text><Text style={styles.body}>เชื่อมผู้ซื้อ ร้านค้า และเจ้าของตลาด พร้อมรวมสินค้าที่จุดรวมก่อนจัดส่งหรือรับด้วยตนเอง</Text><Text style={styles.version}>เวอร์ชัน {Constants.expoConfig?.version ?? "1.0.0"}</Text></View>
    <View style={styles.card}><Text style={styles.title}>ขอบเขตระบบสาธิต</Text><Text style={styles.body}>Wallet และการเติมยอดเป็นเงินจำลองเท่านั้น ไม่ใช่เงินจริง ไม่สามารถถอนหรือโอนเข้าบัญชีธนาคารได้ และห้ามใช้ QR สาธิตโอนผ่านแอปธนาคาร</Text></View>
    <View style={styles.card}><Text style={styles.title}>สิทธิ์ของอุปกรณ์</Text><Text style={styles.body}>ตำแหน่งใช้ค้นหาตลาดและร้านค้าใกล้คุณ ส่วนสิทธิ์การแจ้งเตือนใช้รับข้อความและความคืบหน้าที่เกี่ยวข้อง คุณเปลี่ยนสิทธิ์ได้จากการตั้งค่าของเครื่อง</Text></View>
    <TouchableOpacity style={styles.link} onPress={() => router.push("/guide" as never)}><Text style={styles.linkText}>เปิดคู่มือการใช้งาน</Text></TouchableOpacity>
  </ScrollView>;
}
const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: 20, backgroundColor: Colors.background }, header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  heading: { fontFamily: "Kanit_700Bold", color: Colors.greenPrimary, fontSize: 22, flex: 1 }, card: { borderRadius: 16, padding: 18, backgroundColor: Colors.cardBackground, marginBottom: 14 },
  title: { fontFamily: "Kanit_700Bold", color: Colors.textDark, fontSize: 17 }, body: { fontFamily: "Kanit_400Regular", color: Colors.textMedium, fontSize: 14, lineHeight: 24, marginTop: 8 },
  version: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, fontSize: 12, marginTop: 12 }, link: { padding: 14, alignItems: "center" }, linkText: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary },
});
