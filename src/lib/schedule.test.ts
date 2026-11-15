import { describe, expect, it } from 'vitest';
import type { DateSchedule, Device, WeeklySchedule } from '../types';
import {
  createEmptyWeeklySchedule,
  estimateChargePercent,
  formatCountdown,
  getCapacityWh,
  getCurrentStatus,
  getNextChargeWindows,
  getNextOutage,
  normalizeIntervals,
} from './schedule';

const at = (
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
): Date => new Date(year, month - 1, day, hour, minute, 0, 0);

const mondayAt = (hour: number, minute = 0): Date =>
  at(2026, 11, 9, hour, minute);

const withDay = (
  day: keyof WeeklySchedule,
  intervals: WeeklySchedule[keyof WeeklySchedule],
): WeeklySchedule => {
  const schedule = createEmptyWeeklySchedule();
  schedule[day] = intervals;
  return schedule;
};

const device = (overrides: Partial<Device> = {}): Device => ({
  id: 'device-1',
  name: 'Power bank',
  capacityMah: 10000,
  chargerWatts: 20,
  efficiency: 0.85,
  ...overrides,
});

describe('getCurrentStatus', () => {
  it('detecta luz dentro de una ventana del día actual', () => {
    const schedule = withDay('monday', [{ start: '10:00', end: '14:00' }]);

    expect(getCurrentStatus(schedule, mondayAt(11))).toBe('power');
  });

  it('detecta apagón fuera de las ventanas de luz', () => {
    const schedule = withDay('monday', [{ start: '10:00', end: '14:00' }]);

    expect(getCurrentStatus(schedule, mondayAt(15))).toBe('outage');
  });

  it('maneja una ventana que empieza hoy y termina mañana', () => {
    const schedule = withDay('monday', [{ start: '22:00', end: '02:00' }]);

    expect(getCurrentStatus(schedule, mondayAt(23, 30))).toBe('power');
    expect(getCurrentStatus(schedule, at(2026, 11, 10, 1, 30))).toBe('power');
    expect(getCurrentStatus(schedule, at(2026, 11, 10, 3))).toBe('outage');
  });

  it('trata el límite final como inicio del apagón', () => {
    const schedule = withDay('monday', [{ start: '10:00', end: '14:00' }]);

    expect(getCurrentStatus(schedule, mondayAt(14))).toBe('outage');
    expect(getCurrentStatus(schedule, mondayAt(10))).toBe('power');
  });
});

describe('getNextChargeWindows', () => {
  it('fusiona intervalos adyacentes y solapados', () => {
    const schedule = withDay('monday', [
      { start: '06:00', end: '10:00' },
      { start: '10:00', end: '14:00' },
      { start: '13:00', end: '15:00' },
    ]);

    const windows = getNextChargeWindows(schedule, mondayAt(5), 1);

    expect(windows).toHaveLength(1);
    expect(windows[0].start).toEqual(mondayAt(6));
    expect(windows[0].end).toEqual(mondayAt(15));
    expect(windows[0].durationMin).toBe(540);
  });

  it('fusiona una ventana nocturna con la ventana del día siguiente', () => {
    const schedule = createEmptyWeeklySchedule();
    schedule.monday = [{ start: '22:00', end: '02:00' }];
    schedule.tuesday = [{ start: '00:00', end: '06:00' }];

    const windows = getNextChargeWindows(schedule, mondayAt(21), 1);

    expect(windows).toHaveLength(1);
    expect(windows[0].start).toEqual(mondayAt(22));
    expect(windows[0].end).toEqual(at(2026, 11, 10, 6));
    expect(windows[0].durationMin).toBe(480);
  });

  it('incluye la ventana activa conservando su inicio real', () => {
    const schedule = withDay('monday', [{ start: '06:00', end: '10:00' }]);

    const windows = getNextChargeWindows(schedule, mondayAt(8), 1);

    expect(windows[0].start).toEqual(mondayAt(6));
    expect(windows[0].end).toEqual(mondayAt(10));
  });

  it('devuelve la siguiente ventana aunque esté a más de 24 horas', () => {
    const schedule = withDay('friday', [{ start: '10:00', end: '12:00' }]);

    const windows = getNextChargeWindows(schedule, mondayAt(8), 1);

    expect(windows).toHaveLength(1);
    expect(windows[0].start).toEqual(at(2026, 11, 13, 10));
  });

  it('no inventa ventanas cuando el calendario está vacío', () => {
    const schedule = createEmptyWeeklySchedule();

    expect(getNextChargeWindows(schedule, mondayAt(8), 3)).toEqual([]);
  });

  it('respeta el número de ventanas solicitado', () => {
    const schedule = withDay('monday', [
      { start: '06:00', end: '08:00' },
      { start: '10:00', end: '12:00' },
      { start: '14:00', end: '16:00' },
    ]);

    const windows = getNextChargeWindows(schedule, mondayAt(5), 2);

    expect(windows).toHaveLength(2);
    expect(windows[0].start).toEqual(mondayAt(6));
    expect(windows[1].start).toEqual(mondayAt(10));
  });
});

