import { create } from 'zustand';
import { FALLBACK_SCHEDULES } from '../data/fallbackSchedules';
import { fetchOfficialSchedules } from '../lib/api';
import {
  deleteCircuitRecord,
  deleteDeviceRecord,
  getAllCircuits,
  getAllDevices,
  getLastScheduleUpdate,
  getStoredSettings,
  putCircuit,
  putCircuits,
  putDevice,
  replaceCircuits,
  replaceDevices,
  saveSettings,
  setLastScheduleUpdate,
} from '../lib/db';
import { createEmptyWeeklySchedule } from '../lib/schedule';
import {
  parseUserSettings,
  type BackupBundle,
  type OfficialSchedulesFile,
} from '../lib/validation';
import {
  DEFAULT_USER_SETTINGS,
  type Circuit,
  type Device,
  type UserSettings,
} from '../types';

type HydrationStatus = 'idle' | 'loading' | 'ready' | 'error';

interface AppStore {
  hydration: HydrationStatus;
  hydrationError: string | null;
  circuits: Circuit[];
  devices: Device[];
  settings: UserSettings;
  lastScheduleUpdate: string | null;
  syncing: boolean;
  hydrate: () => Promise<void>;
  refreshSchedules: () => Promise<void>;
  selectCircuit: (id: string) => Promise<void>;
  createCircuit: () => Promise<Circuit>;
  saveCircuit: (circuit: Circuit) => Promise<void>;
  deleteCircuit: (id: string) => Promise<void>;
  saveDevice: (device: Device) => Promise<void>;
  deleteDevice: (id: string) => Promise<void>;
  updateSettings: (patch: Partial<UserSettings>) => Promise<void>;
  importBackup: (bundle: BackupBundle) => Promise<void>;
  createBackup: () => BackupBundle;
}

let hydrationPromise: Promise<void> | null = null;

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Ocurrió un error inesperado.';
}

function isUserCircuit(circuit: Circuit): boolean {
  return circuit.source !== 'official';
}

function normalizeSettings(
  rawSettings: UserSettings | undefined,
  circuits: Circuit[],
  devices: Device[],
): UserSettings {
  const parsed = parseUserSettings(rawSettings, DEFAULT_USER_SETTINGS);
  const selectedCircuitId = circuits.some(
    (circuit) => circuit.id === parsed.selectedCircuitId,
  )
    ? parsed.selectedCircuitId
    : (circuits[0]?.id ?? '');
  const activeDeviceId =
    parsed.activeDeviceId &&
    devices.some((device) => device.id === parsed.activeDeviceId)
      ? parsed.activeDeviceId
      : (devices[0]?.id ?? null);

  return {
    ...parsed,
    selectedCircuitId,
    activeDeviceId,
  };
}

function seedFromFile(file: OfficialSchedulesFile): Circuit[] {
  return file.circuits.map((circuit) => ({
    ...circuit,
    source: 'official',
    updatedAt: file.updatedAt,
  }));
}

function mergeOfficialCircuits(
  localCircuits: Circuit[],
  file: OfficialSchedulesFile,
): Circuit[] {
  const userCircuits = localCircuits.filter(isUserCircuit);
  const userIds = new Set(userCircuits.map((circuit) => circuit.id));
  const officialCircuits = seedFromFile(file).filter(
    (circuit) => !userIds.has(circuit.id),
  );

  return [...officialCircuits, ...userCircuits];
}

