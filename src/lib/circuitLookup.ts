/**
 * Búsqueda del circuito más cercano a partir de los puntos publicados en
 * `public/geo/circuits-points.json`. El archivo se descarga de forma perezosa:
 * solo cuando se abre el mapa o se pulsa «Usar mi ubicación».
 */

export interface CircuitPoint {
  lat: number;
  lng: number;
  circuitId: string;
  circuitName: string;
  municipality: string;
}

export interface ClosestCircuit {
  circuitId: string;
  circuitName: string;
  municipality: string;
  distanceMeters: number;
}

export type ClosestCircuitResult = ClosestCircuit | { error: string };

/** Radio medio de la Tierra en metros (modelo esférico de la fórmula). */
export const EARTH_RADIUS_METERS = 6_371_000;

/**
 * A partir de esta distancia se considera que no hay circuito cerca. Los
 * puntos publicados son el centro geocodificado de cada zona, no la puerta de
 * casa: 15 km de margen evitan falsos «Muy lejos» en barrios rurales.
 */
export const MAX_NEARBY_DISTANCE_METERS = 15_000;

const TOO_FAR_ERROR = 'Muy lejos';

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/**
 * Fórmula de Haversine: distancia de círculo máximo entre dos coordenadas.
 * `a` es el cuadrado del seno de la mitad de la distancia angular; se limita a
 * 1 para evitar `NaN` por redondeos cuando los puntos son casi idénticos.
 */
export function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(deltaLng / 2) ** 2;
  const angularDistance = 2 * Math.asin(Math.min(1, Math.sqrt(a)));
  return EARTH_RADIUS_METERS * angularDistance;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function cleanText(value: unknown, maxLength = 200): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!text || text.length > maxLength) return null;
  return text;
}

/**
 * Valida el JSON de puntos. Las entradas inválidas se descartan; una colección
 * que no sea un array se rechaza para no ocultar un despliegue roto.
 */
export function parseCircuitPoints(value: unknown): CircuitPoint[] {
  if (!Array.isArray(value)) {
    throw new Error('El archivo de puntos de circuitos no tiene el formato esperado.');
  }

  const points: CircuitPoint[] = [];
  for (const raw of value) {
    if (!isRecord(raw)) continue;

    // El JSON publica explícitamente `lat`/`lng` (nunca `lon` ni pares
    // [lng, lat]): se leen tal cual y se pasan en ese mismo orden a Haversine.
    const lat = raw.lat;
    const lng = raw.lng;
    if (
      !isFiniteNumber(lat) ||
      !isFiniteNumber(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      continue;
    }

    // (0, 0) es el marcador de «geocodificación fallida» de la fuente; si no
    // se descarta, en el mar frente a África ganaría como punto más cercano.
    if (lat === 0 && lng === 0) continue;

    const circuitId = cleanText(raw.circuitId);
    const circuitName = cleanText(raw.circuitName);
    if (!circuitId || !circuitName) continue;

    points.push({
      lat,
      lng,
      circuitId,
      circuitName,
      municipality: cleanText(raw.municipality, 120) ?? '',
    });
  }

  if (points.length === 0) {
    throw new Error('El archivo de puntos de circuitos no contiene puntos válidos.');
  }

  return points;
}

function pointsUrl(): string {
  return `${import.meta.env.BASE_URL}geo/circuits-points.json`;
}

async function downloadCircuitPoints(): Promise<CircuitPoint[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(pointsUrl(), {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(
        `No se pudieron cargar los puntos de circuitos (${response.status}).`,
      );
    }
    return parseCircuitPoints(await response.json());
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('La descarga de circuitos cercanos tardó demasiado.');
    }
    if (error instanceof Error && error.message.startsWith('No se pudieron')) {
      throw error;
    }
    if (
      error instanceof Error &&
      error.message.startsWith('El archivo de puntos')
    ) {
      throw error;
    }
    throw new Error(
      'No se pudieron cargar los circuitos cercanos. Revisa la conexión.',
    );
  } finally {
    clearTimeout(timer);
  }
}

let pointsPromise: Promise<CircuitPoint[]> | null = null;

/**
 * Carga perezosa con caché en memoria. Si la descarga falla se limpia la
 * promesa para permitir un reintento al volver a abrir el mapa.
 */
export function prefetchCircuitPoints(): Promise<CircuitPoint[]> {
  if (!pointsPromise) {
    pointsPromise = downloadCircuitPoints().catch((error: unknown) => {
      pointsPromise = null;
      throw error;
    });
  }
  return pointsPromise;
}

/**
 * Devuelve el circuito cuyo punto está más cerca de las coordenadas dadas.
 * Si el punto más cercano supera los 15 km devuelve `{ error: "Muy lejos" }`.
 * El orden de argumentos es siempre (lat, lng).
 */
export async function findClosestCircuit(
  lat: number,
  lng: number,
): Promise<ClosestCircuitResult> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error('Las coordenadas recibidas no son válidas.');
  }

  const points = await prefetchCircuitPoints();

  let nearest: CircuitPoint | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const point of points) {
    const distance = haversineDistanceMeters(lat, lng, point.lat, point.lng);
    if (distance < nearestDistance) {
      nearest = point;
      nearestDistance = distance;
    }
  }

  if (!nearest || nearestDistance > MAX_NEARBY_DISTANCE_METERS) {
    return { error: TOO_FAR_ERROR };
  }

  return {
    circuitId: nearest.circuitId,
    circuitName: nearest.circuitName,
    municipality: nearest.municipality,
    distanceMeters: nearestDistance,
  };
}
