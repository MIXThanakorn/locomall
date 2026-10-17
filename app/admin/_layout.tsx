import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useResponsiveLayout } from "../../src/components/ResponsiveFrame";
import { Colors } from "../../src/constants/theme";
import { useAuth } from "../../src/context/AuthContext";
import { bottomTabSpacing } from "../../src/lib/bottomTabSpacing";

export default function AdminLayout() {
  const insets = useSafeAreaInsets();
  const layout = useResponsiveLayout();
  const { session, loading, isAdmin } = useAuth();
  if (loading || (session && isAdmin === null)) return <View style={styles.loading}><ActivityIndicator color={Colors.greenPrimary} /></View>;
  if (!session) return <Redirect href="/(auth)/sign-in" />;
  if (!isAdmin) return <Redirect href="/(tabs)" />;

  return <Tabs screenOptions={{
    headerShown: false,
    tabBarActiveTintColor: Colors.greenPrimary,
    tabBarInactiveTintColor: Colors.textMuted,
    tabBarActiveBackgroundColor: "#EAF3ED", tabBarHideOnKeyboard: true,
    tabBarItemStyle: { borderRadius: 14, marginHorizontal: 2 },
    tabBarLabelPosition: "below-icon",
    tabBarLabel: ({ children, color, focused }) => <Text numberOfLines={2} style={{ color, fontFamily: focused ? "Kanit_700Bold" : "Kanit_400Regular", fontSize: layout.tabLabelSize, lineHeight: 14, textAlign: "center", paddingHorizontal: 2 }}>{children}</Text>,
    tabBarStyle: { ...bottomTabSpacing(insets.bottom, layout.fontScale), backgroundColor: Colors.cardBackground, borderTopColor: Colors.inputBorder },
    tabBarLabelStyle: { fontFamily: "Kanit_500Medium", fontSize: 11 },
  }}>
    <Tabs.Screen name="index" options={{ title: "ภาพรวม", tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} /> }} />
    <Tabs.Screen name="markets" options={{ title: "อนุมัติ", tabBarIcon: ({ color, size }) => <Ionicons name="checkmark-done-outline" size={size} color={color} /> }} />
    <Tabs.Screen name="orders" options={{ title: "คำสั่งซื้อ", tabBarIcon: ({ color, size }) => <Ionicons name="cube-outline" size={size} color={color} /> }} />
    <Tabs.Screen name="audit" options={{ title: "ประวัติ", tabBarIcon: ({ color, size }) => <Ionicons name="document-text-outline" size={size} color={color} /> }} />
    <Tabs.Screen name="security" options={{ href: null }} />
    <Tabs.Screen name="finance" options={{ href: null }} />
    <Tabs.Screen name="reviews" options={{ href: null }} />
    <Tabs.Screen name="stores" options={{ href: null }} />
  </Tabs>;
}

const styles = StyleSheet.create({ loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.background } });
