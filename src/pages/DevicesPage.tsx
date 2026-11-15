import { useState, type FormEvent } from 'react';
import { Icon } from '../components/Icon';
import { createId } from '../lib/id';
import { getCapacityWh } from '../lib/schedule';
import { useAppStore } from '../store/useAppStore';
import type { Device } from '../types';

type CapacityUnit = 'mah' | 'wh';
type Feedback = { type: 'error' | 'success'; message: string };

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

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DeviceFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
    setFeedback(null);
  };

  const openEdit = (device: Device) => {
    setEditingId(device.id);
    setForm({
      name: device.name,
      capacity: String(device.capacityWh ?? device.capacityMah ?? ''),
      unit: device.capacityWh ? 'wh' : 'mah',
      chargerWatts: String(device.chargerWatts),
      efficiency: String(Math.round((device.efficiency ?? 0.85) * 100)),
    });
    setFormOpen(true);
    setFeedback(null);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const updateForm = (patch: Partial<DeviceFormState>) => {
    setForm((current) => ({ ...current, ...patch }));
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

    const device: Device = {
      id: editingId ?? createId('device'),
      name,
      chargerWatts,
      efficiency: efficiencyPercent / 100,
    };

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
        message: editingId
          ? 'Dispositivo actualizado.'
          : 'Dispositivo guardado.',
      });
      closeForm();
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

  return (
    <div className="page">
      <header className="page-header">
        <p className="eyebrow">Planificación</p>
        <h1>Dispositivos</h1>
        <p>
          Guarda tus power banks, UPS o laptops para saber cuánto pueden
          cargarse durante una ventana con luz.
        </p>
      </header>

      <div className="toolbar">
        <button
          className="btn btn-primary"
          type="button"
          onClick={openCreate}
          disabled={saving || formOpen}
        >
          <Icon name="plus" size={20} />
          Añadir dispositivo
        </button>
      </div>

      {feedback && (
        <p className={`inline-message ${feedback.type}`} role="status">
          {feedback.message}
        </p>
      )}

      {formOpen && (
        <section className="card device-form-card" aria-labelledby="device-form-title">
          <div className="section-heading">
            <h2 id="device-form-title">
              {editingId ? 'Editar dispositivo' : 'Nuevo dispositivo'}
            </h2>
            <button
              className="icon-button"
              type="button"
              onClick={closeForm}
              aria-label="Cerrar formulario"
            >
              ✕
            </button>
          </div>

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
                onClick={closeForm}
                disabled={saving}
              >
                Cancelar
              </button>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                <Icon name="check" size={20} />
                {saving ? 'Guardando…' : 'Guardar dispositivo'}
              </button>
            </div>
          </form>
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
              Añade uno para ver el porcentaje aproximado que recuperará durante
              cada ventana de luz.
            </p>
          </div>
        ) : (
          <ul className="device-list">
            {devices.map((device) => {
              const active = settings.activeDeviceId === device.id;
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
