import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";
import { ADMIN_SECTIONS, type AdminSection } from "../lib/adminWorkspace";
import { Colors } from "../constants/theme";

/** Every admin tool remains one tap away, without crowding the bottom tab bar. */
export function AdminSectionNav({ active }: { active: AdminSection }) {
  const router = useRouter();
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.row}>
    {ADMIN_SECTIONS.map((section) => <TouchableOpacity key={section.key} accessibilityRole="button"
      accessibilityState={{ selected: active === section.key }} accessibilityLabel={section.label}
      onPress={() => { if (section.key !== active) router.replace(section.route as never); }}
      style={[styles.chip, active === section.key && styles.active]}>
      <Ionicons name={section.icon} size={17} color={active === section.key ? "white" : Colors.greenPrimary} />
      <Text style={[styles.label, active === section.key && styles.activeLabel]}>{section.label}</Text>
    </TouchableOpacity>)}
  </ScrollView>;
}
const styles = StyleSheet.create({
  scroll: { flexGrow: 0, marginVertical: 12 }, row: { gap: 8, paddingVertical: 2 },
  chip: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 22, backgroundColor: "white", borderWidth: 1, borderColor: Colors.inputBorder },
  active: { backgroundColor: Colors.greenPrimary, borderColor: Colors.greenPrimary }, label: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary, fontSize: 12 }, activeLabel: { color: "white" },
});
