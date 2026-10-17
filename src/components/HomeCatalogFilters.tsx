import { useResponsiveStyles } from "../hooks/useResponsiveStyles";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../constants/theme";
import { CATALOG_SORT_OPTIONS, type CatalogSort } from "../lib/catalogSort";

export type HomeFilters = { kind: "all" | "market" | "store"; nearbyOnly: boolean; inStockOnly: boolean; sort: CatalogSort };
const DEFAULTS: HomeFilters = { kind: "all", nearbyOnly: false, inStockOnly: false, sort: "distance" };

export function HomeCatalogFilters({ value, onChange }: { value: HomeFilters; onChange: (next: HomeFilters) => void }) {
  const styles = useResponsiveStyles(baseStyles, {"stack":["actions"]});
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const active = Number(value.nearbyOnly) + Number(value.inStockOnly);
  const sortLabel = CATALOG_SORT_OPTIONS.find((option) => option.value === value.sort)!.label;
  const show = () => { setDraft(value); setOpen(true); };
  return <View style={styles.block}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {([{ value: "all", label: "ทั้งหมด" }, { value: "market", label: "ตลาด" }, { value: "store", label: "ร้านค้า" }] as const).map((option) =>
        <TouchableOpacity key={option.value} accessibilityRole="button" accessibilityState={{ selected: value.kind === option.value }}
          style={[styles.chip, value.kind === option.value && styles.selected]} onPress={() => onChange({ ...value, kind: option.value })}>
          <Text style={[styles.label, value.kind === option.value && styles.selectedLabel]}>{option.label}</Text>
        </TouchableOpacity>)}
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={`เปิดตัวกรองและการเรียงลำดับ ใช้ตัวกรอง ${active} รายการ`}
        onPress={show} style={[styles.chip, styles.filter]}>
        <Ionicons name="options-outline" color={Colors.greenPrimary} size={18} />
        <Text style={styles.label}>ตัวกรอง{active ? ` (${active})` : ""}</Text>
      </TouchableOpacity>
    </ScrollView>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="เปลี่ยนการเรียงลำดับ" onPress={show}>
      <Text numberOfLines={1} style={styles.summary}>{[sortLabel, value.nearbyOnly && "ไม่เกิน 10 กม.", value.inStockOnly && "พร้อมขาย"].filter(Boolean).join(" · ")} ▾</Text>
    </TouchableOpacity>
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
      <View style={styles.overlay}>
        <TouchableOpacity accessibilityLabel="ปิดตัวกรองโดยไม่เปลี่ยนแปลง" style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
        <View accessibilityViewIsModal style={[styles.sheet, { paddingBottom: insets.bottom + 16, maxHeight: "85%" }]}>
          <ScrollView contentContainerStyle={{ paddingBottom: 4 }}>
          <View style={styles.header}><Text style={styles.title}>ตัวกรองและการเรียงลำดับ</Text><TouchableOpacity onPress={() => setOpen(false)} accessibilityLabel="ปิดตัวกรอง" style={styles.close}><Ionicons name="close" size={24} color={Colors.greenPrimary} /></TouchableOpacity></View>
            <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: draft.nearbyOnly }} style={styles.option} onPress={() => setDraft({ ...draft, nearbyOnly: !draft.nearbyOnly })}>
              <Text style={styles.optionText}>ใกล้เคียง ภายใน 10 กม.</Text><Ionicons name={draft.nearbyOnly ? "checkbox" : "square-outline"} size={24} color={Colors.greenPrimary} />
            </TouchableOpacity>
            <Text style={styles.note}>ใช้ตำแหน่งปัจจุบัน หรือพื้นที่หลักหากไม่มีตำแหน่ง</Text>
            <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: draft.inStockOnly }} style={styles.option} onPress={() => setDraft({ ...draft, inStockOnly: !draft.inStockOnly })}>
              <Text style={styles.optionText}>มีสินค้าพร้อมขาย</Text><Ionicons name={draft.inStockOnly ? "checkbox" : "square-outline"} size={24} color={Colors.greenPrimary} />
            </TouchableOpacity>
            <Text style={styles.subtitle}>เรียงตาม</Text>
            {CATALOG_SORT_OPTIONS.map((option) => <TouchableOpacity key={option.value} accessibilityRole="radio" accessibilityState={{ checked: draft.sort === option.value }}
              style={styles.option} onPress={() => setDraft({ ...draft, sort: option.value })}>
              <Text style={styles.optionText}>{option.label}</Text><Ionicons name={draft.sort === option.value ? "radio-button-on" : "radio-button-off"} size={23} color={Colors.greenPrimary} />
            </TouchableOpacity>)}
            <Text style={styles.note}>ตลาดใช้ราคาเริ่มต้น โปรดเทียบหน่วยสินค้าก่อนซื้อ รายการไม่มีราคา/คะแนนอยู่ท้ายเมื่อเลือกเรียงตามข้อมูลนั้น</Text>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.reset} onPress={() => setDraft({ ...DEFAULTS })}><Text style={styles.label}>ล้างตัวกรองหน้าแรก</Text></TouchableOpacity>
            <TouchableOpacity style={styles.apply} onPress={() => { onChange(draft); setOpen(false); }}><Text style={styles.selectedLabel}>ใช้ตัวกรอง</Text></TouchableOpacity>
          </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  </View>;
}

const baseStyles = StyleSheet.create({
  block: { marginVertical: 12, gap: 6 }, row: { flexDirection: "row", gap: 10, paddingBottom: 2 },
  chip: { minHeight: 44, paddingHorizontal: 12, borderRadius: 24, borderWidth: 1, borderColor: "#CFE2D5", backgroundColor: "white", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 5 },
  selected: { backgroundColor: Colors.greenPrimary, borderColor: Colors.greenPrimary },
  filter: { borderStyle: "dashed" }, label: { fontFamily: "Kanit_500Medium", fontSize: 13, color: Colors.greenPrimary },
  selectedLabel: { fontFamily: "Kanit_500Medium", color: "white", fontSize: 14 }, summary: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, fontSize: 12 },
  overlay: { flex: 1, backgroundColor: "#00000066", justifyContent: "flex-end" }, sheet: { width: "100%", maxWidth: 640, alignSelf: "center", backgroundColor: Colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }, title: { flex: 1, fontFamily: "Kanit_700Bold", color: Colors.greenPrimary, fontSize: 19 },
  close: { padding: 10 }, option: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 48, gap: 10 },
  optionText: { flex: 1, fontFamily: "Kanit_400Regular", fontSize: 15, color: Colors.textDark }, note: { fontFamily: "Kanit_400Regular", fontSize: 12, color: Colors.textMuted },
  subtitle: { fontFamily: "Kanit_700Bold", color: Colors.textDark, marginTop: 12, fontSize: 16 }, actions: { flexDirection: "row", gap: 12, paddingTop: 16 },
  reset: { flex: 1, minHeight: 48, padding: 10, alignItems: "center", justifyContent: "center" }, apply: { flex: 1, minHeight: 48, padding: 10, alignItems: "center", justifyContent: "center", backgroundColor: Colors.greenPrimary, borderRadius: 24 },
});
