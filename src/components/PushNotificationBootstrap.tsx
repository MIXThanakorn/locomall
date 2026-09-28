import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { notificationPath, registerForPushNotifications } from "../lib/pushNotifications";

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
    const open = (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as Record<string, unknown> | undefined;
      router.push(notificationPath(data));
    };
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) open(response);
    });
    return () => subscription.remove();
  }, [router]);

  return null;
}
