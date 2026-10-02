import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AppTextInput } from "./AppTextInput";
import { BorderRadius, Colors, Spacing } from "../constants/theme";
import { KeyboardAwareView } from "./KeyboardAware";

export type DropdownOption = { value: string; label: string; description?: string };

type Props = {
  label?: string;
  placeholder: string;
  options: DropdownOption[];
  value?: string;
  disabled?: boolean;
  searchPlaceholder?: string;
  onChange: (value: string) => void;
};

export function SearchableDropdown({ label, placeholder, options, value, disabled, searchPlaceholder, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((option) => option.value === value);
  const filtered = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase("th");
    if (!keyword) return options;
    return options.filter((option) => `${option.label} ${option.description ?? ""}`.toLocaleLowerCase("th").includes(keyword));
  }, [options, query]);
  const close = () => { setOpen(false); setQuery(""); };

  return <View style={styles.block}>
    {label ? <Text style={styles.label}>{label}</Text> : null}
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label ?? placeholder}
      disabled={disabled}
      style={[styles.dropdown, disabled && styles.disabled]}
      onPress={() => setOpen(true)}
    >
      <View style={styles.selectedCopy}>
        <Text numberOfLines={1} style={[styles.dropdownText, !selected && styles.placeholder]}>{selected?.label ?? placeholder}</Text>
        {selected?.description ? <Text numberOfLines={1} style={styles.selectedDescription}>{selected.description}</Text> : null}
      </View>
      <Ionicons name="chevron-down" size={20} color={disabled ? Colors.textMuted : Colors.greenPrimary} />
    </TouchableOpacity>

    <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAwareView style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={close} />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{label ?? placeholder}</Text>
            <TouchableOpacity accessibilityLabel="ปิด" onPress={close}><Ionicons name="close" size={24} color={Colors.textDark} /></TouchableOpacity>
          </View>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={Colors.textMuted} />
            <AppTextInput value={query} onChangeText={setQuery} placeholder={searchPlaceholder ?? `ค้นหา${label ?? "รายการ"}`} style={styles.searchInput} autoFocus />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" style={styles.optionList}>
            {filtered.map((option) => <TouchableOpacity
              key={option.value}
              style={[styles.option, value === option.value && styles.optionSelected]}
              onPress={() => { onChange(option.value); close(); }}
            >
              <View style={styles.optionCopy}>
                <Text style={[styles.optionText, value === option.value && styles.optionTextSelected]}>{option.label}</Text>
                {option.description ? <Text style={styles.optionDescription}>{option.description}</Text> : null}
              </View>
              {value === option.value ? <Ionicons name="checkmark" size={20} color={Colors.greenPrimary} /> : null}
            </TouchableOpacity>)}
            {!filtered.length ? <Text style={styles.empty}>ไม่พบรายการ</Text> : null}
          </ScrollView>
        </View>
      </KeyboardAwareView>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  block: { marginBottom: 16 },
  label: { fontFamily: "Kanit_700Bold", fontSize: 15, color: Colors.textDark, marginBottom: 8 },
  dropdown: { minHeight: 54, borderRadius: BorderRadius.md, backgroundColor: "white", borderWidth: 1, borderColor: Colors.inputBorder, paddingHorizontal: 16, paddingVertical: 9, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  disabled: { opacity: 0.5, backgroundColor: "#F2F2EE" },
  selectedCopy: { flex: 1 },
  dropdownText: { fontFamily: "Kanit_500Medium", fontSize: 16, color: Colors.textDark },
  placeholder: { color: Colors.textMuted, fontFamily: "Kanit_400Regular" },
  selectedDescription: { fontFamily: "Kanit_400Regular", fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  overlay: { flex: 1, backgroundColor: "#00000066", justifyContent: "flex-end" },
  sheet: { maxHeight: "72%", backgroundColor: Colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, paddingBottom: 34 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sheetTitle: { fontFamily: "Kanit_700Bold", fontSize: 21, color: Colors.greenPrimary },
  searchBox: { height: 46, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "white", borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: BorderRadius.round, paddingHorizontal: 14, marginBottom: 10 },
  searchInput: { flex: 1, fontFamily: "Kanit_400Regular", color: Colors.textDark },
  optionList: { flexGrow: 0 },
  option: { minHeight: 50, paddingHorizontal: 12, paddingVertical: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.inputBorder },
  optionSelected: { backgroundColor: "#EAF1E9", borderRadius: BorderRadius.sm },
  optionCopy: { flex: 1, paddingRight: 8 },
  optionText: { fontFamily: "Kanit_400Regular", fontSize: 16, color: Colors.textDark },
  optionTextSelected: { fontFamily: "Kanit_700Bold", color: Colors.greenPrimary },
  optionDescription: { fontFamily: "Kanit_400Regular", fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  empty: { fontFamily: "Kanit_400Regular", color: Colors.textMuted, textAlign: "center", padding: 24 },
});
