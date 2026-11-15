import type { PermissionState } from '@capacitor/core';
import type {
  OutageNotificationPayload,
  ServiceWorkerMessage,
} from './notificationTypes';
import { isNativeApp } from './native';

export const NATIVE_OUTAGE_NOTIFICATION_ID = 1001;

function mapNativePermission(
  state: PermissionState,
): NotificationPermission {
  if (state === 'granted') return 'granted';
  if (state === 'denied') return 'denied';
  return 'default';
}

export function notificationsSupported(): boolean {
  if (isNativeApp()) return true;
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator
  );
}

export function getNotificationPermission(): NotificationPermission | null {
  if (isNativeApp()) return null;
  if (!notificationsSupported()) return null;
  return Notification.permission;
}

export async function checkNotificationPermission(): Promise<NotificationPermission | null> {
  if (!isNativeApp()) return getNotificationPermission();

  try {
    const { LocalNotifications } = await import(
      '@capacitor/local-notifications'
    );
    const status = await LocalNotifications.checkPermissions();
    return mapNativePermission(status.display);
  } catch {
    return null;
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (isNativeApp()) {
    const { LocalNotifications } = await import(
      '@capacitor/local-notifications'
    );
    const status = await LocalNotifications.requestPermissions();
    return mapNativePermission(status.display);
  }

  if (!notificationsSupported()) {
    throw new Error('Este navegador no soporta notificaciones locales.');
  }

  return Notification.requestPermission();
}

export async function scheduleNativeOutageNotification(
  payload: OutageNotificationPayload,
): Promise<void> {
  const { LocalNotifications } = await import('@capacitor/local-notifications');

  await LocalNotifications.cancel({
    notifications: [{ id: NATIVE_OUTAGE_NOTIFICATION_ID }],
  });

  await LocalNotifications.schedule({
    notifications: [
      {
        id: NATIVE_OUTAGE_NOTIFICATION_ID,
        title: payload.title,
        body: payload.body,
        schedule: {
          at: new Date(payload.triggerAt),
          allowWhileIdle: true,
        },
      },
    ],
  });
}

export async function cancelNativeOutageNotification(): Promise<void> {
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  await LocalNotifications.cancel({
    notifications: [{ id: NATIVE_OUTAGE_NOTIFICATION_ID }],
  });
}

async function getActiveRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;

  try {
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

export async function postMessageToServiceWorker(
  message: ServiceWorkerMessage,
): Promise<void> {
  const registration = await getActiveRegistration();
  registration?.active?.postMessage(message);
}

export async function showNotificationDirect(
  payload: OutageNotificationPayload,
): Promise<void> {
  const registration = await getActiveRegistration();
  if (!registration?.active) return;

  await registration.showNotification(payload.title, {
    body: payload.body,
    icon: new URL('icons/icon-192.png', document.baseURI).href,
    badge: new URL('icons/icon-192.png', document.baseURI).href,
    tag: payload.tag,
    data: { url: document.baseURI },
  });
}
