import { notificationPath } from "./notificationRoute";
import { supabase } from "./supabase";

export async function resolveNotificationPath(data: Record<string, unknown> | undefined) {
  const notificationId = Number(data?.notification_id);
  if (Number.isSafeInteger(notificationId) && notificationId > 0) {
    const { data: target, error } = await supabase.rpc("get_my_notification_target", { p_notification_id: notificationId }).maybeSingle();
    // Missing/foreign rows never open a private detail from an untrusted push.
    if (!error) return target ? notificationPath(target) : "/(tabs)/notification" as const;
  }
  return notificationPath(data);
}
