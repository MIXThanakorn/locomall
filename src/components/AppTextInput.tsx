import React, { forwardRef } from "react";
import { StyleSheet, TextInput, TextInputProps } from "react-native";
import { Colors } from "../constants/theme";
import { useFocusScroller } from "./KeyboardAware";

type Props = TextInputProps & { scrollIntoViewOnFocus?: boolean };

export const AppTextInput = forwardRef<TextInput, Props>(function AppTextInput(
  { style, onFocus, scrollIntoViewOnFocus = true, placeholderTextColor = Colors.textMuted, selectionColor = Colors.greenPrimary, ...props },
  ref,
) {
  const scrollToFocus = useFocusScroller();
  return <TextInput
    ref={ref}
    {...props}
    onFocus={(event) => { if (scrollIntoViewOnFocus) scrollToFocus?.(event.nativeEvent.target); onFocus?.(event); }}
    style={[style, styles.text]}
    placeholderTextColor={placeholderTextColor}
    selectionColor={selectionColor}
  />;
});

const styles = StyleSheet.create({ text: { color: Colors.textDark } });
