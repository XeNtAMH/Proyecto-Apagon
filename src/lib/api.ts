import {
  parseOfficialSchedules,
  type OfficialSchedulesFile,
} from './validation';

const DEFAULT_TIMEOUT_MS = 7_000;

/**
 * La respuesta puede venir de la caché Stale-While-Revalidate del Service
 * Worker. La app nunca espera esta llamada para pintar datos ya guardados.
 */
export async function fetchOfficialSchedules(
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<OfficialSchedulesFile> {
  if (!navigator.onLine) {
    throw new Error('Sin conexión a internet.');
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = new URL(
      'schedules.json',
      new URL(import.meta.env.BASE_URL, window.location.origin),
    );
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`No se pudieron descargar los horarios (${response.status}).`);
    }

    return parseOfficialSchedules(await response.json());
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('La descarga de horarios tardó demasiado.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
