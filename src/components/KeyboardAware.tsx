import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  KeyboardAvoidingViewProps,
  Platform,
  ScrollView,
  ScrollViewProps,
  StyleSheet,
  View,
} from "react-native";

type FocusScroller = (target: number, focused?: boolean) => void;
const FocusScrollContext = createContext<FocusScroller | null>(null);
export function useFocusScroller() { return useContext(FocusScrollContext); }

export function KeyboardAwareView({
  children,
  behavior,
  style,
  keyboardVerticalOffset,
  ...props
}: KeyboardAvoidingViewProps) {
  const container = useRef<View>(null);
  const [screenTop, setScreenTop] = useState(0);
  // RN measures its frame relative to its parent. Forms below a custom header
  // need that parent's screen origin, not a guessed header height.
  const measureOrigin = () => container.current?.measureInWindow((_x, y) => setScreenTop(y));
  return (
    <View ref={container} style={styles.fill} onLayout={measureOrigin} collapsable={false}>
      <KeyboardAvoidingView
        {...props}
        behavior={behavior ?? (Platform.OS === "web" ? undefined : "padding")}
        keyboardVerticalOffset={keyboardVerticalOffset ?? screenTop}
        style={[styles.fill, style]}
      >
        {children}
      </KeyboardAvoidingView>
    </View>
  );
}

export const KeyboardAwareScrollView = React.forwardRef<ScrollView, ScrollViewProps>(function KeyboardAwareScrollView({
  children,
  contentContainerStyle,
  keyboardDismissMode,
  keyboardShouldPersistTaps,
  onLayout,
  ...props
}: ScrollViewProps, ref) {
  const scrollRef = useRef<ScrollView>(null);
  const focusedTarget = useRef<number | null>(null);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealFocused = useCallback(() => {
    if (focusedTarget.current == null || Platform.OS === "web" || !Keyboard.isVisible()) return;
    scrollRef.current?.getScrollResponder()?.scrollResponderScrollNativeHandleToKeyboard(
      focusedTarget.current, 84, true,
    );
  }, []);
  const focusScroll = useCallback<FocusScroller>((target, focused = true) => {
    if (!focused) {
      if (focusedTarget.current === target) focusedTarget.current = null;
      return;
    }
    focusedTarget.current = target;
    if (focusTimer.current) clearTimeout(focusTimer.current);
    // Wait for Android adjustResize / iOS keyboard animation before measuring.
    focusTimer.current = setTimeout(revealFocused, 180);
  }, [revealFocused]);
  useEffect(() => {
    if (Platform.OS === "web") return;
    const shown = Keyboard.addListener("keyboardDidShow", revealFocused);
    const changed = Keyboard.addListener("keyboardDidChangeFrame", revealFocused);
    return () => { shown.remove(); changed.remove(); if (focusTimer.current) clearTimeout(focusTimer.current); };
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
          onLayout={(event) => { onLayout?.(event); revealFocused(); }}
          automaticallyAdjustKeyboardInsets={false}
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
