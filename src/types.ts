export const WEEKDAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

/** Intervalo de reloj local en formato HH:mm. */
export interface Interval {
  start: string;
  end: string;
}

/**
 * Cada día contiene ventanas CON LUZ. Una ventana que termina antes de su
 * inicio se interpreta como una continuación hasta el día siguiente.
 */
export type WeeklySchedule = Record<Weekday, Interval[]>;

/** Ventanas con luz para una fecha concreta (YYYY-MM-DD). */
export interface DateSchedule {
  date: string;
  intervals: Interval[];
}

export type CircuitSchedule = WeeklySchedule | DateSchedule[];

export type CircuitSource = 'official' | 'user';

export interface Circuit {
  id: string;
  name: string;
  schedule: CircuitSchedule;
  /** Metadatos locales: distinguen datos oficiales de ediciones del usuario. */
  source?: CircuitSource;
  updatedAt?: string;
  /** Municipio del circuito, si se conoce (por ejemplo, al buscarlo en el mapa). */
  municipality?: string;
}

export interface Device {
  id: string;
  name: string;
  capacityMah?: number;
  capacityWh?: number;
  chargerWatts: number;
  /** Rendimiento de carga, entre 0 y 1. Por defecto 0.85. */
  efficiency?: number;
  /**
   * Preset del catálogo del que se copiaron los valores. Es solo un metadato
   * de origen: los cálculos usan siempre los valores guardados en el Device.
   */
  presetId?: string;
}

export interface ChargeWindow {
  start: Date;
  end: Date;
  durationMin: number;
  estimatedChargePercent?: number;
}

export type Theme = 'light' | 'dark' | 'system';

export interface UserSettings {
  selectedCircuitId: string;
  notificationLeadMinutes: number;
  theme: Theme;
  notificationsEnabled: boolean;
  activeDeviceId: string | null;
  /**
   * true cuando el usuario eligió «No sé cuál es mi circuito». La app sigue
   * usando el circuito activo, pero recuerda que está sin confirmar.
   */
  circuitPending: boolean;
  /**
   * Dirección de referencia escrita por el usuario. Solo se guarda en
   * IndexedDB: nunca se geocodifica ni se envía a internet.
   */
  address?: string;
}

export type PowerStatus = 'power' | 'outage';

export const DEFAULT_USER_SETTINGS: UserSettings = {
  selectedCircuitId: '',
  notificationLeadMinutes: 15,
  theme: 'system',
  notificationsEnabled: false,
  activeDeviceId: null,
  circuitPending: false,
};
