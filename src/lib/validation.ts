import type {
  Circuit,
  CircuitSchedule,
  DateSchedule,
  Device,
  Interval,
  Theme,
  UserSettings,
  Weekday,
  WeeklySchedule,
} from '../types';
import { DEFAULT_USER_SETTINGS, WEEKDAYS } from '../types';
import { parseDateKey } from './dates';
import { createEmptyWeeklySchedule, isValidTime } from './schedule';

export interface OfficialCircuitData {
  id: string;
  name: string;
  schedule: CircuitSchedule;
}

export interface OfficialSchedulesFile {
  version: number;
  updatedAt: string;
  circuits: OfficialCircuitData[];
}

export interface BackupBundle {
  app: 'rotacion-circuitos';
  version: 1;
  exportedAt: string;
  circuits: Circuit[];
  devices: Device[];
  settings: UserSettings;
  lastScheduleUpdate: string | null;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!text || text.length > maxLength) return null;
  return text;
}

function cleanId(value: unknown): string | null {
  return cleanText(value, 200);
}

function parseInterval(value: unknown): Interval | null {
  if (!isRecord(value)) return null;
  if (!isValidTime(value.start as string) || !isValidTime(value.end as string)) {
    return null;
  }

  return {
    start: value.start as string,
    end: value.end as string,
  };
}

function parseIntervals(value: unknown): Interval[] | null {
  if (!Array.isArray(value)) return null;

  const intervals = value.map(parseInterval);
  if (intervals.some((interval) => interval === null)) return null;
  return intervals as Interval[];
}

function parseWeeklySchedule(value: UnknownRecord): WeeklySchedule | null {
  const schedule = createEmptyWeeklySchedule();

  for (const day of WEEKDAYS) {
    if (value[day] === undefined) continue;
    const intervals = parseIntervals(value[day]);
    if (!intervals) return null;
    schedule[day as Weekday] = intervals;
  }

  return schedule;
}

function parseDateSchedules(value: unknown[]): DateSchedule[] | null {
  const entries: DateSchedule[] = [];

  for (const rawEntry of value) {
    if (!isRecord(rawEntry)) return null;
    const date = cleanText(rawEntry.date, 10);
    if (!date || !parseDateKey(date)) return null;

    const intervals = parseIntervals(rawEntry.intervals);
    if (!intervals) return null;

    entries.push({ date, intervals });
  }

  return entries;
}

export function parseSchedule(value: unknown): CircuitSchedule | null {
  if (Array.isArray(value)) return parseDateSchedules(value);
  if (!isRecord(value)) return null;
  return parseWeeklySchedule(value);
}

function parseCircuit(value: unknown): Circuit | null {
  if (!isRecord(value)) return null;

  const id = cleanId(value.id);
  const name = cleanText(value.name, 120);
  const schedule = parseSchedule(value.schedule);
  if (!id || !name || !schedule) return null;

  const source =
    value.source === 'official' || value.source === 'user'
      ? value.source
      : undefined;
  const updatedAt =
    typeof value.updatedAt === 'string' &&
    !Number.isNaN(Date.parse(value.updatedAt))
      ? value.updatedAt
      : undefined;

  return { id, name, schedule, source, updatedAt };
}

function parseDevice(value: unknown): Device | null {
  if (!isRecord(value)) return null;

  const id = cleanId(value.id);
  const name = cleanText(value.name, 120);
  if (!id || !name) return null;

  const capacityMah =
    typeof value.capacityMah === 'number' &&
    Number.isFinite(value.capacityMah) &&
    value.capacityMah > 0
      ? value.capacityMah
      : undefined;
  const capacityWh =
    typeof value.capacityWh === 'number' &&
    Number.isFinite(value.capacityWh) &&
    value.capacityWh > 0
      ? value.capacityWh
      : undefined;
  const chargerWatts =
    typeof value.chargerWatts === 'number' &&
    Number.isFinite(value.chargerWatts) &&
    value.chargerWatts > 0
      ? value.chargerWatts
      : null;

  if (chargerWatts === null) return null;

  const rawEfficiency =
    typeof value.efficiency === 'number' &&
    Number.isFinite(value.efficiency)
      ? value.efficiency
      : undefined;

  const presetId =
    typeof value.presetId === 'string' &&
    value.presetId.trim().length > 0 &&
    value.presetId.length <= 120
      ? value.presetId.trim()
      : undefined;

  return {
    id,
    name,
    capacityMah,
    capacityWh,
    chargerWatts,
    efficiency:
      rawEfficiency === undefined
        ? undefined
        : Math.min(1, Math.max(0, rawEfficiency)),
    presetId,
  };
}

