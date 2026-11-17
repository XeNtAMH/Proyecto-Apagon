import { useEffect, useState, type FormEvent } from 'react';
import { Icon, type IconName } from '../components/Icon';
import type { DeviceCategory, DevicePreset } from '../data/devicePresets';
import { createId } from '../lib/id';
import { getCapacityWh } from '../lib/schedule';
import { useAppStore } from '../store/useAppStore';
import type { Device } from '../types';

type CapacityUnit = 'mah' | 'wh';
type FeedbackType = 'error' | 'success' | 'warning';
type Feedback = { type: FeedbackType; message: string };
type PresetModule = typeof import('../data/devicePresets');

interface DeviceFormState {
  name: string;
  capacity: string;
  unit: CapacityUnit;
  chargerWatts: string;
  efficiency: string;
}

const EMPTY_FORM: DeviceFormState = {
  name: '',
  capacity: '10000',
  unit: 'mah',
  chargerWatts: '20',
  efficiency: '85',
};

const CATEGORY_ICONS: Record<DeviceCategory, IconName> = {
  phone: 'phone',
  powerbank: 'battery',
  laptop: 'monitor',
  tablet: 'tablet',
  ups: 'plug',
  router: 'wifi',
  fan: 'fan',
  lamp: 'lamp',
  other: 'bolt',
};

const NUMBER_FORMAT = new Intl.NumberFormat('es', {
  maximumFractionDigits: 1,
});

function toNumber(value: string): number {
  return Number(value.replace(',', '.'));
}

function formatCapacity(device: Device): string {
  if (device.capacityWh) {
    return `${NUMBER_FORMAT.format(device.capacityWh)} Wh`;
  }
  if (device.capacityMah) {
    return `${NUMBER_FORMAT.format(device.capacityMah)} mAh · ≈${NUMBER_FORMAT.format(
      getCapacityWh(device),
    )} Wh`;
  }
  return 'Capacidad sin definir';
}

function formFromDevice(device: Device): DeviceFormState {
  return {
    name: device.name,
    capacity: String(device.capacityWh ?? device.capacityMah ?? ''),
    unit: device.capacityWh ? 'wh' : 'mah',
    chargerWatts: String(device.chargerWatts),
    efficiency: String(Math.round((device.efficiency ?? 0.85) * 100)),
  };
}

