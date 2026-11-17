import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { parseCircuitsIndex } from './geo';

const readJson = (path: string): unknown =>
  JSON.parse(readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8'));

describe('índice de circuitos generado', () => {
  const raw = readFileSync(
    fileURLToPath(new URL('../../public/geo/circuits-index.json', import.meta.url)),
  );
  const index = parseCircuitsIndex(JSON.parse(raw.toString('utf8')));
  const schedules = readJson('../../public/schedules.json') as {
    circuits: Array<{ id: string }>;
  };

  it('se mantiene por debajo de 40 kB gzip', () => {
    expect(gzipSync(raw).byteLength).toBeLessThan(40 * 1024);
  });

  it('incluye todos los circuitos de schedules.json una sola vez', () => {
    const zoneCircuitIds = index.provinces.flatMap((province) =>
      province.municipalities.flatMap((municipality) =>
        municipality.zones.map((zone) => zone.circuitId),
      ),
    );
    const scheduleIds = schedules.circuits.map((circuit) => circuit.id).sort();
    expect([...zoneCircuitIds].sort()).toEqual(scheduleIds);
    expect(new Set(zoneCircuitIds).size).toBe(zoneCircuitIds.length);
  });

  it('incluye las 15 provincias y la Isla de la Juventud', () => {
    const expected = [
      'Pinar del Río',
      'Artemisa',
      'La Habana',
      'Mayabeque',
      'Matanzas',
      'Villa Clara',
      'Cienfuegos',
      'Sancti Spíritus',
      'Ciego de Ávila',
      'Camagüey',
      'Las Tunas',
      'Holguín',
      'Granma',
      'Santiago de Cuba',
      'Guantánamo',
      'Isla de la Juventud',
    ];
    const names = index.provinces.map((province) => province.name);
    for (const name of expected) {
      expect(names).toContain(name);
    }
  });

  it('cada zona tiene provincia, municipio y nombre', () => {
    for (const province of index.provinces) {
      expect(province.name.length).toBeGreaterThan(0);
      for (const municipality of province.municipalities) {
        expect(municipality.name.length).toBeGreaterThan(0);
        expect(municipality.zones.length).toBeGreaterThan(0);
        for (const zone of municipality.zones) {
          expect(zone.name.length).toBeGreaterThan(0);
          expect(zone.id.length).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe('parseCircuitsIndex', () => {
  it('rechaza estructuras que no son el índice esperado', () => {
    expect(() => parseCircuitsIndex(null)).toThrow();
    expect(() => parseCircuitsIndex({ version: 2 })).toThrow();
  });

  it('acepta un índice mínimo válido', () => {
    const parsed = parseCircuitsIndex({
      version: 1,
      updatedAt: '2026-01-01T00:00:00.000Z',
      source: 'schedules.json',
      provinces: [
        {
          id: 'p',
          name: 'Provincia',
          municipalities: [
            {
              id: 'm',
              name: 'Municipio',
              zones: [{ id: 'z', name: 'Zona', circuitId: 'c-1' }],
            },
          ],
        },
      ],
    });
    expect(parsed.provinces[0].municipalities[0].zones[0].circuitId).toBe('c-1');
  });
});
