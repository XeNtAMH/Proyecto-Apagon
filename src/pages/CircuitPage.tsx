import { useEffect, useState, type ChangeEvent } from 'react';
import { Icon } from '../components/Icon';
import { addLocalDays, formatShortDate, parseDateKey, toDateKey } from '../lib/dates';
import {
  createEmptyWeeklySchedule,
  isValidTime,
  normalizeIntervals,
} from '../lib/schedule';
import { useAppStore } from '../store/useAppStore';
import {
  WEEKDAYS,
  type CircuitSchedule,
  type DateSchedule,
  type Interval,
  type Weekday,
  type WeeklySchedule,
} from '../types';

const DAY_LABELS: Record<Weekday, string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

type Feedback = { type: 'error' | 'success'; message: string };

function cloneSchedule(schedule: CircuitSchedule): CircuitSchedule {
  if (Array.isArray(schedule)) {
    return schedule.map((entry) => ({
      date: entry.date,
      intervals: entry.intervals.map((interval) => ({ ...interval })),
    }));
  }

  const clone = createEmptyWeeklySchedule();
  for (const day of WEEKDAYS) {
    clone[day] = schedule[day].map((interval) => ({ ...interval }));
  }
  return clone;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'No se pudieron guardar los cambios.';
}

function validateIntervals(
  intervals: Interval[],
  context: string,
): string | null {
  for (const interval of intervals) {
    if (!isValidTime(interval.start) || !isValidTime(interval.end)) {
      return `Revisa las horas de ${context}: usa el formato HH:mm.`;
    }
  }
  return null;
}

function getDefaultInterval(): Interval {
  return { start: '06:00', end: '08:00' };
}

