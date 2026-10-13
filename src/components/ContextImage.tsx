import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Colors } from "../constants/theme";

/** Remount image error state when URI changes; never substitute a product for a person. */
export function ContextImage(props: { uri?: string | null; name?: string; size?: number; person?: boolean; style?: StyleProp<ViewStyle> }) {
  return <ImageContent key={props.uri ?? "empty"} {...props} />;
}
function ImageContent({ uri, name = "", size = 44, person = false, style }: { uri?: string | null; name?: string; size?: number; person?: boolean; style?: StyleProp<ViewStyle> }) {
  const [failed, setFailed] = useState(false);
  return <View accessibilityLabel={person ? `รูปคู่สนทนา ${name}` : `รูป ${name}`} style={[styles.box, { width: size, height: size, borderRadius: person ? size / 2 : 12 }, style]}>
    {uri?.trim() && !failed ? <Image source={{ uri }} resizeMode="cover" style={StyleSheet.absoluteFill} onError={() => setFailed(true)} />
      : person ? <Text style={[styles.initial, { fontSize: size * 0.4 }]}>{Array.from(name.trim())[0] || "?"}</Text>
        : <Ionicons name="basket-outline" size={Math.min(size * 0.5, 54)} color={Colors.greenPrimary} />}
  </View>;
}
const styles = StyleSheet.create({ box: { overflow: "hidden", backgroundColor: "#EAF1E9", alignItems: "center", justifyContent: "center" }, initial: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary } });
