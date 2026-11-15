import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Circuit, Device, UserSettings } from '../types';

interface RotationDB extends DBSchema {
  circuits: {
    key: string;
    value: Circuit;
  };
  devices: {
    key: string;
    value: Device;
  };
  settings: {
    key: string;
    value: UserSettings;
  };
  meta: {
    key: string;
    value: string;
  };
}

const DB_NAME = 'rotacion-circuitos';
const DB_VERSION = 1;
const SETTINGS_KEY = 'user-settings';
const LAST_UPDATE_KEY = 'last-schedule-update';

let dbPromise: Promise<IDBPDatabase<RotationDB>> | null = null;

function getDb(): Promise<IDBPDatabase<RotationDB>> {
  if (!dbPromise) {
    dbPromise = openDB<RotationDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('circuits')) {
          db.createObjectStore('circuits', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('devices')) {
          db.createObjectStore('devices', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta');
        }
      },
    });
  }
  return dbPromise;
}

export async function getAllCircuits(): Promise<Circuit[]> {
  return (await getDb()).getAll('circuits');
}

export async function putCircuit(circuit: Circuit): Promise<void> {
  await (await getDb()).put('circuits', circuit);
}

export async function putCircuits(circuits: Circuit[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('circuits', 'readwrite');
  await Promise.all([
    ...circuits.map((circuit) => tx.store.put(circuit)),
    tx.done,
  ]);
}

export async function replaceCircuits(circuits: Circuit[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('circuits', 'readwrite');
  await tx.store.clear();
  await Promise.all([
    ...circuits.map((circuit) => tx.store.put(circuit)),
    tx.done,
  ]);
}

export async function deleteCircuitRecord(id: string): Promise<void> {
  await (await getDb()).delete('circuits', id);
}

export async function getAllDevices(): Promise<Device[]> {
  return (await getDb()).getAll('devices');
}

export async function putDevice(device: Device): Promise<void> {
  await (await getDb()).put('devices', device);
}

export async function replaceDevices(devices: Device[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('devices', 'readwrite');
  await tx.store.clear();
  await Promise.all([
    ...devices.map((device) => tx.store.put(device)),
    tx.done,
  ]);
}

export async function deleteDeviceRecord(id: string): Promise<void> {
  await (await getDb()).delete('devices', id);
}

export async function getStoredSettings(): Promise<
  UserSettings | undefined
> {
  return (await getDb()).get('settings', SETTINGS_KEY);
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  await (await getDb()).put('settings', settings, SETTINGS_KEY);
}

export async function getLastScheduleUpdate(): Promise<string | undefined> {
  return (await getDb()).get('meta', LAST_UPDATE_KEY);
}

export async function setLastScheduleUpdate(value: string): Promise<void> {
  await (await getDb()).put('meta', value, LAST_UPDATE_KEY);
}
