import { useRouter } from "expo-router";
import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { canUseNativePushNotifications, configureNotificationHandler, notificationPath, registerForPushNotifications } from "../lib/pushNotifications";

type NotificationResponseLike = {
  notification: { request: { content: { data?: Record<string, unknown> } } };
};

export function PushNotificationBootstrap() {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !session?.user.id) return;
    const timer = setTimeout(() => {
      void registerForPushNotifications(true).catch(() => {
        // Push is an enhancement; failure must never block the signed-in app.
      });
    }, 1200);
    return () => clearTimeout(timer);
  }, [loading, session?.user.id]);

  useEffect(() => {
    if (!canUseNativePushNotifications()) return;
    let cancelled = false;
    let subscription: { remove: () => void } | undefined;
    const open = (response: NotificationResponseLike) => {
      const data = response.notification.request.content.data;
      router.push(notificationPath(data));
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
