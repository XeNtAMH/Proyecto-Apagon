import { useEffect, useMemo, useRef, useState } from 'react';
import type { Map as LeafletMap, Marker } from 'leaflet';
import {
  findClosestCircuit,
  prefetchCircuitPoints,
} from '../lib/circuitLookup';
import {
  fetchCircuitsIndex,
  type CircuitProvince,
  type CircuitsIndex,
} from '../lib/geo';
import { useAppStore } from '../store/useAppStore';

type Flow = 'elegir' | 'mapa' | 'lista';
type Feedback = { type: 'success' | 'error'; message: string };
type MapPhase = 'loading' | 'ready' | 'error';
type LookupPhase = 'idle' | 'searching' | 'found' | 'error';

interface Candidate {
  circuitId: string;
  name: string;
  municipality: string | null;
  distanceMeters: number | null;
}

const TOO_FAR_MESSAGE =
  'No pudimos encontrar un circuito cerca. Usa la lista manual.';
const LOOKUP_ERROR_MESSAGE =
  'No pudimos cargar los circuitos cercanos. Usa la lista manual.';
const GEOLOCATION_ERROR_MESSAGE =
  'No pudimos obtener tu ubicación. Usa la lista manual.';

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'No se pudieron cargar los datos de zonas.';
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10_000,
      maximumAge: 60_000,
    });
  });
}

