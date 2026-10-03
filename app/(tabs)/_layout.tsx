import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform } from "react-native";
import { Colors } from "../../src/constants/theme";
import { useBadgeCounts } from "../../src/context/BadgeContext";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { unreadCount, unreadChatCount } = useBadgeCounts();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.greenPrimary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.cardBackground,
          borderTopWidth: 1,
          borderTopColor: Colors.inputBorder,
          height: Platform.OS === "ios" ? 54 + insets.bottom : 64,
          paddingBottom: Platform.OS === "ios" ? insets.bottom : 8,
          paddingTop: 8,
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
          title: "หน้าแรก",
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="chat" options={{title:"แชต",tabBarIcon:({color,size})=><Ionicons name="chatbubble-ellipses-outline" size={size} color={color}/>,tabBarBadge:unreadChatCount>0?(unreadChatCount>99?"99+":unreadChatCount):undefined,tabBarBadgeStyle:{backgroundColor:"#D32F2F",color:"#FFFFFF",fontWeight:"700"}}} />
      <Tabs.Screen name="orders" options={{title:"คำสั่งซื้อ",tabBarIcon:({color,size})=><Ionicons name="receipt-outline" size={size} color={color}/>}} />
      <Tabs.Screen
        name="notification"
        options={{
          title: "แจ้งเตือน",
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications-outline" size={size} color={color} />,
          tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? "99+" : unreadCount) : undefined,
          tabBarBadgeStyle: { backgroundColor: "#D32F2F", color: "#FFFFFF", fontWeight: "700" },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "โปรไฟล์",
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
