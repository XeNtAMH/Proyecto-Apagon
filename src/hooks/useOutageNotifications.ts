import { useEffect } from 'react';
import { formatTime } from '../lib/dates';
import {
  cancelNativeOutageNotification,
  checkNotificationPermission,
  getNotificationPermission,
  notificationsSupported,
  postMessageToServiceWorker,
  scheduleNativeOutageNotification,
  showNotificationDirect,
} from '../lib/notifications';
import { isNativeApp } from '../lib/native';
import { getNextOutage } from '../lib/schedule';
import type { Circuit, UserSettings } from '../types';

const MAX_TIMEOUT_MS = 2_147_000_000;
const RECHECK_INTERVAL_MS = 60_000;

function buildPayload(
  circuit: Circuit,
  settings: UserSettings,
  triggerAt: number,
  outageStart: number,
) {
  const lead = settings.notificationLeadMinutes;
  return {
    title: lead > 0 ? `⚡ Apagón en ${lead} min` : '⚡ Apagón inminente',
    body: `Tu circuito ${circuit.name} se quedará sin luz a las ${formatTime(
      new Date(outageStart),
    )}. Prepara tus dispositivos.`,
    tag: `outage-${outageStart}`,
    triggerAt,
    outageStart,
  };
}

/**
 * Programa el aviso en el Service Worker (web) o en el sistema Android
 * (nativo) y deja un temporizador de respaldo mientras la pestaña siga abierta.
 */
export function useOutageNotifications(
  circuit: Circuit | undefined,
  settings: UserSettings,
): void {
  useEffect(() => {
    if (isNativeApp()) {
      let disposed = false;
      let scheduledKey = '';
      let appStateListener: { remove: () => Promise<void> } | null = null;

      const cancelScheduled = async () => {
        scheduledKey = '';
        await cancelNativeOutageNotification().catch(() => undefined);
      };

      const scheduleNotification = async () => {
        if (disposed || !circuit || !settings.notificationsEnabled) {
          return;
        }

        const permission = await checkNotificationPermission();
        if (permission !== 'granted') {
          if (scheduledKey) await cancelScheduled();
          return;
        }

        const now = new Date();
        const outage = getNextOutage(circuit.schedule, now);
        if (!outage) {
          if (scheduledKey) await cancelScheduled();
          return;
        }

        const outageStart = outage.start.getTime();
        const triggerAt =
          outageStart - settings.notificationLeadMinutes * 60_000;

        if (triggerAt <= now.getTime()) {
          if (scheduledKey) await cancelScheduled();
          return;
        }

        const key = `${outageStart}:${settings.notificationLeadMinutes}`;
        if (key === scheduledKey) return;

        try {
          await scheduleNativeOutageNotification(
            buildPayload(circuit, settings, triggerAt, outageStart),
          );
          scheduledKey = key;
        } catch {
          scheduledKey = '';
        }
      };

      if (!circuit || !settings.notificationsEnabled) {
        void cancelScheduled();
        return;
      }

      void scheduleNotification();
      const interval = window.setInterval(
        () => void scheduleNotification(),
        RECHECK_INTERVAL_MS,
      );

      void import('@capacitor/app')
        .then(async ({ App }) => {
          const listener = await App.addListener(
            'appStateChange',
            ({ isActive }) => {
              if (isActive) void scheduleNotification();
            },
          );
          if (disposed) {
            void listener.remove();
          } else {
            appStateListener = listener;
          }
        })
        .catch(() => undefined);

      return () => {
        disposed = true;
        window.clearInterval(interval);
        if (appStateListener) void appStateListener.remove();
        void cancelScheduled();
      };
    }

    let pageTimer: number | null = null;
    let scheduledKey = '';
    let disposed = false;

    const clearPageTimer = () => {
      if (pageTimer !== null) {
        window.clearTimeout(pageTimer);
        pageTimer = null;
      }
    };

    const cancelScheduled = () => {
      clearPageTimer();
      if (scheduledKey) {
        void postMessageToServiceWorker({
          type: 'CANCEL_OUTAGE_NOTIFICATION',
        });
        scheduledKey = '';
      }
    };

    if (
      !circuit ||
      !settings.notificationsEnabled ||
      !notificationsSupported() ||
      getNotificationPermission() !== 'granted'
    ) {
      cancelScheduled();
      return;
    }

    const scheduleNotification = () => {
      if (disposed) return;

      const now = new Date();
      const outage = getNextOutage(circuit.schedule, now);
      if (!outage) {
        cancelScheduled();
        return;
      }

      const triggerAt =
        outage.start.getTime() - settings.notificationLeadMinutes * 60_000;
      const key = `${outage.start.getTime()}:${settings.notificationLeadMinutes}`;

      // Si ya se pasó el aviso, no se muestra de forma retroactiva.
      if (triggerAt <= now.getTime()) {
        if (scheduledKey) cancelScheduled();
        return;
      }

      if (key === scheduledKey) return;
      cancelScheduled();
      scheduledKey = key;

      const payload = buildPayload(
        circuit,
        settings,
        triggerAt,
        outage.start.getTime(),
      );

      void postMessageToServiceWorker({
        type: 'SCHEDULE_OUTAGE_NOTIFICATION',
        payload,
      });

      const delay = triggerAt - Date.now();
      if (delay <= MAX_TIMEOUT_MS) {
        pageTimer = window.setTimeout(() => {
          if (!disposed) {
            void showNotificationDirect(payload).catch(() => undefined);
          }
        }, delay);
      }
    };

    scheduleNotification();
    const interval = window.setInterval(
      scheduleNotification,
      RECHECK_INTERVAL_MS,
    );

    return () => {
      disposed = true;
      window.clearInterval(interval);
      cancelScheduled();
    };
  }, [
    circuit,
    settings.notificationsEnabled,
    settings.notificationLeadMinutes,
  ]);
}
