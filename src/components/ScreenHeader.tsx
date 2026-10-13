import { type Href } from "expo-router";
import { type PropsWithChildren, type ReactNode } from "react";
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../constants/theme";
import { BackButton } from "./BackButton";

export const SCREEN_HEADER_GUTTER = 24;
export const SCREEN_HEADER_TOP = 8;

type Props = PropsWithChildren<{
  title?: ReactNode;
  titleStyle?: StyleProp<TextStyle>;
  color?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  fallback?: Href;
  rightAction?: ReactNode;
  /** Horizontal padding already supplied by the parent. Cancel it, then use the shared gutter. */
  contentInset?: number;
  style?: StyleProp<ViewStyle>;
}>;

/** Destination header: same safe-area origin, hit area and title baseline on both platforms. */
export function ScreenHeader({ title, titleStyle, color = Colors.greenPrimary, showBack = true,
  onBackPress, fallback, rightAction, contentInset = SCREEN_HEADER_GUTTER, style, children }: Props) {
  const insets = useSafeAreaInsets();
  return <View style={[style, styles.header, { marginHorizontal: -contentInset, paddingTop: insets.top + SCREEN_HEADER_TOP }]}>
    <View style={styles.row}>
      {showBack ? <BackButton color={color} onPress={onBackPress} fallback={fallback} /> : null}
      <View style={styles.titleBox}>{title ? <Text accessibilityRole="header" numberOfLines={1} ellipsizeMode="tail" style={[styles.title, { color }, titleStyle, styles.titleSpacing]}>{title}</Text> : null}</View>
      {rightAction}
    </View>
    {children}
  </View>;
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: SCREEN_HEADER_GUTTER, paddingBottom: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44 },
  titleBox: { flex: 1, minWidth: 0 },
  title: { fontFamily: "Kanit_700Bold", fontSize: 24 },
  titleSpacing: { margin: 0, marginTop: 0, marginBottom: 0, padding: 0, flex: 0 },
});
