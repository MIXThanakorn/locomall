import { useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Measure the actual wrapped button, including font scaling and system insets. */
export function useBottomActionLayout() {
  const insets = useSafeAreaInsets();
  const [height, setHeight] = useState(100 + insets.bottom);
  return {
    height,
    contentBottom: height + 24,
    paddingBottom: Math.max(16, insets.bottom + 12),
    onLayout: (event: LayoutChangeEvent) => setHeight(event.nativeEvent.layout.height),
  };
}
