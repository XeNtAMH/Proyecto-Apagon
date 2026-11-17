/**
 * Catálogo de dispositivos para el flujo de selección.
 *
 * Este módulo se carga con `import()` dinámico desde `DevicesPage`: no forma
 * parte del JS inicial. Los valores son orientativos y se copian al guardar el
 * dispositivo, de modo que editar el catálogo nunca cambia datos ya guardados.
 *
 * `batteryWh` es la capacidad nominal de la batería y `chargeWatts` la potencia
 * de entrada que suele aceptar el equipo.
 */

export type DeviceCategory =
  | 'phone'
  | 'powerbank'
  | 'laptop'
  | 'tablet'
  | 'ups'
  | 'router'
  | 'fan'
  | 'lamp'
  | 'other';

export interface DevicePreset {
  id: string;
  category: DeviceCategory;
  brand: string;
  model: string;
  batteryWh: number;
  chargeWatts: number;
  efficiency?: number;
  popular?: boolean;
}

export interface DeviceCategoryMeta {
  id: DeviceCategory;
  label: string;
  hint: string;
}

export const DEVICE_CATEGORIES: DeviceCategoryMeta[] = [
  { id: 'phone', label: 'Teléfono', hint: 'Móvil o smartphone' },
  { id: 'powerbank', label: 'Power bank', hint: 'Batería portátil' },
  { id: 'laptop', label: 'Portátil', hint: 'Laptop o notebook' },
  { id: 'tablet', label: 'Tablet', hint: 'Tableta o e-reader grande' },
  { id: 'ups', label: 'SAI / UPS', hint: 'Respaldo de enchufe' },
  { id: 'router', label: 'Router', hint: 'Wi-Fi con mini SAI' },
  { id: 'fan', label: 'Ventilador', hint: 'Recargable o de camping' },
  { id: 'lamp', label: 'Lámpara', hint: 'Luz LED recargable' },
  { id: 'other', label: 'Otro equipo', hint: 'Estación portátil u otros' },
];

/** Sufijo de los presets «No sé»: se usan para detectarlos sin cargar el catálogo. */
export const UNKNOWN_PRESET_SUFFIX = '-sin-modelo';