describe('getNextOutage', () => {
  it('devuelve el apagón en curso si ya empezó', () => {
    const schedule = createEmptyWeeklySchedule();
    schedule.monday = [{ start: '10:00', end: '14:00' }];
    schedule.tuesday = [{ start: '10:00', end: '14:00' }];

    const outage = getNextOutage(schedule, mondayAt(15));

    expect(outage).not.toBeNull();
    expect(outage?.start).toEqual(mondayAt(14));
    expect(outage?.end).toEqual(at(2026, 11, 10, 10));
  });

  it('calcula el próximo apagón cuando hay luz ahora', () => {
    const schedule = createEmptyWeeklySchedule();
    schedule.monday = [{ start: '10:00', end: '14:00' }];
    schedule.tuesday = [{ start: '10:00', end: '14:00' }];

    const outage = getNextOutage(schedule, mondayAt(11));

    expect(outage?.start).toEqual(mondayAt(14));
    expect(outage?.end).toEqual(at(2026, 11, 10, 10));
  });

  it('devuelve null si no hay ninguna ventana futura conocida', () => {
    expect(getNextOutage(createEmptyWeeklySchedule(), mondayAt(8))).toBeNull();
  });
});

describe('horarios por fecha específica', () => {
  const dateSchedules: DateSchedule[] = [
    {
      date: '2026-11-09',
      intervals: [{ start: '08:00', end: '12:00' }],
    },
    {
      date: '2026-11-10',
      intervals: [{ start: '09:00', end: '11:00' }],
    },
  ];

  it('aplica únicamente las fechas registradas', () => {
    expect(getCurrentStatus(dateSchedules, mondayAt(9))).toBe('power');
    expect(getCurrentStatus(dateSchedules, at(2026, 11, 11, 9))).toBe('outage');
  });

  it('encuentra la próxima ventana por fecha específica', () => {
    const windows = getNextChargeWindows(dateSchedules, mondayAt(13), 2);

    expect(windows[0].start).toEqual(at(2026, 11, 10, 9));
    expect(windows[1]).toBeUndefined();
  });

  it('no devuelve ventanas futuras si todas las fechas ya pasaron', () => {
    const pastOnly: DateSchedule[] = [
      {
        date: '2026-11-08',
        intervals: [{ start: '08:00', end: '12:00' }],
      },
    ];

    expect(getNextChargeWindows(pastOnly, mondayAt(8), 3)).toEqual([]);
  });
});

describe('estimateChargePercent', () => {
  it('convierte mAh a Wh y aplica la fórmula con eficiencia', () => {
    // 10.000 mAh × 3.7 V = 37 Wh; 20 W × 2 h × 0.85 / 37 Wh ≈ 91.9 %
    expect(estimateChargePercent(device(), 120)).toBe(92);
    expect(getCapacityWh(device())).toBeCloseTo(37, 5);
  });

  it('usa Wh cuando está disponible y limita el resultado a 100', () => {
    const laptop = device({
      capacityMah: undefined,
      capacityWh: 50,
      chargerWatts: 100,
      efficiency: 1,
    });

    expect(estimateChargePercent(laptop, 60)).toBe(100);
  });

  it('aplica 0.85 de eficiencia por defecto', () => {
    const withoutEfficiency = device({ efficiency: undefined });

    expect(estimateChargePercent(withoutEfficiency, 120)).toBe(92);
  });

  it('devuelve 0 si no hay capacidad válida o la ventana es inválida', () => {
    expect(
      estimateChargePercent(
        device({ capacityMah: undefined, capacityWh: undefined }),
        60,
      ),
    ).toBe(0);
    expect(estimateChargePercent(device(), 0)).toBe(0);
    expect(estimateChargePercent(device(), Number.NaN)).toBe(0);
  });
});

describe('formatCountdown', () => {
  it('formatea horas, minutos y segundos', () => {
    expect(formatCountdown(5_025_000)).toBe('1h 23m 45s');
  });

  it('omite las horas cuando no son necesarias', () => {
    expect(formatCountdown(65_000)).toBe('1m 05s');
    expect(formatCountdown(5_000)).toBe('5s');
  });

  it('nunca muestra valores negativos', () => {
    expect(formatCountdown(-1_000)).toBe('0s');
    expect(formatCountdown(0)).toBe('0s');
  });
});

describe('normalizeIntervals', () => {
  it('ordena y fusiona intervalos diurnos continuos', () => {
    expect(
      normalizeIntervals([
        { start: '10:00', end: '14:00' },
        { start: '06:00', end: '10:00' },
      ]),
    ).toEqual([{ start: '06:00', end: '14:00' }]);
  });

  it('conserva sin cambios una ventana nocturna', () => {
    expect(
      normalizeIntervals([{ start: '22:00', end: '02:00' }]),
    ).toEqual([{ start: '22:00', end: '02:00' }]);
  });
});
