import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { Icon, type IconName } from '../components/Icon';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { saveBackupFile } from '../lib/backupFile';
import { formatDateTime, toDateKey } from '../lib/dates';
import { isNativeApp } from '../lib/native';
import {
  checkNotificationPermission,
  notificationsSupported,
  requestNotificationPermission,
} from '../lib/notifications';
import { parseBackupBundle } from '../lib/validation';
import { useAppStore } from '../store/useAppStore';
import type { Theme } from '../types';

type Feedback = { type: 'error' | 'success'; message: string };

const THEME_OPTIONS: Array<{
  value: Theme;
  label: string;
  icon: IconName;
}> = [
  { value: 'light', label: 'Claro', icon: 'sun' },
  { value: 'dark', label: 'Oscuro', icon: 'moon' },
  { value: 'system', label: 'Sistema', icon: 'monitor' },
];

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'No se pudo completar la operación.';
}

function parseLeadMinutes(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const rounded = Math.round(parsed);
  if (rounded < 0 || rounded > 120) return null;
  return rounded;
}

export function SettingsPage() {
  const settings = useAppStore((state) => state.settings);
  const lastScheduleUpdate = useAppStore(
    (state) => state.lastScheduleUpdate,
  );
  const updateSettings = useAppStore((state) => state.updateSettings);
  const createBackup = useAppStore((state) => state.createBackup);
  const importBackup = useAppStore((state) => state.importBackup);
  const { canInstall, install } = useInstallPrompt();

  const [leadMinutes, setLeadMinutes] = useState(
    String(settings.notificationLeadMinutes),
  );
  const [permission, setPermission] = useState<NotificationPermission | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const native = isNativeApp();

  useEffect(() => {
    setLeadMinutes(String(settings.notificationLeadMinutes));
  }, [settings.notificationLeadMinutes]);

  useEffect(() => {
    let active = true;
    const refreshPermission = () => {
      void checkNotificationPermission().then((value) => {
        if (active) setPermission(value);
      });
    };

    refreshPermission();
    window.addEventListener('focus', refreshPermission);
    return () => {
      active = false;
      window.removeEventListener('focus', refreshPermission);
    };
  }, []);

  const support = notificationsSupported();

  const handleNotificationToggle = async () => {
    if (busy) return;
    setFeedback(null);

    if (settings.notificationsEnabled) {
      setBusy(true);
      try {
        await updateSettings({ notificationsEnabled: false });
        setFeedback({
          type: 'success',
          message: 'Recordatorios de apagón desactivados.',
        });
      } catch (error) {
        setFeedback({ type: 'error', message: getErrorMessage(error) });
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!support) {
      setFeedback({
        type: 'error',
        message: 'Este navegador no soporta notificaciones locales.',
      });
      return;
    }

    let currentPermission = await checkNotificationPermission();
    if (currentPermission === 'default') {
      try {
        currentPermission = await requestNotificationPermission();
      } catch (error) {
        setFeedback({ type: 'error', message: getErrorMessage(error) });
        return;
      }
    }

    setPermission(currentPermission);
    if (currentPermission !== 'granted') {
      setFeedback({
        type: 'error',
        message: native
          ? 'Permiso denegado. Actívalo desde los ajustes de Android para esta aplicación.'
          : 'Permiso denegado. Actívalo desde los ajustes del navegador para este sitio.',
      });
      return;
    }

    const parsedLead = parseLeadMinutes(leadMinutes);
    setBusy(true);
    try {
      await updateSettings({
        notificationsEnabled: true,
        notificationLeadMinutes: parsedLead ?? settings.notificationLeadMinutes,
      });
      setFeedback({
        type: 'success',
        message: 'Aviso local programado antes del próximo apagón.',
      });
    } catch (error) {
      setFeedback({ type: 'error', message: getErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  const handleSaveLead = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = parseLeadMinutes(leadMinutes);
    if (parsed === null) {
      setFeedback({
        type: 'error',
        message: 'Usa un número de minutos entre 0 y 120.',
      });
      return;
    }

    setBusy(true);
    setFeedback(null);
    try {
      await updateSettings({ notificationLeadMinutes: parsed });
      setFeedback({
        type: 'success',
        message: 'Tiempo de anticipación guardado.',
      });
    } catch (error) {
      setFeedback({ type: 'error', message: getErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  const handleThemeChange = async (theme: Theme) => {
    if (theme === settings.theme) return;
    setFeedback(null);
    try {
      await updateSettings({ theme });
    } catch (error) {
      setFeedback({ type: 'error', message: getErrorMessage(error) });
    }
  };

  const handleExport = async () => {
    try {
      const bundle = createBackup();
      await saveBackupFile(
        `rotacion-circuitos-${toDateKey(new Date())}.json`,
        JSON.stringify(bundle, null, 2),
      );
      setFeedback({
        type: 'success',
        message: native
          ? 'Respaldo JSON listo para guardar o compartir.'
          : 'Respaldo JSON descargado.',
      });
    } catch (error) {
      setFeedback({ type: 'error', message: getErrorMessage(error) });
    }
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setFeedback(null);
    if (file.size > 2 * 1024 * 1024) {
      setFeedback({
        type: 'error',
        message: 'El archivo es demasiado grande (máximo 2 MB).',
      });
      return;
    }

    try {
      const raw: unknown = JSON.parse(await file.text());
      const bundle = parseBackupBundle(raw);
      const confirmed = window.confirm(
        'Importar este respaldo reemplazará todos los circuitos y dispositivos guardados. ¿Continuar?',
      );
      if (!confirmed) return;

      setBusy(true);
      await importBackup(bundle);
      setPermission(await checkNotificationPermission());
      setFeedback({
        type: 'success',
        message: 'Respaldo importado correctamente.',
      });
    } catch (error) {
      setFeedback({ type: 'error', message: getErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  const handleInstall = async () => {
    try {
      const accepted = await install();
      if (accepted) {
        setFeedback({
          type: 'success',
          message: 'Aplicación instalada.',
        });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: getErrorMessage(error) });
    }
  };

  const permissionLabel = !support
    ? 'No disponible en este navegador'
    : permission === 'granted'
      ? 'Permitido'
      : permission === 'denied'
        ? native
          ? 'Bloqueado por el sistema'
          : 'Bloqueado por el navegador'
        : 'Pendiente de autorización';

  const notificationActive =
    settings.notificationsEnabled && permission === 'granted';

  return (
    <div className="page">
      <header className="page-header">
        <p className="eyebrow">Preferencias</p>
        <h1>Ajustes</h1>
        <p>
          Controla los avisos, el tema visual y tus copias de seguridad. No hay
          cuentas ni servidores: tus datos viven en este dispositivo.
        </p>
      </header>

      {feedback && (
        <p className={`inline-message ${feedback.type}`} role="status">
          {feedback.message}
        </p>
      )}

      <section className="settings-card" aria-labelledby="theme-title">
        <div className="settings-heading">
          <h2 id="theme-title">Tema visual</h2>
          <p>Elige el contraste que mejor se lea en tu entorno.</p>
        </div>

        <div className="theme-options" role="group" aria-label="Tema visual">
          {THEME_OPTIONS.map((option) => (
            <button
              key={option.value}
              className={`theme-option${
                settings.theme === option.value ? ' is-selected' : ''
              }`}
              type="button"
              aria-pressed={settings.theme === option.value}
              onClick={() => handleThemeChange(option.value)}
            >
              <Icon name={option.icon} size={23} />
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="settings-card" aria-labelledby="notifications-title">
        <div className="settings-heading">
          <h2 id="notifications-title">Avisos de apagón</h2>
          <p>
            Recibe un recordatorio local antes de que comience el próximo
            apagón.
          </p>
        </div>

        <div className="switch-row">
          <div className="switch-copy">
            <strong>Activar recordatorio</strong>
            <span>
              {notificationActive
                ? `Activo: ${settings.notificationLeadMinutes} min antes.`
                : 'Desactivado.'}
            </span>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={settings.notificationsEnabled}
              onChange={handleNotificationToggle}
              disabled={busy || !support}
              aria-label="Activar recordatorio antes del apagón"
            />
            <span className="switch-track" aria-hidden="true" />
          </label>
        </div>

        <p className="permission-line">
          Permiso de notificaciones: <strong>{permissionLabel}</strong>
        </p>

        <form className="lead-form" onSubmit={handleSaveLead}>
          <label className="field">
            <span>Minutos de anticipación</span>
            <input
              type="number"
              min="0"
              max="120"
              step="1"
              inputMode="numeric"
              value={leadMinutes}
              onChange={(event) => setLeadMinutes(event.target.value)}
            />
          </label>
          <button
            className="btn btn-quiet"
            type="submit"
            disabled={busy}
          >
            Guardar minutos
          </button>
        </form>

        <p className="hint">
          {native
            ? 'Los avisos se programan como notificaciones locales de Android. Pueden requerir permiso de alarmas exactas y el fabricante puede retrasarlos si la app está cerrada.'
            : 'Los avisos usan la API de notificaciones y el Service Worker. En algunos sistemas el envío exacto en segundo plano puede variar; para mayor fiabilidad, instala la PWA y permite las notificaciones.'}
        </p>

        {settings.notificationsEnabled && permission !== 'granted' && (
          <p className="inline-message warning">
            El recordatorio está marcado, pero el sistema no ha concedido el
            permiso. Actívalo en los ajustes de la aplicación.
          </p>
        )}
      </section>

      <section className="settings-card" aria-labelledby="backup-title">
        <div className="settings-heading">
          <h2 id="backup-title">Respaldo de datos</h2>
          <p>
            Exporta circuitos, dispositivos y preferencias a un archivo JSON.
            No se envía nada a internet.
          </p>
        </div>

        <div className="backup-actions">
          <button
            className="btn btn-primary"
            type="button"
            onClick={handleExport}
            disabled={busy}
          >
            <Icon name="download" size={20} />
            Exportar JSON
          </button>
          <button
            className="btn btn-quiet"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
          >
            <Icon name="upload" size={20} />
            Importar JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportFile}
            hidden
          />
        </div>

        <p className="data-note">
          Última actualización oficial de horarios:{' '}
          {formatDateTime(lastScheduleUpdate)}
        </p>
      </section>

      {!native && (
        <section className="settings-card" aria-labelledby="install-title">
          <div className="settings-heading">
            <h2 id="install-title">Instalar aplicación</h2>
            <p>
              Instala la PWA para abrirla como una app y conservar el shell
              disponible sin conexión.
            </p>
          </div>

          {canInstall ? (
            <button
              className="btn btn-accent"
              type="button"
              onClick={handleInstall}
            >
              <Icon name="download" size={20} />
              Instalar en este dispositivo
            </button>
          ) : (
            <p className="hint">
              Si tu navegador lo permite, usa su menú y elige “Instalar
              aplicación” o “Añadir a pantalla de inicio”.
            </p>
          )}
        </section>
      )}

      <footer className="last-update">
        <Icon name="clock" size={15} />
        <span>
          Datos guardados localmente mediante IndexedDB. Versión 1.0.0.
        </span>
      </footer>
    </div>
  );
}
