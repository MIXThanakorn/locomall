import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../../src/constants/theme";
import { useAuth } from "../../src/context/AuthContext";

export default function AdminLayout() {
  const insets = useSafeAreaInsets();
  const { session, loading, isAdmin } = useAuth();
  if (loading || (session && isAdmin === null)) return <View style={styles.loading}><ActivityIndicator color={Colors.greenPrimary} /></View>;
  if (!session) return <Redirect href="/(auth)/sign-in" />;
  if (!isAdmin) return <Redirect href="/(tabs)" />;

  return <Tabs screenOptions={{
    headerShown: false,
    tabBarActiveTintColor: Colors.greenPrimary,
    tabBarInactiveTintColor: Colors.textMuted,
    tabBarStyle: { height: Platform.OS === "ios" ? 56 + insets.bottom : 66, paddingBottom: Platform.OS === "ios" ? insets.bottom : 8, paddingTop: 7, backgroundColor: Colors.cardBackground, borderTopColor: Colors.inputBorder },
    tabBarLabelStyle: { fontFamily: "Kanit_500Medium", fontSize: 11 },
  }}>
    <Tabs.Screen name="index" options={{ title: "ภาพรวม", tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} /> }} />
    <Tabs.Screen name="markets" options={{ title: "อนุมัติ", tabBarIcon: ({ color, size }) => <Ionicons name="checkmark-done-outline" size={size} color={color} /> }} />
    <Tabs.Screen name="orders" options={{ title: "ออเดอร์", tabBarIcon: ({ color, size }) => <Ionicons name="cube-outline" size={size} color={color} /> }} />
    <Tabs.Screen name="audit" options={{ title: "ประวัติ", tabBarIcon: ({ color, size }) => <Ionicons name="document-text-outline" size={size} color={color} /> }} />
    <Tabs.Screen name="security" options={{ href: null }} />
  </Tabs>;
}

const styles = StyleSheet.create({ loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.background } });
