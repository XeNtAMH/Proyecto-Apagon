import { FALLBACK_DEVICES } from '../data/fallbackDevices';

export const DEVICE_CATEGORIES = [
  'phone',
  'powerbank',
  'laptop',
  'tablet',
  'ups',
  'router',
  'fan',
  'lamp',
  'radio',
  'medical',
  'tool',
  'other',
] as const;

export type DeviceCategory = (typeof DEVICE_CATEGORIES)[number];
export type DeviceConfidence = 'high' | 'medium' | 'low';

export interface CatalogDevice {
  id: string;
  category: DeviceCategory;
  brand: string;
  model: string;
  batteryWh: number;
  chargeWatts: number;
  efficiency: number;
  rechargeable: boolean;
  source: string;
  confidence: DeviceConfidence;
}

export interface DeviceCatalogFile {
  version: number;
  updatedAt: string;
  columns: string[];
  devices: unknown[][];
}

const DEFAULT_TIMEOUT_MS = 7_000;

function isCategory(value: unknown): value is DeviceCategory {
  return (
    typeof value === 'string' &&
    (DEVICE_CATEGORIES as readonly string[]).includes(value)
  );
}

function isConfidence(value: unknown): value is DeviceConfidence {
  return value === 'high' || value === 'medium' || value === 'low';
}

function toCatalogDevice(
  row: unknown[],
  columns: string[],
): CatalogDevice | null {
  const record: Record<string, unknown> = {};
  for (let i = 0; i < columns.length; i += 1) {
    record[columns[i]] = row[i];
  }

  if (
    typeof record.id !== 'string' ||
    !record.id ||
    !isCategory(record.category) ||
    typeof record.brand !== 'string' ||
    typeof record.model !== 'string' ||
    typeof record.batteryWh !== 'number' ||
    !Number.isFinite(record.batteryWh) ||
    record.batteryWh <= 0 ||
    typeof record.chargeWatts !== 'number' ||
    !Number.isFinite(record.chargeWatts) ||
    record.chargeWatts <= 0
  ) {
    return null;
  }

  const efficiency =
    typeof record.efficiency === 'number' && Number.isFinite(record.efficiency)
      ? Math.min(1, Math.max(0, record.efficiency))
      : 0.85;

  return {
    id: record.id,
    category: record.category,
    brand: record.brand,
    model: record.model,
    batteryWh: record.batteryWh,
    chargeWatts: record.chargeWatts,
    efficiency,
    rechargeable: record.rechargeable !== false,
    source: typeof record.source === 'string' ? record.source : 'manual',
    confidence: isConfidence(record.confidence) ? record.confidence : 'medium',
  };
}

export function expandCatalog(file: DeviceCatalogFile): CatalogDevice[] {
  if (!Array.isArray(file.columns) || !Array.isArray(file.devices)) return [];
  return file.devices
    .map((row) => (Array.isArray(row) ? toCatalogDevice(row, file.columns) : null))
    .filter((device): device is CatalogDevice => device !== null);
}

export function parseDeviceCatalog(value: unknown): DeviceCatalogFile {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('El formato del catálogo de equipos no es válido.');
  }

  const record = value as Record<string, unknown>;
  if (
    record.version !== 1 ||
    typeof record.updatedAt !== 'string' ||
    Number.isNaN(Date.parse(record.updatedAt)) ||
    !Array.isArray(record.columns) ||
    !Array.isArray(record.devices)
  ) {
    throw new Error('Faltan campos requeridos en el catálogo de equipos.');
  }

  return {
    version: 1,
    updatedAt: record.updatedAt,
    columns: record.columns.filter(
      (column): column is string => typeof column === 'string',
    ),
    devices: record.devices as unknown[][],
  };
}

export async function fetchDeviceCatalog(
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<DeviceCatalogFile> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Sin conexión a internet.');
  }

  const controller = new AbortController();
  const timeout =
    typeof window !== 'undefined'
      ? window.setTimeout(() => controller.abort(), timeoutMs)
      : null;

  try {
    const base =
      typeof window !== 'undefined'
        ? new URL(import.meta.env.BASE_URL, window.location.origin)
        : undefined;
    const url = base
      ? new URL('data/devices.json', base)
      : new URL('data/devices.json', 'http://localhost/');
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        `No se pudo descargar el catálogo de equipos (${response.status}).`,
      );
    }

    return parseDeviceCatalog(await response.json());
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('La descarga del catálogo de equipos tardó demasiado.');
    }
    throw error;
  } finally {
    if (timeout !== null && typeof window !== 'undefined') {
      window.clearTimeout(timeout);
    }
  }
}

export function getFallbackCatalog(): DeviceCatalogFile {
  return FALLBACK_DEVICES as unknown as DeviceCatalogFile;
}

export function getFallbackDevices(): CatalogDevice[] {
  return expandCatalog(getFallbackCatalog());
}
