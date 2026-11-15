const TIME_FORMAT = new Intl.DateTimeFormat('es', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const SHORT_DATE_FORMAT = new Intl.DateTimeFormat('es', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

const LONG_DATE_TIME_FORMAT = new Intl.DateTimeFormat('es', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** Devuelve una copia de la fecha a las 00:00:00 locales. */
export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addLocalDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** Clave local YYYY-MM-DD, sin conversiones a UTC. */
export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Convierte YYYY-MM-DD a una fecha local; devuelve null si no es válida. */
export function parseDateKey(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  return toDateKey(date) === key ? date : null;
}

export function formatTime(date: Date): string {
  return TIME_FORMAT.format(date);
}

export function formatShortDate(date: Date): string {
  return SHORT_DATE_FORMAT.format(date);
}

export function formatDateTime(isoDate: string | null): string {
  if (!isoDate) return 'Sin datos';

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'Fecha desconocida';

  return LONG_DATE_TIME_FORMAT.format(date);
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return toDateKey(a) === toDateKey(b);
}

/** Etiqueta compacta para una ventana: Hoy, Mañana o fecha corta. */
export function formatDayLabel(date: Date, now: Date): string {
  if (isSameLocalDay(date, now)) return 'Hoy';
  if (isSameLocalDay(date, addLocalDays(now, 1))) return 'Mañana';

  const label = formatShortDate(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatDuration(minutes: number): string {
  const rounded = Math.max(0, Math.round(minutes));
  const hours = Math.floor(rounded / 60);
  const remainingMinutes = rounded % 60;

  if (hours > 0 && remainingMinutes > 0) return `${hours} h ${remainingMinutes} min`;
  if (hours > 0) return `${hours} h`;
  return `${remainingMinutes} min`;
}