export function parseUserSettings(
  value: unknown,
  fallback: UserSettings = DEFAULT_USER_SETTINGS,
): UserSettings {
  if (!isRecord(value)) return { ...fallback };

  const selectedCircuitId =
    typeof value.selectedCircuitId === 'string'
      ? value.selectedCircuitId
      : fallback.selectedCircuitId;

  const lead =
    typeof value.notificationLeadMinutes === 'number' &&
    Number.isFinite(value.notificationLeadMinutes)
      ? Math.min(1440, Math.max(0, Math.round(value.notificationLeadMinutes)))
      : fallback.notificationLeadMinutes;

  const validThemes: Theme[] = ['light', 'dark', 'system'];
  const theme = validThemes.includes(value.theme as Theme)
    ? (value.theme as Theme)
    : fallback.theme;

  const notificationsEnabled =
    typeof value.notificationsEnabled === 'boolean'
      ? value.notificationsEnabled
      : fallback.notificationsEnabled;

  const activeDeviceId =
    typeof value.activeDeviceId === 'string'
      ? value.activeDeviceId
      : value.activeDeviceId === null
        ? null
        : fallback.activeDeviceId;

  const circuitPending =
    typeof value.circuitPending === 'boolean'
      ? value.circuitPending
      : fallback.circuitPending;

  const address =
    typeof value.address === 'string'
      ? (cleanText(value.address, 160) ?? undefined)
      : fallback.address;

  return {
    selectedCircuitId,
    notificationLeadMinutes: lead,
    theme,
    notificationsEnabled,
    activeDeviceId,
    circuitPending,
    address,
  };
}

function assertUniqueIds(items: Array<{ id: string }>, label: string): void {
  const ids = new Set(items.map((item) => item.id));
  if (ids.size !== items.length) {
    throw new Error(`El JSON contiene ${label} con IDs duplicados.`);
  }
}

export function parseOfficialSchedules(value: unknown): OfficialSchedulesFile {
  if (!isRecord(value)) {
    throw new Error('El formato de horarios no es válido.');
  }

  if (
    value.version !== 1 ||
    typeof value.updatedAt !== 'string' ||
    Number.isNaN(Date.parse(value.updatedAt)) ||
    !Array.isArray(value.circuits)
  ) {
    throw new Error('Faltan versión, fecha de actualización o circuitos.');
  }

  const circuits: OfficialCircuitData[] = [];
  for (const rawCircuit of value.circuits) {
    const circuit = parseCircuit(rawCircuit);
    if (!circuit) {
      throw new Error('Uno de los circuitos oficiales tiene datos inválidos.');
    }

    circuits.push({
      id: circuit.id,
      name: circuit.name,
      schedule: circuit.schedule,
    });
  }

  assertUniqueIds(circuits, 'circuitos');

  return {
    version: 1,
    updatedAt: value.updatedAt,
    circuits,
  };
}

export function parseBackupBundle(value: unknown): BackupBundle {
  if (!isRecord(value) || value.app !== 'rotacion-circuitos') {
    throw new Error('Este archivo no es un respaldo de Rotación de Circuitos.');
  }

  if (value.version !== 1 || !Array.isArray(value.circuits)) {
    throw new Error('La versión del respaldo no es compatible.');
  }

  const circuits = value.circuits.map(parseCircuit);
  if (circuits.some((circuit) => circuit === null)) {
    throw new Error('El respaldo contiene circuitos inválidos.');
  }

  const devices = Array.isArray(value.devices)
    ? value.devices.map(parseDevice)
    : [];
  if (devices.some((device) => device === null)) {
    throw new Error('El respaldo contiene dispositivos inválidos.');
  }

  assertUniqueIds(circuits as Circuit[], 'circuitos');
  assertUniqueIds(devices as Device[], 'dispositivos');

  const lastScheduleUpdate =
    typeof value.lastScheduleUpdate === 'string' &&
    !Number.isNaN(Date.parse(value.lastScheduleUpdate))
      ? value.lastScheduleUpdate
      : null;

  return {
    app: 'rotacion-circuitos',
    version: 1,
    exportedAt:
      typeof value.exportedAt === 'string'
        ? value.exportedAt
        : new Date().toISOString(),
    circuits: circuits as Circuit[],
    devices: devices as Device[],
    settings: parseUserSettings(value.settings),
    lastScheduleUpdate,
  };
}
