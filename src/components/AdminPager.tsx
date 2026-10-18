import { StyleSheet, Text, View } from "react-native";
import { Button } from "./Button";
import { Colors } from "../constants/theme";
import { ADMIN_PAGE_SIZE } from "../lib/adminWorkspace";

export function AdminPager({ page, total, disabled, onPage }: { page: number; total: number; disabled: boolean; onPage: (page: number) => void }) {
  return <View style={styles.root}>
    <Text style={styles.label}>หน้า {page + 1} / {Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE))} · ทั้งหมด {total} รายการ</Text>
    <View style={styles.buttons}><Button size="sm" variant="outline" title="ก่อนหน้า" disabled={disabled || page === 0} onPress={() => onPage(page - 1)} />
      <Button size="sm" variant="outline" title="ถัดไป" disabled={disabled || (page + 1) * ADMIN_PAGE_SIZE >= total} onPress={() => onPage(page + 1)} /></View>
  </View>;
}
const styles = StyleSheet.create({ root: { gap: 10, marginVertical: 18 }, label: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, fontSize: 12, textAlign: "center" }, buttons: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12 } });
