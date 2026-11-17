import { describe, expect, it } from 'vitest';
import type { CircuitZone } from './geo';
import {
  initialMiCircuitoUiState,
  miCircuitoReducer,
  visibleMiCircuitoTabs,
  type MiCircuitoUiState,
} from './miCircuitoState';

const ZONE: CircuitZone = {
  id: 'c-centro-01',
  name: 'Centro · C-01',
  circuitId: 'c-centro-01',
};

const selectedState: MiCircuitoUiState = {
  tab: 'lista',
  provinceId: 'la-habana',
  municipalityId: 'la-habana',
  candidate: ZONE,
};

describe('miCircuitoReducer', () => {
  it('cambiar de pestaña conserva provincia, municipio y circuito seleccionado', () => {
    const onMap = miCircuitoReducer(selectedState, {
      type: 'tab',
      tab: 'mapa',
    });
    expect(onMap.tab).toBe('mapa');
    expect(onMap.provinceId).toBe('la-habana');
    expect(onMap.municipalityId).toBe('la-habana');
    expect(onMap.candidate).toBe(ZONE);

    const onLocation = miCircuitoReducer(onMap, {
      type: 'tab',
      tab: 'ubicacion',
    });
    expect(onLocation.tab).toBe('ubicacion');
    expect(onLocation.candidate).toBe(ZONE);
  });

  it('cambiar de provincia sí reinicia municipio y candidato', () => {
    const next = miCircuitoReducer(selectedState, {
      type: 'province',
      provinceId: 'matanzas',
    });
    expect(next.provinceId).toBe('matanzas');
    expect(next.municipalityId).toBe('');
    expect(next.candidate).toBeNull();
  });

  it('cancelar la búsqueda limpia el candidato sin tocar la pestaña', () => {
    const next = miCircuitoReducer(selectedState, {
      type: 'candidate',
      candidate: null,
    });
    expect(next.candidate).toBeNull();
    expect(next.tab).toBe('lista');
    expect(next.provinceId).toBe('la-habana');
  });

  it('el estado inicial no tiene selección', () => {
    expect(initialMiCircuitoUiState.candidate).toBeNull();
  });
});

describe('visibleMiCircuitoTabs', () => {
  it('oculta «Usar mi ubicación» si la provincia no tiene GeoJSON', () => {
    expect(visibleMiCircuitoTabs(false)).toEqual(['lista', 'mapa']);
  });

  it('muestra las tres pestañas cuando hay polígonos', () => {
    expect(visibleMiCircuitoTabs(true)).toEqual([
      'lista',
      'mapa',
      'ubicacion',
    ]);
  });
});
