import { Ionicons } from "@expo/vector-icons";
import { type Href, useRouter, useSegments } from "expo-router";
import { Keyboard, StyleSheet, TouchableOpacity, type StyleProp, type ViewStyle } from "react-native";
import { Colors } from "../constants/theme";
import { backFallback } from "../lib/backNavigation";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = { onPress?: () => void; fallback?: Href; color?: string; style?: StyleProp<ViewStyle>; floating?: boolean };

/** One visible, accessible back control on both platforms; deep links have a safe destination. */
export function BackButton({ onPress, fallback, color = Colors.greenPrimary, style, floating = false }: Props) {
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const back = () => {
    Keyboard.dismiss();
    if (onPress) return onPress();
    // Leaving mandatory phone completion must not bounce into its auth guard.
    if (segments[0] === "(auth)" && segments[1] === "phone-onboarding") return router.replace("/(auth)/switch-account");
    if (router.canGoBack()) return router.back();
    const destination = fallback ?? backFallback(segments);
    router.replace(destination as Href);
  };
  return <TouchableOpacity onPress={back} accessibilityRole="button" accessibilityLabel="ย้อนกลับ"
    hitSlop={8} activeOpacity={0.7} style={[style, styles.button,
      floating && { position: "absolute", top: insets.top + 8, left: 24, zIndex: 1 }]}>
    <Ionicons name="arrow-back" size={24} color={color} />
  </TouchableOpacity>;
}

const styles = StyleSheet.create({ button: { width: 44, height: 44, minWidth: 44, minHeight: 44, padding: 0, alignItems: "center", justifyContent: "center", flexShrink: 0 } });
