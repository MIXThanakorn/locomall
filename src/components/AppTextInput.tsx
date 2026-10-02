import React, { forwardRef } from "react";
import { StyleSheet, TextInput, TextInputProps } from "react-native";
import { Colors } from "../constants/theme";

export const AppTextInput = forwardRef<TextInput, TextInputProps>(function AppTextInput(
  { style, placeholderTextColor = Colors.textMuted, selectionColor = Colors.greenPrimary, ...props },
  ref,
) {
  return <TextInput
    ref={ref}
    {...props}
    style={[style, styles.text]}
    placeholderTextColor={placeholderTextColor}
    selectionColor={selectionColor}
  />;
});

const styles = StyleSheet.create({ text: { color: Colors.textDark } });
