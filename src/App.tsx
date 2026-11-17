import { lazy, Suspense, useEffect } from 'react';
import { BottomNav } from './components/BottomNav';
import { Icon } from './components/Icon';
import { useHashRoute } from './hooks/useHashRoute';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useOutageNotifications } from './hooks/useOutageNotifications';
import { useTheme } from './hooks/useTheme';
import { HomePage } from './pages/HomePage';
import { useAppStore } from './store/useAppStore';

// Inicio se carga al arrancar; el resto, bajo demanda para cuidar el JS inicial.
const CircuitPage = lazy(() =>
  import('./pages/CircuitPage').then((module) => ({
    default: module.CircuitPage,
  })),
);
const DevicesPage = lazy(() =>
  import('./pages/DevicesPage').then((module) => ({
    default: module.DevicesPage,
  })),
);
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((module) => ({
    default: module.SettingsPage,
  })),
);
const MiCircuitoPage = lazy(() =>
  import('./pages/MiCircuito').then((module) => ({
    default: module.MiCircuitoPage,
  })),
);

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

export default function App() {
  const hydration = useAppStore((state) => state.hydration);
  const hydrationError = useAppStore((state) => state.hydrationError);
  const hydrate = useAppStore((state) => state.hydrate);
  const circuits = useAppStore((state) => state.circuits);
  const settings = useAppStore((state) => state.settings);

  const { route, hrefFor } = useHashRoute();
  const online = useOnlineStatus();

  const selectedCircuit = circuits.find(
    (circuit) => circuit.id === settings.selectedCircuitId,
  );

  useTheme(settings.theme);
  useOutageNotifications(selectedCircuit, settings);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydration !== 'ready') return;

    const refresh = () => {
      void useAppStore.getState().refreshSchedules();
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', handleVisibility);
    const interval = window.setInterval(refresh, SIX_HOURS_MS);

    return () => {
      window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.clearInterval(interval);
    };
  }, [hydration]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [route]);

  if (hydration === 'error') {
    return (
      <main className="splash">
        <span className="splash-mark">
          <Icon name="bolt" size={34} />
        </span>
        <h1>No se pudieron abrir los datos</h1>
        <p>{hydrationError ?? 'IndexedDB no está disponible.'}</p>
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => void hydrate()}
        >
          Reintentar
        </button>
      </main>
    );
  }

  if (hydration !== 'ready') {
    return (
      <main className="splash" aria-live="polite">
        <span className="splash-mark">
          <Icon name="bolt" size={34} />
        </span>
        <h1>Rotación de Circuitos</h1>
        <p>Preparando tus horarios sin conexión…</p>
        <span className="splash-loader" aria-hidden="true" />
      </main>
    );
  }

  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('main-content')?.focus();
        }}
      >
        Saltar al contenido
      </a>

      <header className="app-header">
        <div className="app-header-inner">
          <a className="brand" href="#/" aria-label="Rotación de Circuitos, inicio">
            <span className="brand-mark">
              <Icon name="bolt" size={20} />
            </span>
            <span className="brand-name">Rotación de Circuitos</span>
          </a>

          <span
            className={`network-status ${online ? 'is-online' : 'is-offline'}`}
            title={online ? 'Conectado a internet' : 'Usando datos guardados'}
          >
            <span className="network-dot" aria-hidden="true" />
            <span className="network-label">
              {online ? 'En línea' : 'Sin conexión'}
            </span>
          </span>
        </div>
      </header>

      {!online && (
        <div className="offline-banner" role="status">
          <Icon name="wifi-off" size={18} />
          <span>Sin conexión · mostrando datos guardados</span>
        </div>
      )}

      <main className="main-content" id="main-content" tabIndex={-1}>
        <Suspense
          fallback={
            <p className="route-loading" role="status">
              Cargando…
            </p>
          }
        >
          {route === 'home' && <HomePage />}
          {route === 'circuit' && <CircuitPage />}
          {route === 'devices' && <DevicesPage />}
          {route === 'settings' && <SettingsPage />}
          {route === 'mi-circuito' && <MiCircuitoPage />}
        </Suspense>
      </main>

      <BottomNav route={route} hrefFor={hrefFor} />
    </div>
  );
}
