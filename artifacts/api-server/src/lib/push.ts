import Expo, { type ExpoPushMessage } from "expo-server-sdk";

const expo = new Expo();

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function sendPushNotification(
  pushToken: string | null | undefined,
  payload: PushPayload,
): Promise<void> {
  if (!pushToken || !Expo.isExpoPushToken(pushToken)) return;

  const message: ExpoPushMessage = {
    to: pushToken,
    sound: "default",
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
  };

  try {
    const chunks = expo.chunkPushNotifications([message]);
    for (const chunk of chunks) {
      const receipts = await expo.sendPushNotificationsAsync(chunk);
      for (const receipt of receipts) {
        if (receipt.status === "error") {
          console.error("[push] Error sending notification:", receipt.message, receipt.details);
        }
      }
    }
  } catch (err) {
    console.error("[push] Failed to send push notification:", err);
  }
}

export async function sendPushNotifications(
  pushTokens: (string | null | undefined)[],
  payload: PushPayload,
): Promise<void> {
  const valid = pushTokens.filter((t): t is string => !!t && Expo.isExpoPushToken(t));
  if (valid.length === 0) return;

  const messages: ExpoPushMessage[] = valid.map((to) => ({
    to,
    sound: "default",
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
  }));

  try {
    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }
  } catch (err) {
    console.error("[push] Failed to send push notifications:", err);
  }
}
