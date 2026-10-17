import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View, type ColorValue } from "react-native";
import { useResponsiveLayout } from "../../src/components/ResponsiveFrame";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../../src/constants/theme";
import { useBadgeCounts } from "../../src/context/BadgeContext";
import { bottomTabSpacing } from "../../src/lib/bottomTabSpacing";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const layout = useResponsiveLayout();
  const tabLabel = (title: string) => function TabLabel({ color, focused }: { color: ColorValue; focused: boolean }) { return <Text numberOfLines={2} style={[styles.label, { color, fontSize: layout.tabLabelSize, fontFamily: focused ? "Kanit_700Bold" : "Kanit_400Regular" }]}>{title}</Text>; };
  const tabIcon = (outline: keyof typeof Ionicons.glyphMap, filled: keyof typeof Ionicons.glyphMap) => function TabIcon({ focused, size, color }: { focused: boolean; size: number; color: ColorValue }) { return <View style={[styles.icon, focused && styles.iconActive]}><Ionicons name={focused ? filled : outline} size={Math.min(size, 24)} color={focused ? Colors.textWhite : color} /></View>; };
  const { unreadCount, unreadChatCount } = useBadgeCounts();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: Colors.greenPrimary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarActiveBackgroundColor: "#EAF3ED",
        tabBarLabelPosition: "below-icon",
        tabBarIconStyle: { height: 32, flexGrow: 0 },
        tabBarItemStyle: styles.item,
        tabBarStyle: {
          backgroundColor: Colors.cardBackground,
          borderTopWidth: 1,
          borderTopColor: Colors.inputBorder,
          ...bottomTabSpacing(insets.bottom, layout.fontScale),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "หน้าแรก", tabBarLabel: tabLabel("หน้าแรก"),
          tabBarIcon: tabIcon("home-outline", "home"),
        }}
      />
      <Tabs.Screen name="chat" options={{title:"แชต",tabBarLabel:tabLabel("แชต"),tabBarIcon:tabIcon("chatbubble-ellipses-outline", "chatbubble-ellipses"),tabBarBadge:unreadChatCount>0?(unreadChatCount>99?"99+":unreadChatCount):undefined,tabBarBadgeStyle:{backgroundColor:"#D32F2F",color:"#FFFFFF",fontWeight:"700"}}} />
      <Tabs.Screen name="orders" options={{title:"คำสั่งซื้อ",tabBarLabel:tabLabel("คำสั่งซื้อ"),tabBarIcon:tabIcon("receipt-outline", "receipt")}} />
      <Tabs.Screen
        name="notification"
        options={{
          title: "แจ้งเตือน", tabBarLabel: tabLabel("แจ้งเตือน"),
          tabBarIcon: tabIcon("notifications-outline", "notifications"),
          tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? "99+" : unreadCount) : undefined,
          tabBarBadgeStyle: { backgroundColor: "#D32F2F", color: "#FFFFFF", fontWeight: "700" },
        }}
      />
      <Tabs.Screen
        name="setting"
        options={{
          title: "ตั้งค่า", tabBarLabel: tabLabel("ตั้งค่า"),
          tabBarIcon: tabIcon("settings-outline", "settings"),
        }}
      />
    </Tabs>
  );
}
const styles = StyleSheet.create({
  item: { borderRadius: 14, marginHorizontal: 2, paddingVertical: 0, minWidth: 0 },
  icon: { width: 42, minHeight: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  iconActive: { backgroundColor: Colors.greenPrimary },
  label: { textAlign: "center", width: "100%", flexShrink: 1, paddingHorizontal: 1, paddingTop: 4, lineHeight: 14 },
});
