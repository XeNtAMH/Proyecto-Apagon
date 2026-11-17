import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const POINTS = [
  {
    lat: 22.4,
    lng: -79.5,
    circuitId: 'c-centro',
    circuitName: 'Centro',
    municipality: 'Municipio Centro',
  },
  {
    lat: 22.41,
    lng: -79.5,
    circuitId: 'c-norte',
    circuitName: 'Norte',
    municipality: 'Municipio Norte',
  },
];

function jsonResponse(value: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => value,
  } as Response;
}

describe('haversineDistanceMeters', () => {
  it('devuelve 0 para el mismo punto', async () => {
    const { haversineDistanceMeters } = await import('./circuitLookup');
    expect(haversineDistanceMeters(22.4, -79.5, 22.4, -79.5)).toBe(0);
  });

  it('calcula un grado de longitud en el ecuador (~111,2 km)', async () => {
    const { haversineDistanceMeters } = await import('./circuitLookup');
    const distance = haversineDistanceMeters(0, 0, 0, 1);
    expect(distance).toBeGreaterThan(111_000);
    expect(distance).toBeLessThan(111_400);
  });

  it('coincide con una distancia conocida entre La Habana y Santiago', async () => {
    const { haversineDistanceMeters } = await import('./circuitLookup');
    // ~758 km según la fórmula esférica con R = 6 371 km.
    const distance = haversineDistanceMeters(
      23.1136,
      -82.3666,
      20.0247,
      -75.8297,
    );
    expect(distance).toBeGreaterThan(750_000);
    expect(distance).toBeLessThan(770_000);
  });

  it('es simétrica', async () => {
    const { haversineDistanceMeters } = await import('./circuitLookup');
    const direct = haversineDistanceMeters(22.4, -79.5, 23.1, -82.4);
    const reverse = haversineDistanceMeters(23.1, -82.4, 22.4, -79.5);
    expect(direct).toBeCloseTo(reverse, 6);
  });
});

describe('findClosestCircuit', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('devuelve el punto más cercano con su distancia', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(POINTS)));
    const { findClosestCircuit } = await import('./circuitLookup');

    const result = await findClosestCircuit(22.4001, -79.5);

    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.circuitId).toBe('c-centro');
    expect(result.circuitName).toBe('Centro');
    expect(result.municipality).toBe('Municipio Centro');
    expect(result.distanceMeters).toBeGreaterThanOrEqual(0);
    expect(result.distanceMeters).toBeLessThan(100);
  });

  it('encuentra el circuito a ~9 km (dentro del margen de 15 km)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(POINTS)));
    const { findClosestCircuit } = await import('./circuitLookup');

    const result = await findClosestCircuit(22.49, -79.5);

    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.circuitId).toBe('c-norte');
    expect(result.distanceMeters).toBeGreaterThan(8_500);
    expect(result.distanceMeters).toBeLessThan(9_500);
  });

  it('devuelve «Muy lejos» si el punto más cercano supera 15 km', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(POINTS)));
    const { findClosestCircuit } = await import('./circuitLookup');

    const result = await findClosestCircuit(22.56, -79.5);

    expect(result).toEqual({ error: 'Muy lejos' });
  });

  it('solo descarga el JSON la primera vez (caché en memoria)', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(POINTS));
    vi.stubGlobal('fetch', fetchMock);
    const { findClosestCircuit } = await import('./circuitLookup');

    await findClosestCircuit(22.4, -79.5);
    await findClosestCircuit(22.41, -79.5);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rechaza un archivo que no es un array de puntos', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ points: [] })));
    const { findClosestCircuit } = await import('./circuitLookup');

    await expect(findClosestCircuit(22.4, -79.5)).rejects.toThrow(
      'formato esperado',
    );
  });

  it('descarta entradas inválidas y conserva las válidas', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse([
          { lat: 'no', lng: -79.5, circuitId: 'x', circuitName: 'X' },
          POINTS[0],
        ]),
      ),
    );
    const { findClosestCircuit } = await import('./circuitLookup');

    const result = await findClosestCircuit(22.4, -79.5);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.circuitId).toBe('c-centro');
  });

  it('descarta los puntos (0, 0) de geocodificación fallida', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse([
          { lat: 0, lng: 0, circuitId: 'c-null', circuitName: 'Null' },
          ...POINTS,
        ]),
      ),
    );
    const { findClosestCircuit } = await import('./circuitLookup');

    const result = await findClosestCircuit(0.001, 0.001);
    expect(result).toEqual({ error: 'Muy lejos' });
  });
});
