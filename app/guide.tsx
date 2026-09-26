import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BorderRadius, Colors, Spacing } from "../src/constants/theme";

type SectionKey = "buyer" | "seller" | "owner";
type GuideSection = { label: string; icon: keyof typeof Ionicons.glyphMap; title: string; intro: string; steps: { title: string; detail: string }[] };

const guides: Record<SectionKey, GuideSection> = {
  buyer: {
    label: "ซื้อสินค้า", icon: "basket-outline", title: "วิธีซื้อสินค้า", intro: "ค้นหาของใกล้บ้าน เลือกสินค้า และติดตามจนได้รับสินค้า",
    steps: [
      { title: "ค้นหาตลาดหรือร้านค้า", detail: "เปิดหน้าใกล้ฉัน ระบบจะแสดงตลาดและร้านที่อยู่ใกล้ก่อน" },
      { title: "เลือกสินค้าใส่ตะกร้า", detail: "สินค้าหนึ่งตะกร้าต้องมาจากตลาดชุมชนเดียวกัน เพื่อรวมส่งเป็นพัสดุเดียว" },
      { title: "เลือกวิธีรับสินค้า", detail: "เลือกรับที่บ้าน หรือเลือกนัดรับที่จุดรวมเมื่ออยู่ในระยะไม่เกิน 10 กิโลเมตร" },
      { title: "ติดตามคำสั่งซื้อ", detail: "ดูได้ที่เมนูคำสั่งซื้อ และกดยืนยันเมื่อได้รับสินค้าเรียบร้อยแล้ว" },
    ],
  },
  seller: {
    label: "ขายสินค้า", icon: "storefront-outline", title: "วิธีเริ่มขายสินค้า", intro: "เปิดร้านใหม่ หรือขอร่วมขายสินค้าในร้านที่มีอยู่แล้ว",
    steps: [
      { title: "ตรวจพื้นที่หลัก", detail: "พื้นที่หลักของคุณต้องเป็นตำบลเดียวกับตลาดชุมชนที่ต้องการขาย" },
      { title: "เลือกวิธีเริ่มขาย", detail: "เปิดร้านใหม่หากยังไม่มีสินค้านั้น หรือเปิดหน้าร้านเดิมแล้วเลือกขอร่วมขาย" },
      { title: "รอการตรวจสอบ", detail: "เจ้าของตลาดจะตรวจข้อมูล หากไม่ผ่านจะมีเหตุผลแจ้งกลับมา" },
      { title: "ใส่จำนวนสินค้าที่พร้อมขาย", detail: "เมื่อได้รับอนุมัติ ให้เปิดงานขายสินค้าของฉัน แล้วกรอกจำนวนที่ขายได้จริง" },
      { title: "เตรียมสินค้าตามคำสั่งซื้อ", detail: "เมื่อมีรายการเข้ามา ให้เตรียมตามจำนวนและกดแจ้งเมื่อพร้อมให้เจ้าของตลาดมารับ" },
    ],
  },
  owner: {
    label: "ดูแลตลาด", icon: "people-outline", title: "วิธีดูแลตลาดชุมชน", intro: "ตรวจคำขอ ดูแลร้าน และรวมสินค้าจากผู้ขาย",
    steps: [
      { title: "ตรวจคำขอ", detail: "เปิดคำขอที่รอตรวจสอบ อ่านรายละเอียดร้าน สินค้า ราคา และข้อมูลผู้สมัครก่อนตัดสินใจ" },
      { title: "แจ้งเหตุผลเมื่อปฏิเสธ", detail: "เขียนเหตุผลให้ชัดเจน เพื่อให้ผู้สมัครกลับไปแก้ข้อมูลได้ถูกต้อง" },
      { title: "รับสินค้าจากผู้ขาย", detail: "เมื่อผู้ขายแจ้งว่าพร้อม ให้บันทึกว่ารับสินค้าแล้วและนำไปยังจุดรวม" },
      { title: "รวมและส่งสินค้า", detail: "เมื่อสินค้าครบทุกชิ้น จึงรวมเป็นพัสดุเดียวและบันทึกการจัดส่ง" },
    ],
  },
};

