import type {
  ChargeWindow,
  CircuitSchedule,
  DateSchedule,
  Device,
  Interval,
  PowerStatus,
  Weekday,
  WeeklySchedule,
} from '../types';
import { WEEKDAYS } from '../types';
import { addLocalDays, parseDateKey, startOfLocalDay, toDateKey } from './dates';

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/** Búsqueda acotada para no recorrer un calendario infinito en un PWA ligero. */
const CHARGE_LOOKAHEAD_DAYS = 31;
const OUTAGE_LOOKBACK_DAYS = 32;
const MH_TO_WH_VOLTAGE = 3.7;
const DEFAULT_EFFICIENCY = 0.85;

interface LightWindow {
  start: Date;
  end: Date;
}

interface RawWindow {
  start: number;
  end: number;
}

/** Valida una hora HH:mm en el rango 00:00–23:59. */
export function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function parseTimeToMinutes(value: string): number | null {
  if (!isValidTime(value)) return null;
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function weekdayFor(date: Date): Weekday {
  return WEEKDAYS[(date.getDay() + 6) % 7];
}

function intervalsForDate(schedule: CircuitSchedule, date: Date): Interval[] {
  if (!Array.isArray(schedule)) {
    return schedule[weekdayFor(date)] ?? [];
  }

  const key = toDateKey(date);
  return schedule
    .filter((entry) => entry.date === key)
    .flatMap((entry) => entry.intervals);
}

function dateAtMinutes(day: Date, minutes: number): Date {
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    0,
    minutes,
    0,
    0,
  );
}

/**
 * Convierte un intervalo de un día a fechas absolutas.
 * Inicio == fin representa un día completo (24 h).
 */
function toAbsoluteWindow(
  day: Date,
  interval: Interval,
): RawWindow | null {
  const startMinutes = parseTimeToMinutes(interval.start);
  const endMinutes = parseTimeToMinutes(interval.end);
  if (startMinutes === null || endMinutes === null) return null;

  const start = dateAtMinutes(day, startMinutes);
  let end: Date;

  if (endMinutes === startMinutes) {
    end = new Date(start.getTime() + DAY_MS);
  } else if (endMinutes < startMinutes) {
    // Ventana que cruza medianoche, p. ej. 22:00–02:00.
    end = addLocalDays(dateAtMinutes(day, endMinutes), 1);
  } else {
    end = dateAtMinutes(day, endMinutes);
  }

  if (end.getTime() <= start.getTime()) return null;
  return { start: start.getTime(), end: end.getTime() };
}

/**
 * Recopila y fusiona ventanas de luz. Se empieza un día antes para incluir
 * intervalos nocturnos que comenzaron ayer y siguen vigentes hoy.
 */
function collectLightWindows(
  schedule: CircuitSchedule,
  from: Date,
  to: Date,
): LightWindow[] {
  if (to.getTime() < from.getTime()) return [];

  const firstDay = startOfLocalDay(addLocalDays(from, -1));
  const lastDay = startOfLocalDay(to);
  const raw: RawWindow[] = [];

  for (
    let day = firstDay;
    day.getTime() <= lastDay.getTime();
    day = addLocalDays(day, 1)
  ) {
    for (const interval of intervalsForDate(schedule, day)) {
      const window = toAbsoluteWindow(day, interval);
      if (window) raw.push(window);
    }
  }

  raw.sort((a, b) => a.start - b.start || a.end - b.end);

  const merged: RawWindow[] = [];
  for (const window of raw) {
    const current = merged[merged.length - 1];
    if (!current || window.start > current.end) {
      merged.push({ ...window });
    } else if (window.end > current.end) {
      // Solapamiento o continuación exacta: se extiende la ventana actual.
      current.end = window.end;
    }
  }

  return merged.map((window) => ({
    start: new Date(window.start),
    end: new Date(window.end),
  }));
}

function toChargeWindow(window: LightWindow): ChargeWindow {
  return {
    start: new Date(window.start),
    end: new Date(window.end),
    durationMin: Math.max(
      1,
      Math.round((window.end.getTime() - window.start.getTime()) / MINUTE_MS),
    ),
  };
}

export function getCurrentStatus(
  schedule: CircuitSchedule,
  now: Date,
): PowerStatus {
  const timestamp = now.getTime();
  const windows = collectLightWindows(
    schedule,
    addLocalDays(now, -1),
    addLocalDays(now, 1),
  );

  return windows.some(
    (window) =>
      window.start.getTime() <= timestamp && timestamp < window.end.getTime(),
  )
    ? 'power'
    : 'outage';
}

/**
 * Devuelve el apagón actual si ya está en curso; de lo contrario, el próximo.
 * El fin es la siguiente ventana de luz conocida.
 */