export const useAppStore = create<AppStore>()((set, get) => ({
  hydration: 'idle',
  hydrationError: null,
  circuits: [],
  devices: [],
  settings: { ...DEFAULT_USER_SETTINGS },
  lastScheduleUpdate: null,
  syncing: false,

  hydrate: async () => {
    if (get().hydration === 'ready') return;
    if (hydrationPromise) return hydrationPromise;

    hydrationPromise = (async () => {
      set({ hydration: 'loading', hydrationError: null });

      try {
        const [storedCircuits, devices, storedSettings, storedLastUpdate] =
          await Promise.all([
            getAllCircuits(),
            getAllDevices(),
            getStoredSettings(),
            getLastScheduleUpdate(),
          ]);

        let circuits = storedCircuits;
        let lastUpdate = storedLastUpdate ?? null;

        // Primer arranque sin datos: intenta red y, si falla, usa el respaldo local.
        if (circuits.length === 0) {
          let scheduleFile = FALLBACK_SCHEDULES;
          try {
            scheduleFile = await fetchOfficialSchedules();
          } catch {
            scheduleFile = FALLBACK_SCHEDULES;
          }

          circuits = seedFromFile(scheduleFile);
          lastUpdate = scheduleFile.updatedAt;
          await putCircuits(circuits);
          await setLastScheduleUpdate(lastUpdate);
        }

        const settings = normalizeSettings(storedSettings, circuits, devices);
        await saveSettings(settings);

        set({
          circuits,
          devices,
          settings,
          lastScheduleUpdate: lastUpdate,
          hydration: 'ready',
          hydrationError: null,
        });

        // Actualización en segundo plano: no bloquea el primer render.
        void get().refreshSchedules();
      } catch (error) {
        set({
          hydration: 'error',
          hydrationError: getErrorMessage(error),
        });
      } finally {
        hydrationPromise = null;
      }
    })();

    return hydrationPromise;
  },

  refreshSchedules: async () => {
    if (get().syncing || get().hydration !== 'ready') return;
    set({ syncing: true });

    try {
      const remote = await fetchOfficialSchedules();
      const remoteTimestamp = Date.parse(remote.updatedAt);
      const currentTimestamp = get().lastScheduleUpdate
        ? Date.parse(get().lastScheduleUpdate as string)
        : Number.NaN;

      if (
        Number.isFinite(currentTimestamp) &&
        remoteTimestamp <= currentTimestamp
      ) {
        return;
      }

      const circuits = mergeOfficialCircuits(get().circuits, remote);
      const settings = normalizeSettings(
        get().settings,
        circuits,
        get().devices,
      );

      await replaceCircuits(circuits);
      await setLastScheduleUpdate(remote.updatedAt);
      await saveSettings(settings);

      set({
        circuits,
        settings,
        lastScheduleUpdate: remote.updatedAt,
      });
    } catch {
      // Sin conexión o caché fría: se conservan los datos de IndexedDB.
    } finally {
      set({ syncing: false });
    }
  },

  selectCircuit: async (id) => {
    const settings = { ...get().settings, selectedCircuitId: id };
    await saveSettings(settings);
    set({ settings });
  },

  createCircuit: async () => {
    const existingNames = new Set(
      get().circuits.map((circuit) => circuit.name.toLowerCase()),
    );
    let name = 'Mi circuito';
    let index = 2;
    while (existingNames.has(name.toLowerCase())) {
      name = `Mi circuito ${index}`;
      index += 1;
    }

    const circuit: Circuit = {
      id: createId('circuit'),
      name,
      schedule: createEmptyWeeklySchedule(),
      source: 'user',
      updatedAt: new Date().toISOString(),
    };

    await putCircuit(circuit);
    const circuits = [...get().circuits, circuit];
    const settings = {
      ...get().settings,
      selectedCircuitId: circuit.id,
    };
    await saveSettings(settings);
    set({ circuits, settings });
    return circuit;
  },

  saveCircuit: async (circuit) => {
    const saved: Circuit = {
      ...circuit,
      source: 'user',
      updatedAt: new Date().toISOString(),
    };
    await putCircuit(saved);

    const exists = get().circuits.some((item) => item.id === saved.id);
    const circuits = exists
      ? get().circuits.map((item) => (item.id === saved.id ? saved : item))
      : [...get().circuits, saved];

    const settings = {
      ...get().settings,
      selectedCircuitId: settingsCircuitIdFallback(
        get().settings.selectedCircuitId,
        circuits,
      ),
    };
    await saveSettings(settings);
    set({ circuits, settings });
  },

  deleteCircuit: async (id) => {
    const circuit = get().circuits.find((item) => item.id === id);
    if (!circuit) return;
    if (!isUserCircuit(circuit)) {
      throw new Error(
        'Los circuitos oficiales no se eliminan. Puedes editarlos o crear uno propio.',
      );
    }

    await deleteCircuitRecord(id);
    const circuits = get().circuits.filter((item) => item.id !== id);
    const settings = {
      ...get().settings,
      selectedCircuitId: settingsCircuitIdFallback(
        get().settings.selectedCircuitId,
        circuits,
      ),
    };
    await saveSettings(settings);
    set({ circuits, settings });
  },

  saveDevice: async (device) => {
    await putDevice(device);
    const exists = get().devices.some((item) => item.id === device.id);
    const devices = exists
      ? get().devices.map((item) => (item.id === device.id ? device : item))
      : [...get().devices, device];
    const settings = {
      ...get().settings,
      activeDeviceId: get().settings.activeDeviceId ?? device.id,
    };
    await saveSettings(settings);
    set({ devices, settings });
  },

  deleteDevice: async (id) => {
    await deleteDeviceRecord(id);
    const devices = get().devices.filter((item) => item.id !== id);
    const settings = {
      ...get().settings,
      activeDeviceId:
        get().settings.activeDeviceId === id
          ? (devices[0]?.id ?? null)
          : get().settings.activeDeviceId,
    };
    await saveSettings(settings);
    set({ devices, settings });
  },

  updateSettings: async (patch) => {
    const settings = parseUserSettings(
      { ...get().settings, ...patch },
      DEFAULT_USER_SETTINGS,
    );
    await saveSettings(settings);
    set({ settings });
  },

  importBackup: async (bundle) => {
    const settings = normalizeSettings(
      bundle.settings,
      bundle.circuits,
      bundle.devices,
    );
    const lastScheduleUpdate =
      bundle.lastScheduleUpdate ?? get().lastScheduleUpdate;

    await replaceCircuits(bundle.circuits);
    await replaceDevices(bundle.devices);
    await saveSettings(settings);
    if (lastScheduleUpdate) {
      await setLastScheduleUpdate(lastScheduleUpdate);
    }

    set({
      circuits: bundle.circuits,
      devices: bundle.devices,
      settings,
      lastScheduleUpdate,
    });
  },

  createBackup: () => {
    const { circuits, devices, settings, lastScheduleUpdate } = get();
    return {
      app: 'rotacion-circuitos',
      version: 1,
      exportedAt: new Date().toISOString(),
      circuits,
      devices,
      settings,
      lastScheduleUpdate,
    };
  },
}));

function settingsCircuitIdFallback(
  currentId: string,
  circuits: Circuit[],
): string {
  return circuits.some((circuit) => circuit.id === currentId)
    ? currentId
    : (circuits[0]?.id ?? '');
}
