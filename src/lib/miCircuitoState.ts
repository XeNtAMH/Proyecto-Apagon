import type { CircuitZone } from './geo';

export type MiCircuitoTab = 'lista' | 'mapa' | 'ubicacion';

export interface MiCircuitoUiState {
  tab: MiCircuitoTab;
  provinceId: string;
  municipalityId: string;
  /** Zona candidata compartida por las tres pestañas. */
  candidate: CircuitZone | null;
}

export type MiCircuitoAction =
  | { type: 'tab'; tab: MiCircuitoTab }
  | { type: 'province'; provinceId: string }
  | { type: 'municipality'; municipalityId: string }
  | { type: 'candidate'; candidate: CircuitZone | null };

export const initialMiCircuitoUiState: MiCircuitoUiState = {
  tab: 'lista',
  provinceId: '',
  municipalityId: '',
  candidate: null,
};

/**
 * La pestaña es lo único que cambia al navegar. Provincia, municipio y zona
 * candidata se conservan para no perder la selección en curso.
 */
export function miCircuitoReducer(
  state: MiCircuitoUiState,
  action: MiCircuitoAction,
): MiCircuitoUiState {
  switch (action.type) {
    case 'tab':
      return state.tab === action.tab ? state : { ...state, tab: action.tab };
    case 'province':
      return {
        ...state,
        provinceId: action.provinceId,
        municipalityId: '',
        candidate: null,
      };
    case 'municipality':
      return {
        ...state,
        municipalityId: action.municipalityId,
        candidate: null,
      };
    case 'candidate':
      return { ...state, candidate: action.candidate };
    default:
      return state;
  }
}

/** «Usar mi ubicación» solo existe si la provincia tiene polígonos reales. */
export function visibleMiCircuitoTabs(
  hasLocationData: boolean,
): MiCircuitoTab[] {
  return hasLocationData
    ? ['lista', 'mapa', 'ubicacion']
    : ['lista', 'mapa'];
}
