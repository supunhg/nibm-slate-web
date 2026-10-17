import 'server-only';
import webpush from 'web-push';
import { getPushTokensForUsers, removeInvalidPushTokens, getAllUsers } from './storage';
import { Role } from '@/types';

// ---------------------------------------------------------------------------
// Two delivery channels share the PushToken table:
//  - Expo tokens ("ExponentPushToken[...]") reach the Android app.
//  - Web Push subscriptions, stored as "webpush:" + subscription JSON, reach
//    the installed PWA / browser. Sending these needs a VAPID key pair: the
//    public key is given to the browser when it subscribes, the private key
//    signs every message so the browser's push service (Google, Apple,
//    Mozilla) knows it really comes from this server. Without the keys the
//    web channel is silently skipped and only the Android app is notified.
// ---------------------------------------------------------------------------
export const WEB_PUSH_PREFIX = 'webpush:';

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const webPushReady = Boolean(VAPID_PUBLIC && VAPID_PRIVATE);
if (webPushReady) {
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@nibm.lk', VAPID_PUBLIC!, VAPID_PRIVATE!);
}

export function isWebPushConfigured(): boolean {
  return webPushReady;
}

async function sendWebPushNotifications(tokens: string[], payload: PushMessagePayload): Promise<number> {
  if (!webPushReady || tokens.length === 0) return 0;
  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    tag: typeof payload.data?.type === 'string' ? payload.data.type : undefined,
    data: { url: '/', ...(payload.data ?? {}) },
  });
  const stale: string[] = [];
  let sent = 0;
  await Promise.all(
    tokens.map(async (token) => {
      try {
        const subscription = JSON.parse(token.slice(WEB_PUSH_PREFIX.length));
        await webpush.sendNotification(subscription, body, { TTL: 60 * 60 * 24, urgency: 'high' });
        sent++;
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        // 404/410: the browser unsubscribed or the subscription expired.
        if (code === 404 || code === 410) stale.push(token);
        else console.warn('[Push] Web push delivery failed:', code ?? err);
      }
    }),
  );
  if (stale.length) removeInvalidPushTokens(stale).catch((e) => console.error('[Push] Stale web subscription cleanup failed:', e));
  return sent;
}

interface PushMessagePayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  priority?: 'default' | 'normal' | 'high';
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

function isExpoPushToken(token: string): boolean {
  return typeof token === 'string' && (token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken['));
}

export async function sendExpoPushNotifications(
  tokens: string[],
  payload: PushMessagePayload
): Promise<{ success: boolean; count: number }> {
  const validTokens = Array.from(new Set(tokens.filter(isExpoPushToken)));
  if (validTokens.length === 0) {
    return { success: true, count: 0 };
  }

  const messages = validTokens.map((token) => ({
    to: token,
    sound: payload.sound ?? 'default',
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
    priority: payload.priority ?? 'high',
  }));

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      console.warn(`[Push] Expo push endpoint returned status ${response.status}`);
      return { success: false, count: 0 };
    }

    const data = await response.json();
    const tickets = data?.data;

    if (Array.isArray(tickets)) {
      const tokensToRemove: string[] = [];
      tickets.forEach((ticket, idx) => {
        if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
          tokensToRemove.push(validTokens[idx]);
        }
      });

      if (tokensToRemove.length > 0) {
        // Fire-and-forget token cleanup
        removeInvalidPushTokens(tokensToRemove).catch((err) =>
          console.error('[Push] Stale token cleanup failed:', err)
        );
      }
    }

    return { success: true, count: validTokens.length };
  } catch (error) {
    console.error('[Push] Failed to dispatch push notifications:', error);
    return { success: false, count: 0 };
  }
}

export async function sendPushNotificationToUsers(
  userIds: string[],
  payload: PushMessagePayload
): Promise<{ success: boolean; count: number }> {
  if (userIds.length === 0) return { success: true, count: 0 };
  try {
    const tokens = await getPushTokensForUsers(userIds);
    if (tokens.length === 0) return { success: true, count: 0 };
    const webTokens = tokens.filter((t) => t.startsWith(WEB_PUSH_PREFIX));
    const [expo, web] = await Promise.all([
      sendExpoPushNotifications(tokens.filter((t) => !t.startsWith(WEB_PUSH_PREFIX)), payload),
      sendWebPushNotifications(webTokens, payload),
    ]);
    return { success: expo.success, count: expo.count + web };
  } catch (error) {
    console.error('[Push] Error resolving tokens for users:', error);
    return { success: false, count: 0 };
  }
}

export async function sendPushNotificationToRoles(
  roles: Role[],
  payload: PushMessagePayload
): Promise<{ success: boolean; count: number }> {
  try {
    const allUsers = await getAllUsers();
    const targetedUsers = allUsers.filter((u) => u.isActive && roles.includes(u.role));
    const userIds = targetedUsers.map((u) => u.id);
    return await sendPushNotificationToUsers(userIds, payload);
  } catch (error) {
    console.error('[Push] Error resolving users by role:', error);
    return { success: false, count: 0 };
  }
}

export async function broadcastPushNotification(
  payload: PushMessagePayload
): Promise<{ success: boolean; count: number }> {
  try {
    const allUsers = await getAllUsers();
    const activeUserIds = allUsers.filter((u) => u.isActive).map((u) => u.id);
    return await sendPushNotificationToUsers(activeUserIds, payload);
  } catch (error) {
    console.error('[Push] Error broadcasting notification:', error);
    return { success: false, count: 0 };
  }
}