export function MiCircuitoPage() {
  const selectLocatedCircuit = useAppStore(
    (state) => state.selectLocatedCircuit,
  );

  const [flow, setFlow] = useState<Flow>('elegir');

  const [index, setIndex] = useState<CircuitsIndex | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const [provinceId, setProvinceId] = useState('');
  const [municipalityId, setMunicipalityId] = useState('');
  const [candidate, setCandidate] = useState<Candidate | null>(null);

  const [mapPhase, setMapPhase] = useState<MapPhase>('loading');
  const [lookupPhase, setLookupPhase] = useState<LookupPhase>('idle');
  const [mapNotice, setMapNotice] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const gpsRef = useRef<(() => void) | null>(null);
  const lookupToken = useRef(0);
  const redirectTimer = useRef<number | null>(null);
  const resultRef = useRef<HTMLElement | null>(null);

  useEffect(
    () => () => {
      if (redirectTimer.current !== null) {
        window.clearTimeout(redirectTimer.current);
      }
    },
    [],
  );

  // El índice de la lista manual solo se descarga al abrir esa opción.
  useEffect(() => {
    if (flow !== 'lista') return;

    let cancelled = false;
    setLoadingList(true);
    setListError(null);

    fetchCircuitsIndex()
      .then((nextIndex) => {
        if (!cancelled) setIndex(nextIndex);
      })
      .catch((error: unknown) => {
        if (!cancelled) setListError(getErrorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false);
      });

    return () => {
      cancelled = true;
    };
  }, [flow, attempt]);

  const provinces = useMemo<CircuitProvince[]>(() => {
    if (!index) return [];
    return index.provinces.filter((province) =>
      province.municipalities.some((municipality) => municipality.zones.length > 0),
    );
  }, [index]);

  const province = provinces.find((item) => item.id === provinceId);

  const municipalities = useMemo(
    () =>
      (province?.municipalities ?? []).filter(
        (municipality) => municipality.zones.length > 0,
      ),
    [province],
  );

  const municipality = municipalities.find((item) => item.id === municipalityId);
  const zones = municipality?.zones ?? [];

  // Si solo hay una opción real, se elige sola para ahorrar pasos.
  useEffect(() => {
    if (flow !== 'lista' || !index || provinceId) return;
    if (provinces.length === 1) setProvinceId(provinces[0].id);
  }, [flow, index, provinceId, provinces]);

  useEffect(() => {
    if (flow !== 'lista' || !provinceId || municipalityId) return;
    if (municipalities.length === 1) setMunicipalityId(municipalities[0].id);
  }, [flow, provinceId, municipalityId, municipalities]);

  const resetSelection = () => {
    setCandidate(null);
    setMapNotice(null);
    setFeedback(null);
    setLookupPhase('idle');
  };

  const chooseFlow = (nextFlow: Flow) => {
    setFlow(nextFlow);
    resetSelection();
  };

  const handleProvinceChange = (id: string) => {
    setProvinceId(id);
    setMunicipalityId('');
    resetSelection();
  };

  const handleMunicipalityChange = (id: string) => {
    setMunicipalityId(id);
    resetSelection();
  };

  const handleZoneChange = (id: string) => {
    const zone = zones.find((item) => item.id === id) ?? null;
    setCandidate(
      zone
        ? {
            circuitId: zone.circuitId,
            name: zone.name,
            municipality: municipality?.name ?? null,
            distanceMeters: null,
          }
        : null,
    );
    setFeedback(null);
  };

  const handleSave = async () => {
    if (!candidate || saving) return;

    setSaving(true);
    setFeedback(null);

    try {
      await selectLocatedCircuit({
        circuitId: candidate.circuitId,
        circuitName: candidate.name,
        municipality: candidate.municipality ?? '',
      });
      setSaving(false);
      setFeedback({ type: 'success', message: '¡Circuito guardado!' });
      redirectTimer.current = window.setTimeout(() => {
        window.location.hash = '#/';
      }, 900);
    } catch (error) {
      setSaving(false);
      setFeedback({ type: 'error', message: getErrorMessage(error) });
    }
  };

  useEffect(() => {
    if (flow !== 'mapa') return;
    const container = mapContainerRef.current;
    if (!container) return;

    // Descarga perezosa: solo al entrar en el mapa, nunca en el arranque.
    void prefetchCircuitPoints().catch(() => {
      // El error se muestra cuando el usuario toca el mapa o pulsa GPS.
    });

    let cancelled = false;
    let map: LeafletMap | null = null;
    let marker: Marker | null = null;

    setMapPhase('loading');
    setMapNotice(null);
    setLookupPhase('idle');
    setCandidate(null);

    const lookup = async (lat: number, lng: number) => {
      const token = ++lookupToken.current;
      setLookupPhase('searching');
      setMapNotice(null);
      setCandidate(null);
      setFeedback(null);

      // Depuración del cálculo de distancia: coordenadas tal como las entrega
      // el mapa/geolocalización, siempre en orden (lat, lng).
      console.log('[mapa] Ubicación del usuario:', { lat, lng });

      try {
        const result = await findClosestCircuit(lat, lng);
        if (cancelled || token !== lookupToken.current) return;

        if ('error' in result) {
          console.log(
            '[mapa] Ningún circuito a menos de 15 km de',
            { lat, lng },
          );
          setLookupPhase('error');
          setMapNotice(TOO_FAR_MESSAGE);
          return;
        }

        console.log('[mapa] Circuito encontrado:', {
          id: result.circuitId,
          nombre: result.circuitName,
          municipio: result.municipality,
          distanciaMetros: Math.round(result.distanceMeters),
          distanciaKm: Number((result.distanceMeters / 1000).toFixed(2)),
          punto: { lat, lng },
        });

        setCandidate({
          circuitId: result.circuitId,
          name: result.circuitName,
          municipality: result.municipality || null,
          distanceMeters: result.distanceMeters,
        });
        setLookupPhase('found');
      } catch {
        if (cancelled || token !== lookupToken.current) return;
        setLookupPhase('error');
        setMapNotice(LOOKUP_ERROR_MESSAGE);
      }
    };

    void (async () => {
      try {
        const L = await import('leaflet');
        await import('leaflet/dist/leaflet.css');
        if (cancelled || !mapContainerRef.current) return;

        map = L.map(mapContainerRef.current, {
          center: [22.4, -79.5],
          zoom: 7,
          zoomControl: true,
        });

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);

        window.requestAnimationFrame(() => map?.invalidateSize());

        // Icono propio: evita depender de las imágenes del marcador por defecto
        // de Leaflet, que pueden perderse al empaquetar la app.
        const pinIcon = L.divIcon({
          className: 'mi-pin',
          html: '<span></span>',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const placeMarker = (lat: number, lng: number) => {
          if (!map) return;
          if (marker) {
            marker.setLatLng([lat, lng]);
            return;
          }
          marker = L.marker([lat, lng], {
            draggable: true,
            icon: pinIcon,
          }).addTo(map);
          marker.on('dragend', () => {
            const position = marker?.getLatLng();
            if (!position) return;
            void lookup(position.lat, position.lng);
          });
        };

        map.on('click', (event) => {
          const { lat, lng } = event.latlng;
          placeMarker(lat, lng);
          void lookup(lat, lng);
        });

        gpsRef.current = () => {
          if (!map) return;
          if (!navigator.geolocation) {
            setMapNotice(GEOLOCATION_ERROR_MESSAGE);
            return;
          }

          setLocating(true);
          setMapNotice(null);

          getCurrentPosition()
            .then((position) => {
              if (cancelled || !map) return;
              const { latitude, longitude } = position.coords;
              map.setView([latitude, longitude], 15);
              placeMarker(latitude, longitude);
              void lookup(latitude, longitude);
            })
            .catch(() => {
              if (!cancelled) setMapNotice(GEOLOCATION_ERROR_MESSAGE);
            })
            .finally(() => {
              if (!cancelled) setLocating(false);
            });
        };

        setMapPhase('ready');
        window.requestAnimationFrame(() => map?.invalidateSize());
      } catch {
        if (!cancelled) setMapPhase('error');
      }
    })();

    return () => {
      cancelled = true;
      lookupToken.current += 1;
      gpsRef.current = null;
      setLocating(false);
      if (map) {
        map.remove();
        map = null;
      }
    };
  }, [flow]);

  const saveDisabled = saving || feedback?.type === 'success';

  // Al aparecer el resultado, lo acercamos a la vista: en móvil el mapa ocupa
  // 400 px y la tarjeta quedaría por debajo del pliegue.
  useEffect(() => {
    if (!candidate) return;
    resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [candidate]);

  return (
    <div className="page mi-circuito-page">
      <header className="mi-header">
        <h1>Mi circuito</h1>
        <p>¿Dónde vives?</p>
      </header>

      {flow === 'elegir' ? (
        <div className="mi-choice">
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => chooseFlow('mapa')}
          >
            Buscar en el mapa
          </button>
          <button
            className="btn btn-quiet"
            type="button"
            onClick={() => chooseFlow('lista')}
          >
            Elegir por lista
          </button>
        </div>
      ) : (
        <button
          className="mi-back"
          type="button"
          onClick={() => chooseFlow('elegir')}
        >
          ← Cambiar forma de elegir
        </button>
      )}

      {flow === 'mapa' && (
        <section className="mi-flow" aria-label="Elegir el circuito en el mapa">
          <div className="mi-map-wrap">
            <div
              ref={mapContainerRef}
              className="mi-map"
              role="application"
              aria-label="Mapa: toca el punto donde vives"
            />
            <button
              className="mi-gps"
              type="button"
              onClick={() => gpsRef.current?.()}
              disabled={locating || mapPhase !== 'ready'}
            >
              {locating ? 'Buscando tu ubicación…' : 'Usar mi ubicación actual'}
            </button>
          </div>

          {mapPhase === 'loading' && (
            <p className="mi-status" role="status">
              Cargando el mapa…
            </p>
          )}

          {mapPhase === 'error' && (
            <p className="mi-banner" role="alert">
              El mapa no se pudo cargar. Intenta con la lista.
            </p>
          )}

          {lookupPhase === 'searching' && (
            <p className="mi-status" role="status">
              Buscando tu circuito…
            </p>
          )}

          {mapNotice && (
            <p className="mi-banner" role="alert">
              {mapNotice}
            </p>
          )}
        </section>
      )}

      {flow === 'lista' && (
        <section className="mi-flow" aria-label="Elegir el circuito por lista">
          {listError && (
            <div className="inline-message error" role="alert">
              <p>{listError}</p>
              <button
                className="btn btn-quiet btn-small"
                type="button"
                onClick={() => setAttempt((value) => value + 1)}
              >
                Reintentar
              </button>
            </div>
          )}

          {loadingList ? (
            <p className="mi-status" role="status">
              Cargando provincias y zonas…
            </p>
          ) : index ? (
            <>
              <label className="field mi-field">
                <span>Provincia</span>
                <select
                  value={provinceId}
                  onChange={(event) =>
                    handleProvinceChange(event.target.value)
                  }
                  disabled={provinces.length === 0}
                >
                  <option value="">Elige tu provincia</option>
                  {provinces.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field mi-field">
                <span>Municipio</span>
                <select
                  value={municipalityId}
                  onChange={(event) =>
                    handleMunicipalityChange(event.target.value)
                  }
                  disabled={!provinceId}
                >
                  <option value="">Elige tu municipio</option>
                  {municipalities.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field mi-field">
                <span>Zona (Circuito)</span>
                <select
                  value={candidate?.circuitId ?? ''}
                  onChange={(event) => handleZoneChange(event.target.value)}
                  disabled={!municipalityId}
                >
                  <option value="">Elige tu zona</option>
                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name}
                    </option>
                  ))}
                </select>
              </label>

              {provinces.length === 0 && (
                <p className="mi-banner">
                  Todavía no hay circuitos publicados.
                </p>
              )}
            </>
          ) : null}
        </section>
      )}

      {flow !== 'elegir' && candidate && (
        <section className="mi-result" aria-live="polite" ref={resultRef}>
          <p className="eyebrow">Resultado de la búsqueda</p>
          <h2 className="mi-result-title">{candidate.name}</h2>
          <p className="mi-result-meta">
            {candidate.municipality
              ? `${candidate.municipality}`
              : 'Circuito seleccionado'}
            {candidate.distanceMeters !== null
              ? ` · a ${formatDistance(candidate.distanceMeters)} de tu ubicación`
              : ''}
          </p>

          {feedback && (
            <p
              className={`inline-message ${feedback.type}`}
              role={feedback.type === 'error' ? 'alert' : 'status'}
            >
              {feedback.message}
            </p>
          )}

          <button
            className="btn btn-accent mi-save"
            type="button"
            onClick={() => void handleSave()}
            disabled={saveDisabled}
          >
            {saving ? 'Guardando…' : 'Guardar circuito'}
          </button>
        </section>
      )}

      {flow !== 'elegir' && !candidate && feedback && (
        <p
          className={`inline-message ${feedback.type}`}
          role={feedback.type === 'error' ? 'alert' : 'status'}
        >
          {feedback.message}
        </p>
      )}
    </div>
  );
}
