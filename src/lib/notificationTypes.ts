export interface OutageNotificationPayload {
  title: string;
  body: string;
  tag: string;
  triggerAt: number;
  outageStart: number;
}

export type ServiceWorkerMessage =
  | {
      type: 'SCHEDULE_OUTAGE_NOTIFICATION';
      payload: OutageNotificationPayload;
    }
  | {
      type: 'CANCEL_OUTAGE_NOTIFICATION';
    }
  | {
      type: 'SHOW_OUTAGE_NOTIFICATION';
      payload: OutageNotificationPayload;
    };

export function isOutageNotificationPayload(
  value: unknown,
): value is OutageNotificationPayload {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Record<string, unknown>;

  return (
    typeof payload.title === 'string' &&
    payload.title.length > 0 &&
    payload.title.length <= 160 &&
    typeof payload.body === 'string' &&
    payload.body.length > 0 &&
    payload.body.length <= 500 &&
    typeof payload.tag === 'string' &&
    payload.tag.length > 0 &&
    payload.tag.length <= 100 &&
    typeof payload.triggerAt === 'number' &&
    Number.isFinite(payload.triggerAt) &&
    typeof payload.outageStart === 'number' &&
    Number.isFinite(payload.outageStart)
  );
}
