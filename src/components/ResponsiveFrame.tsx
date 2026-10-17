import { createContext, useContext, useState, type PropsWithChildren } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { Colors } from "../constants/theme";
import { responsiveMetrics, SCREEN_MAX_WIDTH } from "../lib/responsiveLayout";

const WidthContext = createContext<number | null>(null);

/** Shared by every route, including nested auth/admin/seller screens. */
export function ResponsiveFrame({ children }: PropsWithChildren) {
  const window = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);
  return <View style={styles.background}>
    <View style={styles.frame} onLayout={(event) => setMeasuredWidth(event.nativeEvent.layout.width)}>
      <WidthContext.Provider value={Math.min(measuredWidth ?? window.width, window.width, SCREEN_MAX_WIDTH)}>{children}</WidthContext.Provider>
    </View>
  </View>;
}

export function useResponsiveLayout() {
  const window = useWindowDimensions();
  const measuredWidth = useContext(WidthContext);
  return responsiveMetrics(measuredWidth ?? window.width, window.height, window.fontScale);
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: "#EAF0E9", alignItems: "center" },
  frame: { flex: 1, width: "100%", maxWidth: SCREEN_MAX_WIDTH, backgroundColor: Colors.background },
});