export const DEVICE_PRESETS: DevicePreset[] = [
  // Teléfonos
  { id: 'phone-iphone-14', category: 'phone', brand: 'Apple', model: 'iPhone 14', batteryWh: 12.7, chargeWatts: 20, efficiency: 0.8, popular: true },
  { id: 'phone-iphone-se-3', category: 'phone', brand: 'Apple', model: 'iPhone SE (3.ª gen)', batteryWh: 7.8, chargeWatts: 18, efficiency: 0.8 },
  { id: 'phone-galaxy-s23', category: 'phone', brand: 'Samsung', model: 'Galaxy S23', batteryWh: 15.1, chargeWatts: 25, efficiency: 0.8 },
  { id: 'phone-redmi-note-12', category: 'phone', brand: 'Xiaomi', model: 'Redmi Note 12', batteryWh: 19.4, chargeWatts: 33, efficiency: 0.8 },
  { id: 'phone-moto-g54', category: 'phone', brand: 'Motorola', model: 'Moto G54', batteryWh: 19.4, chargeWatts: 20, efficiency: 0.8 },
  { id: 'phone-sin-modelo', category: 'phone', brand: '', model: 'Teléfono genérico', batteryWh: 16, chargeWatts: 10, efficiency: 0.75 },

  // Power banks
  { id: 'powerbank-anker-737', category: 'powerbank', brand: 'Anker', model: '737 (24.000 mAh)', batteryWh: 86.4, chargeWatts: 100, efficiency: 0.85, popular: true },
  { id: 'powerbank-xiaomi-20000', category: 'powerbank', brand: 'Xiaomi', model: 'Power Bank 3 (20.000 mAh)', batteryWh: 74, chargeWatts: 18, efficiency: 0.85 },
  { id: 'powerbank-anker-622', category: 'powerbank', brand: 'Anker', model: '622 MagGo (5.000 mAh)', batteryWh: 19.3, chargeWatts: 10, efficiency: 0.8 },
  { id: 'powerbank-belkin-10k', category: 'powerbank', brand: 'Belkin', model: 'BoostCharge 10K', batteryWh: 37, chargeWatts: 15, efficiency: 0.85 },
  { id: 'powerbank-sin-modelo', category: 'powerbank', brand: '', model: 'Power bank genérica', batteryWh: 74, chargeWatts: 12, efficiency: 0.75 },

  // Portátiles
  { id: 'laptop-macbook-air-m1', category: 'laptop', brand: 'Apple', model: 'MacBook Air M1', batteryWh: 49.9, chargeWatts: 30, efficiency: 0.85, popular: true },
  { id: 'laptop-macbook-air-m2', category: 'laptop', brand: 'Apple', model: 'MacBook Air M2', batteryWh: 52.6, chargeWatts: 35, efficiency: 0.85 },
  { id: 'laptop-thinkpad-t14', category: 'laptop', brand: 'Lenovo', model: 'ThinkPad T14 Gen 3', batteryWh: 52.5, chargeWatts: 45, efficiency: 0.85 },
  { id: 'laptop-xps-13', category: 'laptop', brand: 'Dell', model: 'XPS 13', batteryWh: 51, chargeWatts: 45, efficiency: 0.85 },
  { id: 'laptop-pavilion-14', category: 'laptop', brand: 'HP', model: 'Pavilion 14', batteryWh: 41, chargeWatts: 45, efficiency: 0.85 },
  { id: 'laptop-sin-modelo', category: 'laptop', brand: '', model: 'Portátil genérico', batteryWh: 55, chargeWatts: 35, efficiency: 0.8 },

  // Tablets
  { id: 'tablet-ipad-10', category: 'tablet', brand: 'Apple', model: 'iPad (10.ª gen)', batteryWh: 28.6, chargeWatts: 20, efficiency: 0.85, popular: true },
  { id: 'tablet-ipad-air-5', category: 'tablet', brand: 'Apple', model: 'iPad Air (5.ª gen)', batteryWh: 28.6, chargeWatts: 20, efficiency: 0.85 },
  { id: 'tablet-galaxy-tab-s8', category: 'tablet', brand: 'Samsung', model: 'Galaxy Tab S8', batteryWh: 30.4, chargeWatts: 45, efficiency: 0.85 },
  { id: 'tablet-lenovo-tab-m10', category: 'tablet', brand: 'Lenovo', model: 'Tab M10', batteryWh: 19.6, chargeWatts: 10, efficiency: 0.8 },
  { id: 'tablet-sin-modelo', category: 'tablet', brand: '', model: 'Tablet genérica', batteryWh: 30, chargeWatts: 15, efficiency: 0.8 },

  // SAI / UPS
  { id: 'ups-apc-back-ups-650', category: 'ups', brand: 'APC', model: 'Back-UPS 650', batteryWh: 108, chargeWatts: 30, efficiency: 0.85, popular: true },
  { id: 'ups-apc-be600', category: 'ups', brand: 'APC', model: 'Back-UPS BE600', batteryWh: 84, chargeWatts: 25, efficiency: 0.85 },
  { id: 'ups-ecoflow-river-2', category: 'ups', brand: 'EcoFlow', model: 'RIVER 2', batteryWh: 256, chargeWatts: 150, efficiency: 0.85 },
  { id: 'ups-bluetti-eb3a', category: 'ups', brand: 'Bluetti', model: 'EB3A', batteryWh: 268, chargeWatts: 150, efficiency: 0.85 },
  { id: 'ups-sin-modelo', category: 'ups', brand: '', model: 'SAI genérico', batteryWh: 200, chargeWatts: 25, efficiency: 0.75 },

  // Routers con mini SAI de 12 V
  { id: 'router-archer-c6', category: 'router', brand: 'TP-Link', model: 'Archer C6 + SAI 12 V', batteryWh: 18, chargeWatts: 12, efficiency: 0.8, popular: true },
  { id: 'router-xiaomi-4a', category: 'router', brand: 'Xiaomi', model: 'Router 4A + SAI 12 V', batteryWh: 15, chargeWatts: 10, efficiency: 0.8 },
  { id: 'router-mikrotik-hap', category: 'router', brand: 'MikroTik', model: 'hAP ac² + SAI 12 V', batteryWh: 24, chargeWatts: 12, efficiency: 0.8 },
  { id: 'router-sin-modelo', category: 'router', brand: '', model: 'Router genérico', batteryWh: 18, chargeWatts: 10, efficiency: 0.75 },

  // Ventiladores
  { id: 'fan-xiaomi-portable', category: 'fan', brand: 'Xiaomi', model: 'Mi Portable Electric Fan', batteryWh: 18.5, chargeWatts: 10, efficiency: 0.8, popular: true },
  { id: 'fan-jisulife-fa13', category: 'fan', brand: 'Jisulife', model: 'FA13', batteryWh: 29.6, chargeWatts: 10, efficiency: 0.8 },
  { id: 'fan-camping', category: 'fan', brand: 'Genérico', model: 'Ventilador de camping', batteryWh: 15, chargeWatts: 10, efficiency: 0.8 },
  { id: 'fan-sin-modelo', category: 'fan', brand: '', model: 'Ventilador genérico', batteryWh: 15, chargeWatts: 7.5, efficiency: 0.75 },

  // Lámparas
  { id: 'lamp-hue-go', category: 'lamp', brand: 'Philips', model: 'Hue Go', batteryWh: 5.2, chargeWatts: 5, efficiency: 0.8, popular: true },
  { id: 'lamp-camping-led', category: 'lamp', brand: 'Genérico', model: 'Lámpara LED de camping', batteryWh: 10, chargeWatts: 5, efficiency: 0.8 },
  { id: 'lamp-xiaomi-portable', category: 'lamp', brand: 'Xiaomi', model: 'Mi Portable Light', batteryWh: 6, chargeWatts: 5, efficiency: 0.8 },
  { id: 'lamp-sin-modelo', category: 'lamp', brand: '', model: 'Lámpara genérica', batteryWh: 8, chargeWatts: 5, efficiency: 0.75 },

  // Otros equipos
  { id: 'other-anker-521', category: 'other', brand: 'Anker', model: '521 Power Station', batteryWh: 256, chargeWatts: 120, efficiency: 0.85, popular: true },
  { id: 'other-jackery-300', category: 'other', brand: 'Jackery', model: 'Explorer 300', batteryWh: 293, chargeWatts: 100, efficiency: 0.85 },
  { id: 'other-ecoflow-delta-2', category: 'other', brand: 'EcoFlow', model: 'DELTA 2', batteryWh: 1024, chargeWatts: 200, efficiency: 0.85 },
  { id: 'other-sin-modelo', category: 'other', brand: '', model: 'Equipo genérico', batteryWh: 50, chargeWatts: 20, efficiency: 0.75 },
];

