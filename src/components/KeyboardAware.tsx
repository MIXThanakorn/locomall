import React, { createContext, useCallback, useContext, useEffect, useRef } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  KeyboardAvoidingViewProps,
  Platform,
  ScrollView,
  ScrollViewProps,
  StyleSheet,
} from "react-native";

type FocusScroller = (target: number) => void;
const FocusScrollContext = createContext<FocusScroller | null>(null);
export function useFocusScroller() { return useContext(FocusScrollContext); }

export function KeyboardAwareView({
  children,
  behavior,
  style,
  ...props
}: KeyboardAvoidingViewProps) {
  return (
    <KeyboardAvoidingView
      {...props}
      behavior={behavior ?? (Platform.OS === "ios" ? "padding" : undefined)}
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
  const scrollRef = useRef<ScrollView>(null);
  const focusedTarget = useRef<number | null>(null);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealFocused = useCallback(() => {
    if (focusedTarget.current == null || Platform.OS === "web") return;
    scrollRef.current?.getScrollResponder()?.scrollResponderScrollNativeHandleToKeyboard(
      focusedTarget.current, 84, true,
    );
  }, []);
  const focusScroll = useCallback<FocusScroller>((target) => {
    focusedTarget.current = target;
    if (focusTimer.current) clearTimeout(focusTimer.current);
    // Wait for Android adjustResize / iOS keyboard animation before measuring.
    focusTimer.current = setTimeout(revealFocused, 180);
  }, [revealFocused]);
  useEffect(() => {
    if (Platform.OS === "web") return;
    const shown = Keyboard.addListener("keyboardDidShow", revealFocused);
    return () => { shown.remove(); if (focusTimer.current) clearTimeout(focusTimer.current); };
  }, [revealFocused]);
  return (
    <KeyboardAwareView>
      <FocusScrollContext.Provider value={focusScroll}>
        <ScrollView
          ref={(instance) => {
            scrollRef.current = instance;
            if (typeof ref === "function") ref(instance);
            else if (ref) ref.current = instance;
          }}
          {...props}
          contentContainerStyle={contentContainerStyle}
          keyboardDismissMode={keyboardDismissMode ?? (Platform.OS === "ios" ? "interactive" : "on-drag")}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps ?? "handled"}
        >
          {children}
        </ScrollView>
      </FocusScrollContext.Provider>
    </KeyboardAwareView>
  );
});

const styles = StyleSheet.create({ fill: { flex: 1 } });
