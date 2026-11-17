import { describe, expect, it } from 'vitest';
import {
  DEVICE_CATEGORIES,
  DEVICE_PRESETS,
  getPresetById,
  getPresetsByCategory,
  getUnknownPreset,
  isUnknownPresetId,
  presetName,
  searchPresets,
} from './devicePresets';

describe('catálogo de dispositivos', () => {
  it('ofrece al menos tres modelos reales por categoría', () => {
    for (const category of DEVICE_CATEGORIES) {
      const presets = getPresetsByCategory(category.id);
      expect(presets.length, category.id).toBeGreaterThanOrEqual(3);
      expect(
        presets.some((preset) => isUnknownPresetId(preset.id)),
        category.id,
      ).toBe(false);
    }
  });

  it('tiene un preset «No sé» conservador por categoría', () => {
    for (const category of DEVICE_CATEGORIES) {
      const preset = getUnknownPreset(category.id);
      expect(preset.category).toBe(category.id);
      expect(isUnknownPresetId(preset.id)).toBe(true);
      expect(preset.efficiency ?? 0.85).toBeLessThanOrEqual(0.8);
    }
  });

  it('usa IDs únicos y valores plausibles', () => {
    const ids = new Set(DEVICE_PRESETS.map((preset) => preset.id));
    expect(ids.size).toBe(DEVICE_PRESETS.length);

    for (const preset of DEVICE_PRESETS) {
      expect(preset.batteryWh, preset.id).toBeGreaterThan(0);
      expect(preset.chargeWatts, preset.id).toBeGreaterThan(0);
      const efficiency = preset.efficiency ?? 0.85;
      expect(efficiency, preset.id).toBeGreaterThan(0);
      expect(efficiency, preset.id).toBeLessThanOrEqual(1);
      expect(presetName(preset).length, preset.id).toBeGreaterThan(0);
    }
  });

  it('encuentra un preset por ID', () => {
    expect(getPresetById('phone-iphone-14')?.model).toBe('iPhone 14');
    expect(getPresetById('no-existe')).toBeUndefined();
  });

  it('deja iPhone 14 como primera opción de teléfono', () => {
    const phones = getPresetsByCategory('phone');
    expect(phones[0]?.id).toBe('phone-iphone-14');
    expect(phones[0]?.popular).toBe(true);
  });

  it('busca sin distinguir mayúsculas ni tildes', () => {
    const lamps = getPresetsByCategory('lamp');
    const results = searchPresets(lamps, 'LAMPARA');
    expect(results.map(presetName)).toContain('Genérico Lámpara LED de camping');
  });

  it('devuelve toda la lista si la búsqueda está vacía', () => {
    const tablets = getPresetsByCategory('tablet');
    expect(searchPresets(tablets, '   ')).toHaveLength(tablets.length);
  });
});
