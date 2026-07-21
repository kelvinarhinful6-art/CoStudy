import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { session, registerPushToken, unregisterPushToken } from "../api";

// Show alerts/sounds/badges for notifications received while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function generateTokenSafe(): Promise<string | null> {
  return Notifications.getExpoPushTokenAsync()
    .then((t) => t.data)
    .catch(() => null);
}

/** Register this device for push notifications (called after login). */
export async function registerForPushNotifications(): Promise<void> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (status !== "granted") {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== "granted") return;

    const token = await generateTokenSafe();
    const userId = session.user?.userId;
    if (token && userId) {
      await registerPushToken(userId, token, Platform.OS).catch(() => {});
    }
  } catch (e) {
    // best effort — push is a nice-to-have, never block the app
  }
}

/** Remove this device's push token (called on logout). */
export async function unregisterPush(): Promise<void> {
  try {
    const token = await generateTokenSafe();
    if (token) await unregisterPushToken(token).catch(() => {});
  } catch (e) {
    // best effort
  }
}

/** Subscribe to incoming notifications. Returns an unsubscribe function. */
export function listenForNotifications(
  onReceive: (notification: Notifications.Notification) => void
): () => void {
  const sub1 = Notifications.addNotificationReceivedListener(onReceive);
  return () => {
    sub1.remove();
  };
}
