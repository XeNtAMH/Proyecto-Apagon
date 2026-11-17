/**
 * Genera el índice de zonas a partir de public/schedules.json.
 *
 * No inventa geografía: usa `province` y `municipality` del circuito si están
 * presentes. Si el archivo de horarios todavía no los incluye, agrupa todo bajo
 * "Sin provincia" / "Sin municipio" para que el flujo siga siendo usable.
 *
 * También genera public/geo/zones/manifest.json a partir de los .geojson que
 * existan en public/geo/zones. Solo las provincias con features válidas
 * habilitan el botón "Usar mi ubicación".
 *
 * Uso: node scripts/build-geo-index.mjs
 */
import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const schedulesPath = resolve(root, 'public/schedules.json');
const geoDir = resolve(root, 'public/geo');
const zonesDir = resolve(geoDir, 'zones');
const indexPath = resolve(geoDir, 'circuits-index.json');
const manifestPath = resolve(zonesDir, 'manifest.json');

const UNKNOWN_PROVINCE = 'Sin provincia';
const UNKNOWN_MUNICIPALITY = 'Sin municipio';

/**
 * División política de Cuba: 15 provincias + Isla de la Juventud.
 * Son solo nombres e identificadores; este script no genera geometrías.
 * Los municipios se añaden únicamente desde los metadatos de schedules.json.
 */
const CUBA_PROVINCES = [
  ['pinar-del-rio', 'Pinar del Río'],
  ['artemisa', 'Artemisa'],
  ['la-habana', 'La Habana'],
  ['mayabeque', 'Mayabeque'],
  ['matanzas', 'Matanzas'],
  ['villa-clara', 'Villa Clara'],
  ['cienfuegos', 'Cienfuegos'],
  ['sancti-spiritus', 'Sancti Spíritus'],
  ['ciego-de-avila', 'Ciego de Ávila'],
  ['camaguey', 'Camagüey'],
  ['las-tunas', 'Las Tunas'],
  ['holguin', 'Holguín'],
  ['granma', 'Granma'],
  ['santiago-de-cuba', 'Santiago de Cuba'],
  ['guantanamo', 'Guantánamo'],
  ['isla-de-la-juventud', 'Isla de la Juventud'],
];

function slug(text) {
  return (
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'zona'
  );
}

function cleanText(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function geoField(circuit, key) {
  return cleanText(circuit[key]) ?? cleanText(circuit.geo?.[key]);
}

function compareNames(a, b) {
  return a.name.localeCompare(b.name, 'es');
}

const schedules = JSON.parse(await readFile(schedulesPath, 'utf8'));
if (!Array.isArray(schedules.circuits)) {
  throw new Error('public/schedules.json no contiene un array "circuits".');
}

const provinces = new Map();
for (const [id, name] of CUBA_PROVINCES) {
  provinces.set(id, { id, name, municipalities: new Map() });
}

const extraProvinces = new Map();

for (const circuit of schedules.circuits) {
  if (!circuit || typeof circuit.id !== 'string' || typeof circuit.name !== 'string') {
    throw new Error('Hay un circuito sin id o nombre en public/schedules.json.');
  }

  const rawProvince = geoField(circuit, 'province');
  const rawMunicipality = geoField(circuit, 'municipality');

  const provinceName = rawProvince ?? UNKNOWN_PROVINCE;
  const municipalityName = rawMunicipality ?? UNKNOWN_MUNICIPALITY;
  const zoneName = geoField(circuit, 'zone') ?? circuit.name;

  const provinceId = slug(provinceName);
  const municipalityId = slug(municipalityName);

  // Si el nombre no está en la lista oficial no se descarta: se añade al
  // final para no perder circuitos publicados con una grafía distinta.
  const target = provinces.has(provinceId)
    ? provinces
    : rawProvince
      ? extraProvinces
      : provinces;
  if (!target.has(provinceId)) {
    target.set(provinceId, {
      id: provinceId,
      name: provinceName,
      municipalities: new Map(),
    });
  }
  const province = target.get(provinceId);

  if (!province.municipalities.has(municipalityId)) {
    province.municipalities.set(municipalityId, {
      id: municipalityId,
      name: municipalityName,
      zones: [],
    });
  }
  province.municipalities.get(municipalityId).zones.push({
    id: circuit.id,
    name: zoneName,
    circuitId: circuit.id,
  });
}

const orderedProvinces = [...provinces.values(), ...extraProvinces.values()];

const index = {
  version: 1,
  updatedAt: typeof schedules.updatedAt === 'string' ? schedules.updatedAt : '',
  source: 'schedules.json',
  provinces: orderedProvinces.map((province) => ({
    id: province.id,
    name: province.name,
    municipalities: [...province.municipalities.values()]
      .map((municipality) => ({
        id: municipality.id,
        name: municipality.name,
        zones: municipality.zones.sort(compareNames),
      }))
      .sort(compareNames),
  })),
};

await mkdir(zonesDir, { recursive: true });

const indexJson = `${JSON.stringify(index, null, 2)}\n`;
await writeFile(indexPath, indexJson, 'utf8');

// Un GeoJSON perezoso por provincia. Nunca se sobrescribe un archivo real:
// si no existe, se crea vacío y la UI oculta la capa hasta que haya polígonos.
const emptyCollection = {
  type: 'FeatureCollection',
  features: [],
};
for (const province of index.provinces) {
  const filePath = resolve(zonesDir, `${province.id}.geojson`);
  try {
    await access(filePath);
  } catch {
    await writeFile(
      filePath,
      `${JSON.stringify(emptyCollection, null, 2)}\n`,
      'utf8',
    );
  }
}

const zoneFiles = (await readdir(zonesDir))
  .filter((file) => file.toLowerCase().endsWith('.geojson'))
  .sort((a, b) => a.localeCompare(b, 'es'));

const manifestProvinces = [];
for (const file of zoneFiles) {
  const provinceId = file.slice(0, -'.geojson'.length);
  let featureCount = 0;
  try {
    const raw = JSON.parse(await readFile(resolve(zonesDir, file), 'utf8'));
    const features = Array.isArray(raw?.features) ? raw.features : [];
    featureCount = features.filter(
      (feature) =>
        (feature?.geometry?.type === 'Polygon' ||
          feature?.geometry?.type === 'MultiPolygon') &&
        typeof feature?.properties?.circuitId === 'string' &&
        feature.properties.circuitId.trim().length > 0,
    ).length;
  } catch {
    console.warn(`Aviso: ${file} no es un GeoJSON válido y se ignora.`);
  }
  if (featureCount > 0) {
    manifestProvinces.push({ id: provinceId, zoneCount: featureCount });
  }
}

const manifest = {
  version: 1,
  updatedAt: typeof schedules.updatedAt === 'string' ? schedules.updatedAt : '',
  provinces: manifestProvinces,
};
await writeFile(
  manifestPath,
  `${JSON.stringify(manifest, null, 2)}\n`,
  'utf8',
);

const zoneCount = index.provinces.reduce(
  (total, province) =>
    total +
    province.municipalities.reduce(
      (provinceTotal, municipality) => provinceTotal + municipality.zones.length,
      0,
    ),
  0,
);

console.log(
  `Índice geo: ${index.provinces.length} provincia(s), ${zoneCount} zona(s) → ${indexPath}`,
);
console.log(
  `Manifest de mapas: ${manifestProvinces.length} provincia(s) con GeoJSON → ${manifestPath}`,
);
