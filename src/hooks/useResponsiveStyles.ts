import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from "react-native";
import { useResponsiveLayout } from "../components/ResponsiveFrame";

type Named = Record<string, ViewStyle | TextStyle | ImageStyle>;
type Rules<T> = { stack?: readonly (keyof T)[]; wrap?: readonly (keyof T)[]; fullWidth?: readonly (keyof T)[]; compactPadding?: readonly (keyof T)[] };

/** Explicit row rules: never turn a composer, stepper or horizontal scroller into a column. */
export function useResponsiveStyles<T extends Named>(base: T, rules: Rules<T> = {}): T {
  const layout = useResponsiveLayout();
  const result: Named = {};
  for (const key of Object.keys(base)) {
    const value = StyleSheet.flatten(base[key]);
    const text = value as TextStyle;
    result[key] = {
      ...value,
      // Long Thai names, amounts and email addresses must be allowed to shrink/wrap.
      ...("fontFamily" in value || "fontSize" in value || value.flex === 1 ? { minWidth: 0, flexShrink: value.flexShrink ?? 1 } : {}),
      ...(rules.wrap?.includes(key) ? { flexWrap: "wrap", gap: 12 } : {}),
      ...(rules.stack?.includes(key) ? {
        gap: Math.max(typeof value.gap === "number" ? value.gap : 0, 12),
        ...(layout.stack ? { flexDirection: "column", alignItems: "stretch" } : {}),
      } : {}),
      ...(layout.stack && rules.fullWidth?.includes(key) ? { width: "100%", maxWidth: "100%", flex: 0 } : {}),
      ...(layout.stack && rules.compactPadding?.includes(key) ? { padding: 16, paddingHorizontal: 16, paddingVertical: 16 } : {}),
      // Avoid fixed text line boxes clipping scaled Thai vowels and tone marks.
      ...(text.lineHeight && text.fontSize && text.lineHeight < text.fontSize * 1.4 ? { lineHeight: Math.ceil(text.fontSize * 1.4) } : {}),
    } as ViewStyle;
  }
  return result as T;
}
