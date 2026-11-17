/// <reference lib="webworker" />
import { ExpirationPlugin } from 'workbox-expiration';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import {
  isOutageNotificationPayload,
  type OutageNotificationPayload,
  type ServiceWorkerMessage,
} from './lib/notificationTypes';

declare let self: ServiceWorkerGlobalScope;

const REMINDER_CACHE = 'outage-reminder';
const REMINDER_PATH = '__scheduled-outage-notification__';
const MAX_TIMEOUT_MS = 2_147_000_000;

let notificationTimer: ReturnType<typeof setTimeout> | null = null;
let restoreStarted = false;

const reminderUrl = () =>
  new URL(REMINDER_PATH, self.registration.scope).href;

const iconUrl = () =>
  new URL('icons/icon-192.png', self.registration.scope).href;

// El manifest se inyecta en build por vite-plugin-pwa.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// El JSON de horarios usa SWR; el shell y las rutas no reciben precache manual.
registerRoute(
  ({ url }) =>
    url.origin === self.location.origin &&
    url.pathname.endsWith('/schedules.json'),
  new StaleWhileRevalidate({
    cacheName: 'official-schedules',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 2,
        maxAgeSeconds: 7 * 24 * 60 * 60,
      }),
    ],
  }),
);

// Los puntos de circuitos se descargan al abrir el mapa o pulsar «Usar mi
// ubicación» y quedan en caché para siguientes usos sin conexión. No se
// precachean porque pesan ~800 kB.
registerRoute(
  ({ url }) =>
    url.origin === self.location.origin &&
    url.pathname.endsWith('/geo/circuits-points.json'),
  new CacheFirst({
    cacheName: 'geo-circuit-points',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 1,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
    ],
  }),
);

async function persistReminder(
  payload: OutageNotificationPayload,
): Promise<void> {
  const cache = await caches.open(REMINDER_CACHE);
  await cache.put(
    reminderUrl(),
    new Response(JSON.stringify(payload), {
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

async function removeReminder(): Promise<void> {
  const cache = await caches.open(REMINDER_CACHE);
  await cache.delete(reminderUrl());
}

async function readReminder(): Promise<OutageNotificationPayload | null> {
  try {
    const cache = await caches.open(REMINDER_CACHE);
    const response = await cache.match(reminderUrl());
    if (!response) return null;

    const payload: unknown = await response.json();
    return isOutageNotificationPayload(payload) ? payload : null;
  } catch {
    return null;
  }
}

function clearTimer(): void {
  if (notificationTimer !== null) {
    clearTimeout(notificationTimer);
    notificationTimer = null;
  }
}

async function deliverNotification(
  payload: OutageNotificationPayload,
): Promise<void> {
  clearTimer();
  await removeReminder();

  if (payload.outageStart <= Date.now()) return;

  try {
    await self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: iconUrl(),
      badge: iconUrl(),
      tag: payload.tag,
      data: { url: self.registration.scope },
    });
  } catch {
    // El usuario pudo revocar el permiso entre la programación y el disparo.
  }
}

function armNotificationTimer(payload: OutageNotificationPayload): void {
  clearTimer();

  const now = Date.now();
  if (payload.outageStart <= now) {
    void removeReminder();
    return;
  }

  const delay = Math.max(0, Math.min(MAX_TIMEOUT_MS, payload.triggerAt - now));

  notificationTimer = setTimeout(() => {
    notificationTimer = null;

    if (payload.triggerAt > Date.now() + 1_000) {
      // El navegador limitó un timeout largo: se vuelve a armar.
      armNotificationTimer(payload);
      return;
    }

    void deliverNotification(payload);
  }, delay);
}

async function scheduleNotification(
  payload: OutageNotificationPayload,
): Promise<void> {
  await persistReminder(payload);
  armNotificationTimer(payload);
}

async function cancelNotification(): Promise<void> {
  clearTimer();
  await removeReminder();
}

async function restoreNotification(): Promise<void> {
  if (restoreStarted) return;
  restoreStarted = true;

  const payload = await readReminder();
  if (!payload) return;
  armNotificationTimer(payload);
}

void restoreNotification();

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const message = event.data as ServiceWorkerMessage | undefined;
  if (!message || typeof message !== 'object') return;

  if (
    message.type === 'SCHEDULE_OUTAGE_NOTIFICATION' &&
    isOutageNotificationPayload(message.payload)
  ) {
    event.waitUntil(scheduleNotification(message.payload));
    return;
  }

  if (message.type === 'CANCEL_OUTAGE_NOTIFICATION') {
    event.waitUntil(cancelNotification());
    return;
  }

  if (
    message.type === 'SHOW_OUTAGE_NOTIFICATION' &&
    isOutageNotificationPayload(message.payload)
  ) {
    event.waitUntil(deliverNotification(message.payload));
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      for (const client of windows) {
        if ('focus' in client) {
          await client.focus();
          return;
        }
      }

      await self.clients.openWindow(self.registration.scope);
    })(),
  );
});