/** ¿El dispositivo sigue teniendo exactamente los valores del preset? */
function matchesPreset(device: Device, preset: DevicePreset): boolean {
  return (
    Math.abs(getCapacityWh(device) - preset.batteryWh) < 0.15 &&
    Math.abs(device.chargerWatts - preset.chargeWatts) < 0.01 &&
    Math.abs((device.efficiency ?? 0.85) - (preset.efficiency ?? 0.85)) <
      0.005
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'No se pudo guardar el dispositivo.';
}

export function DevicesPage() {
  const devices = useAppStore((state) => state.devices);
  const settings = useAppStore((state) => state.settings);
  const saveDevice = useAppStore((state) => state.saveDevice);
  const deleteDevice = useAppStore((state) => state.deleteDevice);
  const updateSettings = useAppStore((state) => state.updateSettings);

  const [catalog, setCatalog] = useState<PresetModule | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogAttempt, setCatalogAttempt] = useState(0);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [category, setCategory] = useState<DeviceCategory | null>(null);
  const [query, setQuery] = useState('');

  const [editorId, setEditorId] = useState<string | null>(null);
  const [editorJustSaved, setEditorJustSaved] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [form, setForm] = useState<DeviceFormState>(EMPTY_FORM);

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  // El catálogo vive en un chunk aparte: nunca entra en el JS inicial.
  useEffect(() => {
    if (catalog) return;
    let cancelled = false;
    setCatalogError(null);

    import('../data/devicePresets')
      .then((module) => {
        if (!cancelled) setCatalog(module);
      })
      .catch(() => {
        if (!cancelled) {
          setCatalogError(
            'No se pudo cargar el catálogo de dispositivos. Revisa la conexión e inténtalo de nuevo.',
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [catalog, catalogAttempt]);

  const editorDevice = devices.find((device) => device.id === editorId);

  const openPicker = () => {
    setPickerOpen(true);
    setCategory(null);
    setQuery('');
    setEditorId(null);
    setEditorJustSaved(false);
    setAdvancedOpen(false);
    setForm(EMPTY_FORM);
    setFeedback(null);
  };

  const closePicker = () => {
    setPickerOpen(false);
    setCategory(null);
    setQuery('');
  };

  const closeEditor = () => {
    setEditorId(null);
    setEditorJustSaved(false);
    setAdvancedOpen(false);
    setForm(EMPTY_FORM);
  };

  const openEdit = (device: Device) => {
    setPickerOpen(false);
    setCategory(null);
    setQuery('');
    setEditorId(device.id);
    setEditorJustSaved(false);
    setAdvancedOpen(true);
    setForm(formFromDevice(device));
    setFeedback(null);
  };

  const updateForm = (patch: Partial<DeviceFormState>) => {
    setForm((current) => ({ ...current, ...patch }));
  };

  const handlePresetSelect = async (preset: DevicePreset) => {
    if (saving) return;

    const device: Device = {
      id: createId('device'),
      name: catalog ? catalog.presetName(preset) : preset.model,
      capacityWh: preset.batteryWh,
      chargerWatts: preset.chargeWatts,
      efficiency: preset.efficiency ?? 0.85,
      presetId: preset.id,
    };

    setSaving(true);
    setFeedback(null);
    try {
      await saveDevice(device);
      closePicker();
      setEditorId(device.id);
      setEditorJustSaved(true);
      setAdvancedOpen(false);
      setForm(formFromDevice(device));

      const isFallback = catalog?.isUnknownPresetId(preset.id) ?? false;
      setFeedback({
        type: isFallback ? 'warning' : 'success',
        message: isFallback
          ? `${device.name} añadido con valores conservadores (${NUMBER_FORMAT.format(
              preset.batteryWh,
            )} Wh · ${NUMBER_FORMAT.format(
              preset.chargeWatts,
            )} W). Si conoces los datos de la etiqueta, ajústalos en «Ajustes avanzados».`
          : `${device.name} añadido. Ya puedes usarlo para estimar la carga.`,
      });
    } catch (error) {
      setFeedback({ type: 'error', message: getErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = form.name.trim();
    const capacity = toNumber(form.capacity);
    const chargerWatts = toNumber(form.chargerWatts);
    const efficiencyPercent = toNumber(form.efficiency);

    if (!name) {
      setFeedback({ type: 'error', message: 'Escribe un nombre para el equipo.' });
      return;
    }
    if (!Number.isFinite(capacity) || capacity <= 0) {
      setFeedback({
        type: 'error',
        message: 'La capacidad debe ser un número mayor que cero.',
      });
      return;
    }
    if (!Number.isFinite(chargerWatts) || chargerWatts <= 0) {
      setFeedback({
        type: 'error',
        message: 'La potencia del cargador debe ser mayor que cero.',
      });
      return;
    }
    if (
      !Number.isFinite(efficiencyPercent) ||
      efficiencyPercent < 1 ||
      efficiencyPercent > 100
    ) {
      setFeedback({
        type: 'error',
        message: 'La eficiencia debe estar entre 1% y 100%.',
      });
      return;
    }

    const existing = editorId
      ? devices.find((device) => device.id === editorId)
      : undefined;

    const device: Device = {
      id: editorId ?? createId('device'),
      name,
      chargerWatts,
      efficiency: efficiencyPercent / 100,
    };
    if (existing?.presetId) {
      device.presetId = existing.presetId;
    }

    if (form.unit === 'mah') {
      device.capacityMah = capacity;
    } else {
      device.capacityWh = capacity;
    }

    setSaving(true);
    setFeedback(null);
    try {
      await saveDevice(device);
      setFeedback({
        type: 'success',
        message: editorJustSaved
          ? 'Ajustes guardados.'
          : 'Dispositivo actualizado.',
      });
      closeEditor();
    } catch (error) {
      setFeedback({ type: 'error', message: getErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (device: Device) => {
    if (
      !window.confirm(
        `¿Eliminar "${device.name}"? La estimación de carga dejará de usar sus datos.`,
      )
    ) {
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      await deleteDevice(device.id);
      if (editorId === device.id) closeEditor();
      setFeedback({ type: 'success', message: 'Dispositivo eliminado.' });
    } catch (error) {
      setFeedback({ type: 'error', message: getErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const handleSetActive = async (device: Device) => {
    setFeedback(null);
    try {
      await updateSettings({ activeDeviceId: device.id });
      setFeedback({
        type: 'success',
        message: `${device.name} se usará para estimar carga en Inicio.`,
      });
    } catch (error) {
      setFeedback({ type: 'error', message: getErrorMessage(error) });
    }
  };

  const capacityPreview = (() => {
    const rawCapacity = toNumber(form.capacity);
    if (!Number.isFinite(rawCapacity) || rawCapacity <= 0) return null;
    const capacityWh =
      form.unit === 'mah' ? (rawCapacity * 3.7) / 1000 : rawCapacity;
    return Math.round(capacityWh * 10) / 10;
  })();

  const currentCategory = catalog?.DEVICE_CATEGORIES.find(
    (item) => item.id === category,
  );
  const categoryPresets =
    catalog && category ? catalog.getPresetsByCategory(category) : [];
  const results = catalog
    ? catalog.searchPresets(categoryPresets, query)
    : [];
  const unknownPreset =
    catalog && category ? catalog.getUnknownPreset(category) : null;

  return (
    <div className="page">
      <header className="page-header">
        <p className="eyebrow">Planificación</p>
        <h1>Dispositivos</h1>
        <p>
          Elige qué quieres cargar y el modelo. Con eso calculamos cuánta batería
          recupera durante cada ventana con luz.
        </p>
      </header>

      <div className="toolbar">
        <button
          className="btn btn-primary"
          type="button"
          onClick={openPicker}
          disabled={saving || pickerOpen}
        >
          <Icon name="plus" size={20} />
          Añadir dispositivo
        </button>
      </div>

      {feedback && (
        <p
          className={`inline-message ${feedback.type}`}
          role={feedback.type === 'error' ? 'alert' : 'status'}
        >
          {feedback.message}
        </p>
      )}

      {pickerOpen && (
        <section
          className="card device-picker-card"
          aria-labelledby="device-picker-title"
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow">Paso {category ? 2 : 1} de 2</p>
              <h2 id="device-picker-title">
                {category ? '¿Cuál es el modelo?' : '¿Qué quieres cargar?'}
              </h2>
            </div>
            <button
              className="icon-button"
              type="button"
              onClick={closePicker}
              aria-label="Cerrar selección de dispositivo"
            >
              ✕
            </button>
          </div>

          {catalogError && (
            <div className="inline-message error">
              <p>{catalogError}</p>
              <button
                className="btn btn-quiet btn-small"
                type="button"
                onClick={() => setCatalogAttempt((attempt) => attempt + 1)}
              >
                Reintentar
              </button>
            </div>
          )}

          {!catalog && !catalogError && (
            <p className="hint" role="status">
              Cargando catálogo de dispositivos…
            </p>
          )}

          {catalog && !category && (
            <div className="category-grid">
              {catalog.DEVICE_CATEGORIES.map((item) => (
                <button
                  className="category-option"
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setCategory(item.id);
                    setQuery('');
                  }}
                  disabled={saving}
                >
                  <span className="category-icon" aria-hidden="true">
                    <Icon name={CATEGORY_ICONS[item.id]} size={25} />
                  </span>
                  <span className="category-copy">
                    <span className="category-label">{item.label}</span>
                    <span className="category-hint">{item.hint}</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {catalog && category && (
            <div className="device-picker-step">
              <button
                className="inline-link back-link"
                type="button"
                onClick={() => {
                  setCategory(null);
                  setQuery('');
                }}
              >
                ← Cambiar categoría
              </button>

              <label className="field">
                <span>Buscar modelo</span>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={
                    currentCategory
                      ? `Buscar en ${currentCategory.label.toLowerCase()}…`
                      : 'Buscar modelo…'
                  }
                  autoComplete="off"
                />
              </label>

              <p className="hint" role="status">
                {results.length}{' '}
                {results.length === 1 ? 'modelo' : 'modelos'} en{' '}
                {currentCategory?.label.toLowerCase() ?? 'la categoría'}.
              </p>

              {results.length > 0 ? (
                <ul className="preset-list">
                  {results.map((preset) => (
                    <li key={preset.id}>
                      <button
                        className="preset-option"
                        type="button"
                        onClick={() => void handlePresetSelect(preset)}
                        disabled={saving}
                      >
                        <span className="preset-copy">
                          <span className="preset-name">
                            {catalog.presetName(preset)}
                            {preset.popular && (
                              <span className="popular-pill">Popular</span>
                            )}
                          </span>
                          <span className="preset-specs">
                            {NUMBER_FORMAT.format(preset.batteryWh)} Wh ·{' '}
                            {NUMBER_FORMAT.format(preset.chargeWatts)} W
                          </span>
                        </span>
                        <Icon name="arrow-right" size={19} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="empty-list-copy">
                  No hay coincidencias. Prueba otro nombre o usa «No sé».
                </p>
              )}

              {unknownPreset && (
                <button
                  className="preset-option preset-unknown"
                  type="button"
                  onClick={() => void handlePresetSelect(unknownPreset)}
                  disabled={saving}
                >
                  <span className="preset-copy">
                    <span className="preset-name">No sé</span>
                    <span className="preset-specs">
                      Valores conservadores ·{' '}
                      {NUMBER_FORMAT.format(unknownPreset.batteryWh)} Wh ·{' '}
                      {NUMBER_FORMAT.format(unknownPreset.chargeWatts)} W
                    </span>
                  </span>
                  <Icon name="arrow-right" size={19} />
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {editorDevice && (
        <section
          className="card device-form-card"
          aria-labelledby="device-editor-title"
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                {editorJustSaved ? 'Guardado' : 'Editar'}
              </p>
              <h2 id="device-editor-title">{editorDevice.name}</h2>
            </div>
            <button
              className="icon-button"
              type="button"
              onClick={closeEditor}
              aria-label="Cerrar ajustes del dispositivo"
            >
              ✕
            </button>
          </div>

          <div className="device-specs">
            <span className="chip">{formatCapacity(editorDevice)}</span>
            <span className="chip">
              <Icon name="plug" size={16} />
              {NUMBER_FORMAT.format(editorDevice.chargerWatts)} W
            </span>
            <span className="chip">
              Eficiencia{' '}
              {Math.round((editorDevice.efficiency ?? 0.85) * 100)}%
            </span>
          </div>

          {editorJustSaved && (
            <p className="hint">
              Los valores se han copiado del catálogo. Puedes corregirlos si la
              etiqueta de tu equipo indica otra cosa.
            </p>
          )}

          <details
            className="advanced-settings"
            open={advancedOpen}
            onToggle={(event) => setAdvancedOpen(event.currentTarget.open)}
          >
            <summary>Ajustes avanzados</summary>

            <form className="device-form" onSubmit={handleSubmit}>
              <label className="field">
                <span>Nombre</span>
                <input
                  type="text"
                  value={form.name}
                  maxLength={120}
                  onChange={(event) => updateForm({ name: event.target.value })}
                  placeholder="Ej. Power bank 10.000 mAh"
                  required
                />
              </label>

              <div className="device-form-grid">
                <div className="field">
                  <span>Capacidad</span>
                  <div className="input-combo">
                    <input
                      type="number"
                      min="0.1"
                      step="any"
                      inputMode="decimal"
                      value={form.capacity}
                      onChange={(event) =>
                        updateForm({ capacity: event.target.value })
                      }
                      aria-label="Capacidad del dispositivo"
                      required
                    />
                    <select
                      value={form.unit}
                      onChange={(event) =>
                        updateForm({ unit: event.target.value as CapacityUnit })
                      }
                      aria-label="Unidad de capacidad"
                    >
                      <option value="mah">mAh</option>
                      <option value="wh">Wh</option>
                    </select>
                  </div>
                </div>

                <label className="field">
                  <span>Cargador (W)</span>
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    inputMode="decimal"
                    value={form.chargerWatts}
                    onChange={(event) =>
                      updateForm({ chargerWatts: event.target.value })
                    }
                    required
                  />
                </label>
              </div>

              <label className="field">
                <span>Eficiencia de carga (%)</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  inputMode="numeric"
                  value={form.efficiency}
                  onChange={(event) =>
                    updateForm({ efficiency: event.target.value })
                  }
                  required
                />
              </label>

              <p className="hint">
                Si no conoces la eficiencia, deja 85%. Las capacidades en mAh se
                convierten a Wh asumiendo una batería de 3.7 V.
              </p>

              {capacityPreview !== null && (
                <p className="form-preview">
                  Capacidad útil aproximada:{' '}
                  <strong>{NUMBER_FORMAT.format(capacityPreview)} Wh</strong>
                </p>
              )}

              <div className="editor-actions">
                <button
                  className="btn btn-quiet"
                  type="button"
                  onClick={closeEditor}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={saving}
                >
                  <Icon name="check" size={20} />
                  {saving ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </details>
        </section>
      )}

      <section className="section-block" aria-labelledby="device-list-title">
        <div className="section-heading">
          <h2 id="device-list-title">Mis dispositivos</h2>
          <span className="section-count">{devices.length}</span>
        </div>

        {devices.length === 0 ? (
          <div className="empty-state compact">
            <span className="empty-icon">
              <Icon name="battery" size={28} />
            </span>
            <h3>Aún no hay dispositivos</h3>
            <p>
              Elige un modelo del catálogo para ver el porcentaje aproximado que
              recuperará durante cada ventana de luz.
            </p>
          </div>
        ) : (
          <ul className="device-list">
            {devices.map((device) => {
              const active = settings.activeDeviceId === device.id;
              const preset = catalog?.getPresetById(device.presetId ?? '');
              const conservative =
                preset !== undefined &&
                catalog?.isUnknownPresetId(device.presetId) === true &&
                matchesPreset(device, preset);

              return (
                <li className="device-card" key={device.id}>
                  <div className="device-card-head">
                    <span className={`device-icon${active ? ' is-active' : ''}`}>
                      <Icon name="battery" size={23} />
                    </span>
                    <div className="device-title-wrap">
                      <h3>{device.name}</h3>
                      {active && <span className="active-pill">En uso en Inicio</span>}
                    </div>
                  </div>

                  <div className="device-specs">
                    <span className="chip">{formatCapacity(device)}</span>
                    <span className="chip">
                      <Icon name="plug" size={16} />
                      {NUMBER_FORMAT.format(device.chargerWatts)} W
                    </span>
                    <span className="chip">
                      Eficiencia {Math.round((device.efficiency ?? 0.85) * 100)}%
                    </span>
                    {conservative && (
                      <span className="chip chip-warning">Valores estimados</span>
                    )}
                  </div>

                  <div className="device-actions">
                    <button
                      className="btn btn-quiet btn-small"
                      type="button"
                      onClick={() => openEdit(device)}
                      disabled={saving}
                    >
                      <Icon name="edit" size={17} />
                      Editar
                    </button>
                    {!active && (
                      <button
                        className="btn btn-quiet btn-small"
                        type="button"
                        onClick={() => handleSetActive(device)}
                        disabled={saving}
                      >
                        Usar en Inicio
                      </button>
                    )}
                    <button
                      className="btn btn-danger-ghost btn-small"
                      type="button"
                      onClick={() => handleDelete(device)}
                      disabled={saving}
                    >
                      <Icon name="trash" size={17} />
                      Eliminar
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="data-note">
        La estimación es orientativa y parte de una batería vacía. La carga real
        varía según el cable, la temperatura y el dispositivo.
      </p>
    </div>
  );
}