export function isUnknownPresetId(id: string | undefined): boolean {
  return typeof id === 'string' && id.endsWith(UNKNOWN_PRESET_SUFFIX);
}

/** Nombre legible: «Apple iPhone 14» o «Teléfono genérico». */
export function presetName(preset: DevicePreset): string {
  return [preset.brand, preset.model].filter(Boolean).join(' ');
}

/** Presets reales de una categoría, con los populares primero. */
export function getPresetsByCategory(
  category: DeviceCategory,
): DevicePreset[] {
  return DEVICE_PRESETS.filter(
    (preset) =>
      preset.category === category && !isUnknownPresetId(preset.id),
  ).sort((a, b) => {
    if (Boolean(a.popular) !== Boolean(b.popular)) {
      return a.popular ? -1 : 1;
    }
    return presetName(a).localeCompare(presetName(b), 'es');
  });
}

export function getPresetById(id: string): DevicePreset | undefined {
  return DEVICE_PRESETS.find((preset) => preset.id === id);
}

export function getUnknownPreset(category: DeviceCategory): DevicePreset {
  const preset = DEVICE_PRESETS.find(
    (item) =>
      item.category === category && item.id.endsWith(UNKNOWN_PRESET_SUFFIX),
  );
  if (!preset) {
    throw new Error(`No hay preset conservador para ${category}.`);
  }
  return preset;
}

function normalizeSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function searchPresets(
  presets: DevicePreset[],
  query: string,
): DevicePreset[] {
  const needle = normalizeSearch(query);
  if (!needle) return presets;

  return presets.filter((preset) =>
    normalizeSearch(`${preset.brand} ${preset.model}`).includes(needle),
  );
}
