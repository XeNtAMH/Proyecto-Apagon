export interface CircuitZone {
  id: string;
  name: string;
  circuitId: string;
}

export interface CircuitMunicipality {
  id: string;
  name: string;
  zones: CircuitZone[];
}

export interface CircuitProvince {
  id: string;
  name: string;
  municipalities: CircuitMunicipality[];
}

export interface CircuitsIndex {
  version: 1;
  updatedAt: string;
  source: string;
  provinces: CircuitProvince[];
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown, maxLength = 120): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!text || text.length > maxLength) return null;
  return text;
}

function assetUrl(path: string): string {
  return new URL(
    path,
    new URL(import.meta.env.BASE_URL, window.location.href),
  ).href;
}

async function fetchJson(path: string, timeoutMs = 8_000): Promise<unknown> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(assetUrl(path), {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`No se pudieron cargar los datos de zonas (${response.status}).`);
    }
    return await response.json();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('La descarga de zonas tardó demasiado. Inténtalo de nuevo.');
    }
    if (error instanceof Error && error.message.startsWith('No se pudieron')) {
      throw error;
    }
    throw new Error(
      'No se pudieron cargar los datos de zonas. Revisa la conexión e inténtalo de nuevo.',
    );
  } finally {
    window.clearTimeout(timer);
  }
}

function parseZone(value: unknown): CircuitZone {
  if (!isRecord(value)) throw invalidIndex();
  const id = cleanText(value.id, 200);
  const name = cleanText(value.name);
  const circuitId = cleanText(value.circuitId, 200);
  if (!id || !name || !circuitId) throw invalidIndex();
  return { id, name, circuitId };
}

function invalidIndex(): Error {
  return new Error('El índice de circuitos no tiene el formato esperado.');
}

export function parseCircuitsIndex(value: unknown): CircuitsIndex {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.provinces)) {
    throw invalidIndex();
  }

  const provinces = value.provinces.map((rawProvince) => {
    if (
      !isRecord(rawProvince) ||
      !Array.isArray(rawProvince.municipalities)
    ) {
      throw invalidIndex();
    }
    const provinceId = cleanText(rawProvince.id, 200);
    const provinceName = cleanText(rawProvince.name);
    if (!provinceId || !provinceName) throw invalidIndex();

    const municipalities = rawProvince.municipalities.map((rawMunicipality) => {
      if (!isRecord(rawMunicipality) || !Array.isArray(rawMunicipality.zones)) {
        throw invalidIndex();
      }
      const municipalityId = cleanText(rawMunicipality.id, 200);
      const municipalityName = cleanText(rawMunicipality.name);
      if (!municipalityId || !municipalityName) throw invalidIndex();

      const zones = rawMunicipality.zones.map(parseZone);
      return {
        id: municipalityId,
        name: municipalityName,
        zones,
      };
    });

    return {
      id: provinceId,
      name: provinceName,
      municipalities,
    };
  });

  return {
    version: 1,
    updatedAt:
      typeof value.updatedAt === 'string' ? value.updatedAt : '',
    source: typeof value.source === 'string' ? value.source : '',
    provinces,
  };
}

export async function fetchCircuitsIndex(): Promise<CircuitsIndex> {
  return parseCircuitsIndex(await fetchJson('geo/circuits-index.json'));
}
