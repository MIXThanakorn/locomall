import React from "react";
import {
  KeyboardAvoidingView,
  KeyboardAvoidingViewProps,
  Platform,
  ScrollView,
  ScrollViewProps,
  StyleSheet,
} from "react-native";

export function KeyboardAwareView({
  children,
  behavior,
  style,
  ...props
}: KeyboardAvoidingViewProps) {
  return (
    <KeyboardAvoidingView
      {...props}
      behavior={behavior ?? (Platform.OS === "ios" ? "padding" : "height")}
      style={[styles.fill, style]}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

export const KeyboardAwareScrollView = React.forwardRef<ScrollView, ScrollViewProps>(function KeyboardAwareScrollView({
  children,
  contentContainerStyle,
  keyboardDismissMode,
  keyboardShouldPersistTaps,
  ...props
}: ScrollViewProps, ref) {
  return (
    <KeyboardAwareView>
      <ScrollView
        ref={ref}
        {...props}
        contentContainerStyle={contentContainerStyle}
        keyboardDismissMode={keyboardDismissMode ?? (Platform.OS === "ios" ? "interactive" : "on-drag")}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps ?? "handled"}
      >
        {children}
      </ScrollView>
    </KeyboardAwareView>
  );
});

const styles = StyleSheet.create({ fill: { flex: 1 } });
