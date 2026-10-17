import React, { forwardRef } from "react";
import { StyleSheet, TextInput, TextInputProps } from "react-native";
import { Colors } from "../constants/theme";
import { useResponsiveLayout } from "./ResponsiveFrame";
import { useFocusScroller } from "./KeyboardAware";

type Props = TextInputProps & { scrollIntoViewOnFocus?: boolean };

export const AppTextInput = forwardRef<TextInput, Props>(function AppTextInput(
  { style, onFocus, onBlur, scrollIntoViewOnFocus = true, placeholderTextColor = Colors.textMuted, selectionColor = Colors.greenPrimary, ...props },
  ref,
) {
  const scrollToFocus = useFocusScroller();
  const { fontScale } = useResponsiveLayout();
  const flat = StyleSheet.flatten(style) ?? {};
  const lineHeight = (flat.fontSize ?? 15) * fontScale * 1.5;
  const scaledHeight = typeof flat.height === "number" && !props.multiline
    ? { height: "auto" as const, minHeight: Math.max(flat.height, lineHeight + 12) } : undefined;
  return <TextInput
    ref={ref}
    {...props}
    onFocus={(event) => { if (scrollIntoViewOnFocus) scrollToFocus?.(event.nativeEvent.target); onFocus?.(event); }}
    onBlur={(event) => { if (scrollIntoViewOnFocus) scrollToFocus?.(event.nativeEvent.target, false); onBlur?.(event); }}
    style={[style, scaledHeight, styles.text]}
    placeholderTextColor={placeholderTextColor}
    selectionColor={selectionColor}
  />;
});

const styles = StyleSheet.create({ text: { color: Colors.textDark, minWidth: 0, flexShrink: 1 } });