export function getNextOutage(
  schedule: CircuitSchedule,
  now: Date,
): { start: Date; end: Date } | null {
  const timestamp = now.getTime();
  const windows = collectLightWindows(
    schedule,
    addLocalDays(now, -OUTAGE_LOOKBACK_DAYS),
    addLocalDays(now, CHARGE_LOOKAHEAD_DAYS),
  );

  const current = windows.find(
    (window) =>
      window.start.getTime() <= timestamp && timestamp < window.end.getTime(),
  );

  if (current) {
    const nextLight = windows.find(
      (window) => window.start.getTime() > current.end.getTime(),
    );
    if (!nextLight) return null;

    return {
      start: new Date(current.end),
      end: new Date(nextLight.start),
    };
  }

  const nextLight = windows.find(
    (window) => window.start.getTime() > timestamp,
  );
  if (!nextLight) return null;

  const previousLight = [...windows]
    .reverse()
    .find((window) => window.end.getTime() <= timestamp);

  return {
    start: previousLight ? new Date(previousLight.end) : new Date(now),
    end: new Date(nextLight.start),
  };
}

/**
 * Incluye la ventana activa (si existe) y luego las siguientes. La duración
 * devuelta es la duración completa de cada ventana, no solo el tiempo restante.
 */
export function getNextChargeWindows(
  schedule: CircuitSchedule,
  now: Date,
  count: number,
): ChargeWindow[] {
  if (!Number.isFinite(count) || count <= 0) return [];

  const timestamp = now.getTime();
  const windows = collectLightWindows(
    schedule,
    now,
    addLocalDays(now, CHARGE_LOOKAHEAD_DAYS),
  );

  return windows
    .filter((window) => window.end.getTime() > timestamp)
    .slice(0, Math.floor(count))
    .map(toChargeWindow);
}

/** Capacidad en Wh. Si solo hay mAh se asume una batería de 3.7 V. */
export function getCapacityWh(device: Device): number {
  if (
    typeof device.capacityWh === 'number' &&
    Number.isFinite(device.capacityWh) &&
    device.capacityWh > 0
  ) {
    return device.capacityWh;
  }

  if (
    typeof device.capacityMah === 'number' &&
    Number.isFinite(device.capacityMah) &&
    device.capacityMah > 0
  ) {
    return (device.capacityMah * MH_TO_WH_VOLTAGE) / 1000;
  }

  return 0;
}

/**
 * Estimación desde batería vacía. El resultado se redondea y se limita a 100.
 */
export function estimateChargePercent(
  device: Device,
  windowMinutes: number,
): number {
  const capacityWh = getCapacityWh(device);
  if (
    capacityWh <= 0 ||
    !Number.isFinite(windowMinutes) ||
    windowMinutes <= 0 ||
    !Number.isFinite(device.chargerWatts) ||
    device.chargerWatts <= 0
  ) {
    return 0;
  }

  const rawEfficiency = device.efficiency ?? DEFAULT_EFFICIENCY;
  const efficiency = Number.isFinite(rawEfficiency)
    ? Math.min(1, Math.max(0, rawEfficiency))
    : DEFAULT_EFFICIENCY;
  const windowHours = windowMinutes / 60;
  const percent =
    ((device.chargerWatts * windowHours * efficiency) / capacityWh) * 100;

  return Math.round(Math.min(100, Math.max(0, percent)));
}

/** Formato compacto: 1h 23m 45s, 23m 45s o 45s. */
export function formatCountdown(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0s';

  const totalSeconds = Math.floor(ms / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  const paddedSeconds = String(seconds).padStart(2, '0');

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m ${paddedSeconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${paddedSeconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Normaliza una lista de intervalos de un mismo día para el editor:
 * ordena y fusiona solapamientos/continuaciones sin alterar cruces de medianoche.
 */
export function normalizeIntervals(intervals: Interval[]): Interval[] {
  const parsed = intervals
    .map((interval) => ({
      interval,
      start: parseTimeToMinutes(interval.start),
      end: parseTimeToMinutes(interval.end),
    }))
    .filter(
      (
        item,
      ): item is { interval: Interval; start: number; end: number } =>
        item.start !== null && item.end !== null,
    )
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const result: Interval[] = [];
  for (const item of parsed) {
    const previous = result[result.length - 1];
    if (!previous) {
      result.push({ ...item.interval });
      continue;
    }

    const previousEnd = parseTimeToMinutes(previous.end);
    if (previousEnd === null) continue;

    const previousStart = parseTimeToMinutes(previous.start);
    const crossesMidnight =
      previousStart !== null && previousEnd < previousStart;
    const sameFullDay = previousStart === previousEnd;

    // No se fusionan intervalos nocturnos porque su duración real es distinta.
    if (!crossesMidnight && !sameFullDay && item.start <= previousEnd) {
      if (item.end > previousEnd) previous.end = item.interval.end;
    } else {
      result.push({ ...item.interval });
    }
  }

  return result;
}

export function createEmptyWeeklySchedule(): WeeklySchedule {
  return {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: [],
  };
}

export function isDateSchedule(
  schedule: CircuitSchedule,
): schedule is DateSchedule[] {
  return Array.isArray(schedule);
}

export function isValidDateScheduleEntry(entry: DateSchedule): boolean {
  return parseDateKey(entry.date) !== null;
}
