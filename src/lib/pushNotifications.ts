import Constants from "expo-constants";
import * as Device from "expo-device";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Linking, Platform } from "react-native";
import { supabase } from "./supabase";

export type PushPermissionState = "granted" | "denied" | "undetermined" | "unavailable" | "not_configured";
const PUSH_TOKEN_KEY = "locomall.expoPushToken";

type NotificationsModule = typeof import("expo-notifications");

export function canUseNativePushNotifications() {
  return Platform.OS !== "web" && Device.isDevice && Constants.appOwnership !== "expo";
}

async function loadNotifications(): Promise<NotificationsModule | null> {
  if (!canUseNativePushNotifications()) return null;
  return import("expo-notifications");
}

export async function configureNotificationHandler() {
  const notifications = await loadNotifications();
  if (!notifications) return false;
  notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  return true;
}

function getProjectId() {
  return Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
}

async function ensureAndroidChannel(notifications: NotificationsModule) {
  if (Platform.OS !== "android") return;
  await notifications.setNotificationChannelAsync("locomall-updates", {
    name: "ข่าวสารจาก Locomall",
    description: "คำสั่งซื้อ คำขออนุมัติ แชต และข่าวสารสำคัญ",
    importance: notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 150, 250],
    lightColor: "#154C2B",
    sound: "default",
  });
}

export async function getPushPermissionState(): Promise<PushPermissionState> {
  const notifications = await loadNotifications();
  if (!notifications) return "unavailable";
  const permission = await notifications.getPermissionsAsync();
  if (permission.status === "granted" && !getProjectId()) return "not_configured";
  return permission.status;
}

export async function registerForPushNotifications(requestPermission = true): Promise<PushPermissionState> {
  const notifications = await loadNotifications();
  if (!notifications) return "unavailable";
  await configureNotificationHandler();
  await ensureAndroidChannel(notifications);

  let permission = await notifications.getPermissionsAsync();
  if (permission.status === "undetermined" && requestPermission) {
    permission = await notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
  }
  if (permission.status !== "granted") return permission.status;

  const projectId = getProjectId();
  if (!projectId) return "not_configured";
  const token = (await notifications.getExpoPushTokenAsync({ projectId })).data;
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
