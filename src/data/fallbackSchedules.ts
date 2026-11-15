import type { OfficialSchedulesFile } from '../lib/validation';

/**
 * Respaldo local mínimo para el primer arranque sin red. Los datos oficiales
 * normales llegan desde public/schedules.json y se persisten en IndexedDB.
 */
export const FALLBACK_SCHEDULES: OfficialSchedulesFile = {
  version: 1,
  updatedAt: '2026-11-09T12:00:00.000Z',
  circuits: [
    {
      id: 'c-centro-01',
      name: 'Centro · C-01',
      schedule: {
        monday: [
          { start: '02:00', end: '06:00' },
          { start: '10:30', end: '14:00' },
          { start: '18:00', end: '22:00' },
        ],
        tuesday: [
          { start: '02:00', end: '06:00' },
          { start: '10:30', end: '14:00' },
          { start: '18:00', end: '22:00' },
        ],
        wednesday: [
          { start: '02:00', end: '06:00' },
          { start: '10:30', end: '14:00' },
          { start: '18:00', end: '22:00' },
        ],
        thursday: [
          { start: '02:00', end: '06:00' },
          { start: '10:30', end: '14:00' },
          { start: '18:00', end: '22:00' },
        ],
        friday: [
          { start: '02:00', end: '06:00' },
          { start: '10:30', end: '14:00' },
          { start: '18:00', end: '22:00' },
        ],
        saturday: [
          { start: '06:00', end: '12:00' },
          { start: '16:00', end: '23:00' },
        ],
        sunday: [
          { start: '08:00', end: '12:00' },
          { start: '20:00', end: '02:00' },
        ],
      },
    },
    {
      id: 'n-norte-03',
      name: 'Norte · N-03',
      schedule: {
        monday: [
          { start: '01:00', end: '05:00' },
          { start: '11:00', end: '15:00' },
          { start: '19:00', end: '23:30' },
        ],
        tuesday: [
          { start: '01:00', end: '05:00' },
          { start: '12:00', end: '16:00' },
          { start: '20:00', end: '00:00' },
        ],
        wednesday: [
          { start: '00:00', end: '05:30' },
          { start: '12:00', end: '16:00' },
          { start: '20:00', end: '00:00' },
        ],
        thursday: [
          { start: '00:00', end: '05:00' },
          { start: '10:00', end: '14:00' },
        ],
        friday: [
          { start: '00:00', end: '05:00' },
          { start: '11:00', end: '15:00' },
          { start: '19:00', end: '01:00' },
        ],
        saturday: [
          { start: '01:00', end: '06:00' },
          { start: '13:00', end: '17:00' },
          { start: '21:00', end: '02:00' },
        ],
        sunday: [
          { start: '02:00', end: '06:00' },
          { start: '14:00', end: '18:00' },
        ],
      },
    },
    {
      id: 'h-hospital-02',
      name: 'Hospital · H-02',
      schedule: {
        monday: [
          { start: '00:00', end: '08:00' },
          { start: '12:00', end: '16:00' },
          { start: '20:00', end: '00:00' },
        ],
        tuesday: [
          { start: '00:00', end: '08:00' },
          { start: '12:00', end: '16:00' },
          { start: '20:00', end: '00:00' },
        ],
        wednesday: [
          { start: '00:00', end: '08:00' },
          { start: '12:00', end: '16:00' },
          { start: '20:00', end: '00:00' },
        ],
        thursday: [
          { start: '00:00', end: '08:00' },
          { start: '12:00', end: '16:00' },
          { start: '20:00', end: '00:00' },
        ],
        friday: [
          { start: '00:00', end: '08:00' },
          { start: '12:00', end: '16:00' },
          { start: '20:00', end: '00:00' },
        ],
        saturday: [
          { start: '00:00', end: '08:00' },
          { start: '12:00', end: '16:00' },
          { start: '20:00', end: '00:00' },
        ],
        sunday: [
          { start: '00:00', end: '08:00' },
          { start: '12:00', end: '16:00' },
          { start: '20:00', end: '00:00' },
        ],
      },
    },
  ],
};