export function CircuitPage() {
  const circuits = useAppStore((state) => state.circuits);
  const settings = useAppStore((state) => state.settings);
  const selectCircuit = useAppStore((state) => state.selectCircuit);
  const createCircuit = useAppStore((state) => state.createCircuit);
  const saveCircuit = useAppStore((state) => state.saveCircuit);
  const deleteCircuit = useAppStore((state) => state.deleteCircuit);

  const selectedCircuit = circuits.find(
    (circuit) => circuit.id === settings.selectedCircuitId,
  );

  const [draftName, setDraftName] = useState('');
  const [draftSchedule, setDraftSchedule] = useState<CircuitSchedule>(() =>
    createEmptyWeeklySchedule(),
  );
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    if (!selectedCircuit) return;
    setDraftName(selectedCircuit.name);
    setDraftSchedule(cloneSchedule(selectedCircuit.schedule));
    setDirty(false);
    // No se limpia el feedback: puede contener el aviso de circuito creado.
    // Solo se reinicia al cambiar de circuito; los guardados actualizan el editor.
  }, [selectedCircuit?.id]);

  const dateMode = Array.isArray(draftSchedule);
  const weeklySchedule = dateMode
    ? createEmptyWeeklySchedule()
    : (draftSchedule as WeeklySchedule);
  const dateEntries: DateSchedule[] = dateMode
    ? (draftSchedule as DateSchedule[])
    : [];

  const markDirty = () => {
    setDirty(true);
    setFeedback(null);
  };

  const updateWeeklyInterval = (
    day: Weekday,
    index: number,
    field: 'start' | 'end',
    value: string,
  ) => {
    setDraftSchedule((current) => {
      if (Array.isArray(current)) return current;
      const intervals = current[day].map((interval, intervalIndex) =>
        intervalIndex === index ? { ...interval, [field]: value } : interval,
      );
      return { ...current, [day]: intervals };
    });
    markDirty();
  };

  const addWeeklyInterval = (day: Weekday) => {
    setDraftSchedule((current) => {
      if (Array.isArray(current)) return current;
      return {
        ...current,
        [day]: [...current[day], getDefaultInterval()],
      };
    });
    markDirty();
  };

  const removeWeeklyInterval = (day: Weekday, index: number) => {
    setDraftSchedule((current) => {
      if (Array.isArray(current)) return current;
      return {
        ...current,
        [day]: current[day].filter(
          (_, intervalIndex) => intervalIndex !== index,
        ),
      };
    });
    markDirty();
  };

  const updateDateEntry = (
    index: number,
    updater: (entry: DateSchedule) => DateSchedule,
  ) => {
    setDraftSchedule((current) => {
      if (!Array.isArray(current)) return current;
      return current.map((entry, entryIndex) =>
        entryIndex === index ? updater(entry) : entry,
      );
    });
    markDirty();
  };

  const updateDateInterval = (
    entryIndex: number,
    intervalIndex: number,
    field: 'start' | 'end',
    value: string,
  ) => {
    updateDateEntry(entryIndex, (entry) => ({
      ...entry,
      intervals: entry.intervals.map((interval, index) =>
        index === intervalIndex ? { ...interval, [field]: value } : interval,
      ),
    }));
  };

  const addDate = () => {
    setDraftSchedule((current) => {
      if (!Array.isArray(current)) return current;

      const usedDates = new Set(current.map((entry) => entry.date));
      let date = new Date();
      while (usedDates.has(toDateKey(date))) {
        date = addLocalDays(date, 1);
      }

      return [
        ...current,
        { date: toDateKey(date), intervals: [getDefaultInterval()] },
      ];
    });
    markDirty();
  };

  const removeDate = (index: number) => {
    setDraftSchedule((current) => {
      if (!Array.isArray(current)) return current;
      return current.filter((_, entryIndex) => entryIndex !== index);
    });
    markDirty();
  };

  const changeScheduleMode = (mode: 'weekly' | 'dates') => {
    const nextIsDate = mode === 'dates';
    if (nextIsDate === dateMode) return;

    const confirmed = window.confirm(
      'Cambiar el tipo de horario vaciará las ventanas actuales. ¿Continuar?',
    );
    if (!confirmed) return;

    setDraftSchedule(
      nextIsDate ? [] : createEmptyWeeklySchedule(),
    );
    setDirty(true);
    setFeedback(null);
  };

  const handleSelectCircuit = (event: ChangeEvent<HTMLSelectElement>) => {
    const id = event.target.value;
    if (!selectedCircuit || id === selectedCircuit.id) return;

    if (
      dirty &&
      !window.confirm('Hay cambios sin guardar. ¿Descartarlos y cambiar?')
    ) {
      // El select es controlado: hay que restaurar también el valor del DOM.
      event.target.value = selectedCircuit.id;
      return;
    }

    setFeedback(null);
    void selectCircuit(id).catch((error) => {
      setFeedback({ type: 'error', message: getErrorMessage(error) });
    });
  };

  const handleCreate = async () => {
    if (
      dirty &&
      !window.confirm('Hay cambios sin guardar. ¿Descartarlos y crear otro circuito?')
    ) {
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      await createCircuit();
      setFeedback({
        type: 'success',
        message: 'Circuito creado. Ponle un nombre y registra tus horas.',
      });
    } catch (error) {
      setFeedback({ type: 'error', message: getErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!selectedCircuit) return;

    const name = draftName.trim();
    if (!name) {
      setFeedback({ type: 'error', message: 'El circuito necesita un nombre.' });
      return;
    }
    if (name.length > 120) {
      setFeedback({
        type: 'error',
        message: 'El nombre no puede superar los 120 caracteres.',
      });
      return;
    }

    let schedule: CircuitSchedule;

    if (Array.isArray(draftSchedule)) {
      const dates = new Set<string>();
      const normalizedEntries: DateSchedule[] = [];

      for (const entry of draftSchedule) {
        if (!parseDateKey(entry.date)) {
          setFeedback({
            type: 'error',
            message: 'Añade una fecha válida en cada bloque.',
          });
          return;
        }
        if (dates.has(entry.date)) {
          setFeedback({
            type: 'error',
            message: `La fecha ${entry.date} está repetida.`,
          });
          return;
        }
        dates.add(entry.date);

        const intervalError = validateIntervals(
          entry.intervals,
          `la fecha ${entry.date}`,
        );
        if (intervalError) {
          setFeedback({ type: 'error', message: intervalError });
          return;
        }

        normalizedEntries.push({
          date: entry.date,
          intervals: normalizeIntervals(entry.intervals),
        });
      }

      schedule = normalizedEntries.sort((a, b) =>
        a.date.localeCompare(b.date),
      );
    } else {
      const normalizedWeek = createEmptyWeeklySchedule();
      for (const day of WEEKDAYS) {
        const intervalError = validateIntervals(
          draftSchedule[day],
          DAY_LABELS[day].toLowerCase(),
        );
        if (intervalError) {
          setFeedback({ type: 'error', message: intervalError });
          return;
        }
        normalizedWeek[day] = normalizeIntervals(draftSchedule[day]);
      }
      schedule = normalizedWeek;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const savedCircuit = {
        ...selectedCircuit,
        name,
        schedule,
      };
      await saveCircuit(savedCircuit);
      setDraftName(name);
      setDraftSchedule(cloneSchedule(schedule));
      setDirty(false);
      setFeedback({
        type: 'success',
        message:
          'Cambios guardados. El horario ya está disponible sin conexión.',
      });
    } catch (error) {
      setFeedback({ type: 'error', message: getErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCircuit) return;
    if (selectedCircuit.source === 'official') {
      setFeedback({
        type: 'error',
        message:
          'Los circuitos oficiales no se eliminan. Guarda una edición personal si necesitas otro horario.',
      });
      return;
    }

    const confirmed = window.confirm(
      `¿Eliminar el circuito "${selectedCircuit.name}"? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;

    setSaving(true);
    setFeedback(null);
    try {
      await deleteCircuit(selectedCircuit.id);
    } catch (error) {
      setFeedback({ type: 'error', message: getErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <p className="eyebrow">Configuración</p>
        <h1>Circuito</h1>
        <p>
          Registra las horas en las que llega la energía. Todo se guarda en tu
          teléfono y funciona sin internet.
        </p>
      </header>

      {!selectedCircuit ? (
        <section className="empty-card">
          <span className="empty-icon">
            <Icon name="calendar" size={30} />
          </span>
          <h2>Sin circuitos todavía</h2>
          <p>Crea un circuito para empezar a programar tus ventanas con luz.</p>
          <button
            className="btn btn-primary"
            type="button"
            onClick={handleCreate}
            disabled={saving}
          >
            <Icon name="plus" size={20} />
            Crear circuito
          </button>
          {feedback && (
            <p className={`inline-message ${feedback.type}`} role="status">
              {feedback.message}
            </p>
          )}
        </section>
      ) : (
        <>
          <section className="card circuit-selector-card">
            <label className="field">
              <span>Circuito activo</span>
              <select
                value={selectedCircuit.id}
                onChange={handleSelectCircuit}
                disabled={saving}
              >
                {circuits.map((circuit) => (
                  <option key={circuit.id} value={circuit.id}>
                    {circuit.name}
                    {circuit.source === 'official' ? ' · oficial' : ''}
                  </option>
                ))}
              </select>
            </label>
            <div className="selector-actions">
              <p className="small-note">
                {selectedCircuit.source === 'official'
                  ? 'Datos de ejemplo. Al guardar se crea una copia personal.'
                  : 'Horario personal guardado en este dispositivo.'}
              </p>
              <button
                className="btn btn-quiet btn-small"
                type="button"
                onClick={handleCreate}
                disabled={saving}
              >
                <Icon name="plus" size={18} />
                Nuevo circuito
              </button>
            </div>
          </section>

          {feedback && (
            <p
              className={`inline-message ${feedback.type}`}
              role="status"
            >
              {feedback.message}
            </p>
          )}

          <section className="card editor-card">
            <div className="editor-heading">
              <div>
                <p className="eyebrow">Editor</p>
                <h2>Ventanas con luz</h2>
              </div>
              <div
                className="segmented"
                role="group"
                aria-label="Tipo de horario"
              >
                <button
                  type="button"
                  className={!dateMode ? 'is-selected' : ''}
                  aria-pressed={!dateMode}
                  onClick={() => changeScheduleMode('weekly')}
                >
                  Semanal
                </button>
                <button
                  type="button"
                  className={dateMode ? 'is-selected' : ''}
                  aria-pressed={dateMode}
                  onClick={() => changeScheduleMode('dates')}
                >
                  Fechas
                </button>
              </div>
            </div>

            <label className="field">
              <span>Nombre del circuito</span>
              <input
                type="text"
                value={draftName}
                maxLength={120}
                onChange={(event) => {
                  setDraftName(event.target.value);
                  markDirty();
                }}
                placeholder="Ej. Centro · C-01"
              />
            </label>

            <p className="hint">
              Cada intervalo representa una ventana CON LUZ. Un horario como
              22:00–02:00 pertenece al día indicado y termina al día siguiente.
            </p>

            {dateMode ? (
              <div className="schedule-editor">
                <p className="hint">
                  Solo las fechas listadas tendrán energía. El resto del
                  calendario se considera apagón.
                </p>

                <div className="date-list">
                  {dateEntries.map((entry, entryIndex) => {
                    const parsedDate = parseDateKey(entry.date);
                    return (
                      <fieldset className="date-entry" key={`${entry.date}-${entryIndex}`}>
                        <legend>
                          {parsedDate
                            ? formatShortDate(parsedDate)
                            : 'Fecha específica'}
                        </legend>

                        <div className="date-entry-head">
                          <label className="field compact-field">
                            <span>Fecha</span>
                            <input
                              type="date"
                              value={entry.date}
                              onChange={(event) =>
                                updateDateEntry(entryIndex, (current) => ({
                                  ...current,
                                  date: event.target.value,
                                }))
                              }
                            />
                          </label>
                          <button
                            className="icon-button danger"
                            type="button"
                            onClick={() => removeDate(entryIndex)}
                            aria-label="Eliminar esta fecha"
                          >
                            <Icon name="trash" size={20} />
                          </button>
                        </div>

                        <div className="interval-list">
                          {entry.intervals.map((interval, intervalIndex) => (
                            <div
                              className="interval-row"
                              key={`${entry.date}-${intervalIndex}`}
                            >
                              <label className="compact-field">
                                <span>Inicio</span>
                                <input
                                  type="time"
                                  value={interval.start}
                                  onChange={(event) =>
                                    updateDateInterval(
                                      entryIndex,
                                      intervalIndex,
                                      'start',
                                      event.target.value,
                                    )
                                  }
                                />
                              </label>
                              <label className="compact-field">
                                <span>Fin</span>
                                <input
                                  type="time"
                                  value={interval.end}
                                  onChange={(event) =>
                                    updateDateInterval(
                                      entryIndex,
                                      intervalIndex,
                                      'end',
                                      event.target.value,
                                    )
                                  }
                                />
                              </label>
                              <button
                                className="icon-button danger"
                                type="button"
                                onClick={() =>
                                  updateDateEntry(entryIndex, (current) => ({
                                    ...current,
                                    intervals: current.intervals.filter(
                                      (_, index) => index !== intervalIndex,
                                    ),
                                  }))
                                }
                                aria-label="Eliminar esta ventana"
                              >
                                <Icon name="trash" size={19} />
                              </button>
                            </div>
                          ))}
                        </div>

                        <button
                          className="btn btn-quiet btn-small"
                          type="button"
                          onClick={() =>
                            updateDateEntry(entryIndex, (current) => ({
                              ...current,
                              intervals: [
                                ...current.intervals,
                                getDefaultInterval(),
                              ],
                            }))
                          }
                        >
                          <Icon name="plus" size={17} />
                          Añadir ventana
                        </button>
                      </fieldset>
                    );
                  })}
                </div>

                <button
                  className="btn btn-quiet add-date-button"
                  type="button"
                  onClick={addDate}
                >
                  <Icon name="plus" size={19} />
                  Añadir fecha
                </button>
              </div>
            ) : (
              <div className="week-editor">
                {WEEKDAYS.map((day) => (
                  <section className="day-editor" key={day}>
                    <div className="day-header">
                      <h3>{DAY_LABELS[day]}</h3>
                      <button
                        className="btn btn-quiet btn-small"
                        type="button"
                        onClick={() => addWeeklyInterval(day)}
                      >
                        <Icon name="plus" size={17} />
                        Añadir
                      </button>
                    </div>

                    {weeklySchedule[day].length === 0 ? (
                      <p className="empty-day">Sin luz programada.</p>
                    ) : (
                      <div className="interval-list">
                        {weeklySchedule[day].map((interval, index) => (
                          <div className="interval-row" key={`${day}-${index}`}>
                            <label className="compact-field">
                              <span>Inicio</span>
                              <input
                                type="time"
                                value={interval.start}
                                onChange={(event) =>
                                  updateWeeklyInterval(
                                    day,
                                    index,
                                    'start',
                                    event.target.value,
                                  )
                                }
                              />
                            </label>
                            <label className="compact-field">
                              <span>Fin</span>
                              <input
                                type="time"
                                value={interval.end}
                                onChange={(event) =>
                                  updateWeeklyInterval(
                                    day,
                                    index,
                                    'end',
                                    event.target.value,
                                  )
                                }
                              />
                            </label>
                            <button
                              className="icon-button danger"
                              type="button"
                              onClick={() => removeWeeklyInterval(day, index)}
                              aria-label={`Eliminar ventana de ${DAY_LABELS[day]}`}
                            >
                              <Icon name="trash" size={19} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                ))}
              </div>
            )}

            <div className="editor-actions">
              {selectedCircuit.source !== 'official' ? (
                <button
                  className="btn btn-danger-ghost"
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                >
                  <Icon name="trash" size={19} />
                  Eliminar circuito
                </button>
              ) : (
                <span className="small-note">
                  Los datos oficiales se actualizan automáticamente.
                </span>
              )}

              <button
                className="btn btn-primary"
                type="button"
                onClick={handleSave}
                disabled={!dirty || saving}
              >
                <Icon name="check" size={20} />
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>

            {dirty && (
              <p className="dirty-note" role="status">
                Hay cambios sin guardar.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
