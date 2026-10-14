import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { canUseNativePushNotifications, configureNotificationHandler, registerForPushNotifications } from "../lib/pushNotifications";
import { resolveNotificationPath } from "../lib/notificationNavigation";

type NotificationResponseLike = {
  notification: { request: { content: { data?: Record<string, unknown> } } };
};

export function PushNotificationBootstrap() {
  const { session, loading, hasLocation, isAdmin, deviceLocationReady } = useAuth();
  const router = useRouter();
  const attemptedUser = useRef<string | null>(null);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) { attemptedUser.current = null; return; }
    if (loading || hasLocation === null || isAdmin === null || (hasLocation && !isAdmin && !deviceLocationReady)) return;
    if (attemptedUser.current === userId) return;
    const timer = setTimeout(() => {
      attemptedUser.current = userId;
      void registerForPushNotifications(true).catch(() => {
        // Push is an enhancement; failure must never block the signed-in app.
      });
    }, 1200);
    return () => clearTimeout(timer);
  }, [loading, session?.user.id, hasLocation, isAdmin, deviceLocationReady]);

  useEffect(() => {
    if (!canUseNativePushNotifications()) return;
    let cancelled = false;
    let subscription: { remove: () => void } | undefined;
    const open = (response: NotificationResponseLike) => {
      const data = response.notification.request.content.data;
      void resolveNotificationPath(data).then((path) => { if (!cancelled) router.push(path); }).catch(() => {
        if (!cancelled) router.push("/(tabs)/notification");
      });
    };
    void (async () => {
      const configured = await configureNotificationHandler();
      if (!configured || cancelled) return;
      const notifications = await import("expo-notifications");
      if (cancelled) return;
      subscription = notifications.addNotificationResponseReceivedListener(open);
      const response = await notifications.getLastNotificationResponseAsync();
      if (response && !cancelled) open(response);
    })().catch(() => {
      // Push is optional and must never prevent the app from opening.
    });
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [router]);

  return null;
}
