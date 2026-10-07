import { StyleSheet, Text, View } from "react-native";
import { AppTextInput } from "./AppTextInput";
import { DropdownOption, SearchableDropdown } from "./SearchableDropdown";
import { BorderRadius, Colors } from "../constants/theme";
import { PRODUCT_UNITS, isWeightUnit, normalizeWeightInput } from "../lib/productUnit";

type Props = {
  kind: string;
  amount: string;
  onKindChange: (kind: string) => void;
  onAmountChange: (amount: string) => void;
  disabled?: boolean;
};

export function ProductUnitField({ kind, amount, onKindChange, onAmountChange, disabled = false }: Props) {
  const options: DropdownOption[] = PRODUCT_UNITS.map((unit) => ({ value: unit, label: unit }));
  if (kind && !PRODUCT_UNITS.some((unit) => unit === kind)) {
    options.push({ value: kind, label: `${kind} (หน่วยเดิม)` });
  }
  return <View>
    <SearchableDropdown label="หน่วยขายต่อ 1 รายการ" placeholder="เลือกหน่วยสินค้า" options={options} value={kind} onChange={onKindChange} autoFocusSearch={false} disabled={disabled} />
    {isWeightUnit(kind) ? <>
      <Text style={styles.label}>ปริมาณต่อ 1 หน่วยสั่งซื้อ ({kind})</Text>
      <AppTextInput
        style={styles.input}
        value={amount}
        onChangeText={(value) => onAmountChange(normalizeWeightInput(value, kind))}
        editable={!disabled}
        keyboardType={kind === "กรัม" ? "number-pad" : "decimal-pad"}
        placeholder={kind === "กรัม" ? "เช่น 500" : "เช่น 0.5 หรือ 1.25"}
        accessibilityLabel={`ปริมาณ${kind}ต่อ 1 หน่วยสั่งซื้อ`}
      />
    </> : null}
    {disabled ? <Text style={styles.locked}>ร้านที่อนุมัติแล้วเปลี่ยนหน่วยขายไม่ได้ เพราะจะทำให้สต็อกและตะกร้าที่มีอยู่ถูกตีความผิด หากต้องขายขนาดใหม่ให้ขอเปิดร้านสินค้าใหม่</Text> : null}
    <Text style={styles.hint}>{isWeightUnit(kind)
      ? "ราคาและสต็อกคิดต่อ 1 หน่วยที่เลือก เช่น 500 กรัม × 2 คือ 1 กิโลกรัม"
      : "ราคาและสต็อกคิดต่อ 1 หน่วยที่เลือก"}</Text>
  </View>;
}

const styles = StyleSheet.create({
  label: { fontFamily: "Kanit_500Medium", color: Colors.textDark, marginBottom: 6 },
  input: { minHeight: 54, backgroundColor: "white", borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: BorderRadius.md, padding: 14, marginBottom: 10 },
  hint: { fontFamily: "Kanit_400Regular", fontSize: 12, color: Colors.textMuted, marginBottom: 12 },
  locked: { fontFamily: "Kanit_400Regular", fontSize: 12, color: Colors.danger, marginBottom: 8 },
});