export default function GuideScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ section?: string }>();
  const initial = params.section && params.section in guides ? params.section as SectionKey : "buyer";
  const [selected, setSelected] = useState<SectionKey>(initial);
  const guide = guides[selected];

  return <View style={styles.root}>
    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()} accessibilityLabel="กลับหน้าก่อนหน้า"><Ionicons name="arrow-back" size={23} color={Colors.greenPrimary} /></TouchableOpacity>
      <View style={{ flex: 1 }}><Text style={styles.heading}>คู่มือการใช้งาน</Text><Text style={styles.headerSub}>เลือกเรื่องที่ต้องการดูได้เลย</Text></View>
    </View>
    <ScrollView contentContainerStyle={styles.content}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {(Object.keys(guides) as SectionKey[]).map((key) => <TouchableOpacity key={key} style={[styles.tab, selected === key && styles.activeTab]} onPress={() => setSelected(key)}>
          <Ionicons name={guides[key].icon} size={18} color={selected === key ? Colors.textWhite : Colors.greenPrimary} />
          <Text style={[styles.tabText, selected === key && styles.activeTabText]}>{guides[key].label}</Text>
        </TouchableOpacity>)}
      </ScrollView>
      <View style={styles.intro}><Text style={styles.title}>{guide.title}</Text><Text style={styles.introText}>{guide.intro}</Text></View>
      {guide.steps.map((step, index) => <View key={step.title} style={styles.card}>
        <View style={styles.number}><Text style={styles.numberText}>{index + 1}</Text></View>
        <View style={{ flex: 1 }}><Text style={styles.stepTitle}>{step.title}</Text><Text style={styles.detail}>{step.detail}</Text></View>
      </View>)}
      <View style={styles.notice}><Ionicons name="information-circle-outline" size={23} color={Colors.goldDark} /><View style={{ flex: 1 }}><Text style={styles.noticeTitle}>หากทำต่อไม่ได้</Text><Text style={styles.detail}>อ่านข้อความแจ้งเตือนบนหน้าจอก่อน แล้วตรวจพื้นที่หลัก จำนวนสินค้า และสถานะคำขอของคุณ</Text></View></View>
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.lg, paddingBottom: 18, backgroundColor: Colors.goldPrimary, flexDirection: "row", alignItems: "center", gap: 13, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.cardBackground, alignItems: "center", justifyContent: "center" },
  heading: { fontFamily: "Kanit_700Bold", fontSize: 25, color: Colors.greenPrimary }, headerSub: { fontFamily: "Kanit_400Regular", color: Colors.greenDark },
  content: { padding: Spacing.lg, paddingBottom: 70 }, tabs: { gap: 8, paddingRight: Spacing.lg },
  tab: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: Colors.greenPrimary, borderRadius: BorderRadius.round, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: Colors.cardBackground },
  activeTab: { backgroundColor: Colors.greenPrimary }, tabText: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary }, activeTabText: { color: Colors.textWhite },
  intro: { marginTop: Spacing.lg, marginBottom: 5 }, title: { fontFamily: "Kanit_700Bold", fontSize: 23, color: Colors.textDark }, introText: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, lineHeight: 21 },
  card: { flexDirection: "row", gap: 12, padding: 16, marginTop: 10, backgroundColor: Colors.cardBackground, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.inputBorder },
  number: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.greenPrimary, alignItems: "center", justifyContent: "center" }, numberText: { fontFamily: "Kanit_700Bold", color: Colors.textWhite },
  stepTitle: { fontFamily: "Kanit_700Bold", color: Colors.textDark, fontSize: 16 }, detail: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, lineHeight: 21 },
  notice: { flexDirection: "row", gap: 10, padding: 16, marginTop: Spacing.lg, borderRadius: BorderRadius.lg, backgroundColor: "#FFF5D9" }, noticeTitle: { fontFamily: "Kanit_700Bold", color: Colors.textDark },
});
