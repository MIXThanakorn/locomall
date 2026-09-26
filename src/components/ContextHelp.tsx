import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { BorderRadius, Colors, Spacing } from "../constants/theme";

type ContextHelpProps = {
  title: string;
  steps: string[];
  initiallyOpen?: boolean;
};

export function ContextHelp({ title, steps, initiallyOpen = false }: ContextHelpProps) {
  const [open, setOpen] = useState(initiallyOpen);

  return <View style={styles.card}>
    <TouchableOpacity
      style={styles.header}
      onPress={() => setOpen((current) => !current)}
      accessibilityRole="button"
      accessibilityLabel={`${open ? "ซ่อน" : "เปิด"}คำแนะนำ ${title}`}
    >
      <View style={styles.icon}><Ionicons name="help-circle-outline" size={22} color={Colors.greenPrimary} /></View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.toggle}>{open ? "ซ่อน" : "ดูวิธีทำ"}</Text>
      <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={Colors.textMuted} />
    </TouchableOpacity>
    {open ? <View style={styles.body}>
      {steps.map((step, index) => <View key={`${index}-${step}`} style={styles.step}>
        <View style={styles.number}><Text style={styles.numberText}>{index + 1}</Text></View>
        <Text style={styles.description}>{step}</Text>
      </View>)}
    </View> : null}
  </View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#F0F7F2", borderWidth: 1, borderColor: "#CFE2D5", borderRadius: BorderRadius.lg, marginTop: Spacing.md, marginBottom: Spacing.sm, overflow: "hidden" },
  header: { minHeight: 54, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 9 },
  icon: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.cardBackground, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, fontFamily: "Kanit_500Medium", color: Colors.greenPrimary },
  toggle: { fontFamily: "Kanit_400Regular", color: Colors.greenPrimary, fontSize: 12 },
  body: { borderTopWidth: 1, borderTopColor: "#CFE2D5", padding: 14, gap: 11 },
  step: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  number: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.greenPrimary, alignItems: "center", justifyContent: "center" },
  numberText: { fontFamily: "Kanit_500Medium", color: Colors.textWhite, fontSize: 12 },
  description: { flex: 1, fontFamily: "Kanit_400Regular", color: Colors.textMedium, lineHeight: 21 },
});
