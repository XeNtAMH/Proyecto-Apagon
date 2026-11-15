import { Icon } from '../components/Icon';
import { useNow } from '../hooks/useNow';
import {
  formatDateTime,
  formatDayLabel,
  formatDuration,
  formatTime,
  toDateKey,
} from '../lib/dates';
import { notificationsSupported } from '../lib/notifications';
import {
  estimateChargePercent,
  formatCountdown,
  getCurrentStatus,
  getNextChargeWindows,
  getNextOutage,
} from '../lib/schedule';
import { useAppStore } from '../store/useAppStore';
import type { Device } from '../types';

function formatWindowRange(
  start: Date,
  end: Date,
  now: Date,
): string {
  const sameDay = toDateKey(start) === toDateKey(end);
  if (sameDay) return `${formatTime(start)} — ${formatTime(end)}`;
  return `${formatTime(start)} — ${formatDayLabel(end, now)} ${formatTime(end)}`;
}

function estimateForWindow(
  device: Device | undefined,
  durationMin: number,
): number | null {
  if (!device) return null;
  return estimateChargePercent(device, durationMin);
}

export function HomePage() {
  const circuits = useAppStore((state) => state.circuits);
  const devices = useAppStore((state) => state.devices);
  const settings = useAppStore((state) => state.settings);
  const lastScheduleUpdate = useAppStore(
    (state) => state.lastScheduleUpdate,
  );
  const now = useNow(1000);

  const selectedCircuit = circuits.find(
    (circuit) => circuit.id === settings.selectedCircuitId,
  );
  const activeDevice = devices.find(
    (device) => device.id === settings.activeDeviceId,
  );

  if (!selectedCircuit) {
    return (
      <section className="page">
        <div className="empty-state">
          <span className="empty-icon">
            <Icon name="calendar" size={32} />
          </span>
          <h1>Sin circuito activo</h1>
          <p>Crea tu primer circuito y registra las horas con luz.</p>
          <a className="btn btn-primary" href="#/circuito">
            <Icon name="plus" size={20} />
            Crear circuito
          </a>
        </div>
      </section>
    );
  }

  const status = getCurrentStatus(selectedCircuit.schedule, now);
  const windows = getNextChargeWindows(selectedCircuit.schedule, now, 4);
  const primaryWindow = windows[0];
  const isActive =
    primaryWindow !== undefined &&
    primaryWindow.start.getTime() <= now.getTime() &&
    now.getTime() < primaryWindow.end.getTime();
  const upcomingWindows = windows.slice(1, 4);
  const nextOutage = getNextOutage(selectedCircuit.schedule, now);

  const countdownTarget = primaryWindow
    ? isActive
      ? primaryWindow.end
      : primaryWindow.start
    : null;
  const countdown = countdownTarget
    ? formatCountdown(countdownTarget.getTime() - now.getTime())
    : '--';

  const activeEstimate =
    primaryWindow && activeDevice
      ? estimateForWindow(
          activeDevice,
          isActive
            ? Math.max(
                1,
                Math.ceil(
                  (primaryWindow.end.getTime() - now.getTime()) / 60_000,
                ),
              )
            : primaryWindow.durationMin,
        )
      : null;

  let statusContext = 'No hay ventanas de carga registradas en el horizonte.';
  if (primaryWindow && status === 'outage') {
    statusContext = `La energía está prevista para las ${formatTime(
      primaryWindow.start,
    )}.`;
  } else if (primaryWindow && status === 'power') {
    statusContext = nextOutage
      ? `El próximo apagón está previsto para las ${formatTime(
          nextOutage.start,
        )}.`
      : 'No hay otro apagón registrado en el horizonte.';
  }

  return (
    <div className="page home-page">
      <header className="home-header">
        <div className="home-title-block">
          <p className="eyebrow">Circuito activo</p>
          <h1>{selectedCircuit.name}</h1>
        </div>
        <a
          className="btn btn-quiet btn-compact"
          href="#/circuito"
          aria-label="Cambiar o editar circuito"
        >
          <Icon name="calendar" size={19} />
          Cambiar
        </a>
      </header>

      <section
        className={`status-card status-${status}`}
        role="status"
        aria-live="polite"
      >
        <span className="status-icon">
          <Icon name={status === 'power' ? 'bolt' : 'plug'} size={31} />
        </span>
        <div className="status-copy">
          <p className="status-label">
            {status === 'power' ? 'CON LUZ' : 'APAGÓN'}
          </p>
          <p className="status-description">
            {status === 'power'
              ? 'Hay energía en este momento.'
              : 'Sin energía según el horario registrado.'}
          </p>
          <p className="status-context">{statusContext}</p>
        </div>
      </section>

      {primaryWindow ? (
        <section
          className={`hero-card ${isActive ? 'hero-power' : 'hero-outage'}`}
          aria-labelledby="charge-window-title"
        >
          <div className="hero-head">
            <p className="eyebrow">
              {isActive ? 'Ventana de carga en curso' : 'Próxima ventana de carga'}
            </p>
            <span className="live-dot" aria-hidden="true" />
          </div>

          <h2 id="charge-window-title" className="hero-window">
            {formatDayLabel(primaryWindow.start, now)}
            <span className="hero-window-separator"> · </span>
            {formatWindowRange(primaryWindow.start, primaryWindow.end, now)}
          </h2>

          <div className="hero-countdown-block">
            <p className="countdown-label">
              {isActive
                ? 'La luz termina en'
                : 'La próxima ventana comienza en'}
            </p>
            <p className="hero-countdown">{countdown}</p>
          </div>

          <div className="hero-meta">
            <span className="chip">
              <Icon name="clock" size={17} />
              {formatDuration(primaryWindow.durationMin)}
              {isActive ? ' en total' : ' de carga'}
            </span>
            {activeDevice && activeEstimate !== null && (
              <span className="chip chip-estimate">
                <Icon name="battery" size={17} />≈ {activeEstimate}% · {activeDevice.name}
              </span>
            )}
          </div>

          {activeDevice && activeEstimate !== null && (
            <p className="estimate-note">
              Estimación desde 0% con {activeDevice.name}
              {isActive ? ' en el tiempo restante' : ' durante esta ventana'}.
            </p>
          )}

          {!activeDevice && (
            <a className="inline-link" href="#/dispositivos">
              Añade un dispositivo para estimar la carga
              <Icon name="arrow-right" size={17} />
            </a>
          )}
        </section>
      ) : (
        <section className="empty-card" aria-label="Ventanas de carga">
          <span className="empty-icon">
            <Icon name="plug" size={30} />
          </span>
          <h2>Sin ventanas de carga</h2>
          <p>
            No hay horas con luz registradas para los próximos 31 días. Revisa
            el horario de tu circuito.
          </p>
          <a className="btn btn-primary" href="#/circuito">
            Editar horario
          </a>
        </section>
      )}

      <section className="section-block" aria-labelledby="upcoming-title">
        <div className="section-heading">
          <h2 id="upcoming-title">Siguientes ventanas</h2>
          <span className="section-count">{upcomingWindows.length}</span>
        </div>

        {upcomingWindows.length > 0 ? (
          <ul className="window-list">
            {upcomingWindows.map((window) => {
              const estimate = estimateForWindow(
                activeDevice,
                window.durationMin,
              );
              return (
                <li
                  className="window-item"
                  key={`${window.start.getTime()}-${window.end.getTime()}`}
                >
                  <span className="window-icon" aria-hidden="true">
                    <Icon name="bolt" size={21} />
                  </span>
                  <div className="window-info">
                    <p className="window-day">
                      {formatDayLabel(window.start, now)}
                    </p>
                    <p className="window-time">
                      {formatWindowRange(window.start, window.end, now)}
                    </p>
                    {activeDevice && estimate !== null && (
                      <p className="window-estimate">
                        ≈ {estimate}% con {activeDevice.name}
                      </p>
                    )}
                  </div>
                  <span className="window-duration">
                    {formatDuration(window.durationMin)}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="empty-list-copy">
            No hay más ventanas registradas en los próximos 31 días.
          </p>
        )}
      </section>

      {notificationsSupported() && !settings.notificationsEnabled && (
        <a className="notice-card" href="#/ajustes">
          <span className="notice-icon">
            <Icon name="bell" size={22} />
          </span>
          <span className="notice-copy">
            <strong>Aviso antes del apagón</strong>
            <span>Programa un recordatorio local en tu teléfono.</span>
          </span>
          <Icon name="arrow-right" size={20} />
        </a>
      )}

      <footer className="last-update">
        <Icon name="clock" size={15} />
        <span>
          Última actualización de horarios:{' '}
          {formatDateTime(lastScheduleUpdate)}
        </span>
      </footer>
    </div>
  );
}
