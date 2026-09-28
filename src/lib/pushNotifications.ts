import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Linking, Platform } from "react-native";
import { supabase } from "./supabase";

export type PushPermissionState = "granted" | "denied" | "undetermined" | "unavailable" | "not_configured";
const PUSH_TOKEN_KEY = "locomall.expoPushToken";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function getProjectId() {
  return Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
}

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("locomall-updates", {
    name: "ข่าวสารจาก Locomall",
    description: "คำสั่งซื้อ คำขออนุมัติ แชต และข่าวสารสำคัญ",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 150, 250],
    lightColor: "#154C2B",
    sound: "default",
  });
}

export async function getPushPermissionState(): Promise<PushPermissionState> {
  if (Platform.OS === "web" || !Device.isDevice) return "unavailable";
  const permission = await Notifications.getPermissionsAsync();
  if (permission.status === "granted" && !getProjectId()) return "not_configured";
  return permission.status;
}

export async function registerForPushNotifications(requestPermission = true): Promise<PushPermissionState> {
  if (Platform.OS === "web" || !Device.isDevice) return "unavailable";
  await ensureAndroidChannel();

  let permission = await Notifications.getPermissionsAsync();
  if (permission.status === "undetermined" && requestPermission) {
    permission = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
  }
  if (permission.status !== "granted") return permission.status;

  const projectId = getProjectId();
  if (!projectId) return "not_configured";
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const { error } = await supabase.rpc("register_my_push_device", {
    p_expo_push_token: token,
    p_platform: Platform.OS,
    p_device_name: Device.deviceName ?? null,
  });
  if (error) throw error;
  await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
  return "granted";
}

export async function disablePushNotifications() {
  const { error } = await supabase.rpc("disable_my_push_devices");
  if (error) throw error;
}

export async function disableCurrentPushDevice() {
  const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  if (!token) return;
  const { error } = await supabase.rpc("disable_my_push_device", { p_expo_push_token: token });
  if (error) throw error;
  await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
}

export async function openNotificationSettings() {
  await Linking.openSettings();
}

export function notificationPath(data: Record<string, unknown> | undefined) {
  const entityType = typeof data?.entity_type === "string" ? data.entity_type : null;
  const entityId = typeof data?.entity_id === "number" || typeof data?.entity_id === "string" ? String(data.entity_id) : null;
  if (entityType === "order" && entityId) return `/order/${entityId}` as const;
  if (entityType === "market" && entityId) return `/market/${entityId}` as const;
  if (entityType === "store" && entityId) return `/store/${entityId}` as const;
  if (entityType === "chat" && entityId) return `/chat/${entityId}` as const;
  return "/(tabs)/notification" as const;
}
