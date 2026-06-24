import { FormEvent, useMemo, useState } from 'react';
import { Bolt, Save } from 'lucide-react';
import { Modal } from './Modal';
import { FilamentRoll, UsageFormValues } from '../types';
import { formatCurrency, formatGrams } from '../lib/format';

type UsageFormModalProps = {
  rolls: FilamentRoll[];
  selectedRollId?: string | null;
  onClose: () => void;
  onSubmit: (values: UsageFormValues) => Promise<void>;
};

const today = new Date().toISOString().slice(0, 10);
const presets = [25, 50, 100, 150];

export function UsageFormModal({ rolls, selectedRollId, onClose, onSubmit }: UsageFormModalProps) {
  const activeRolls = rolls.filter((roll) => roll.status !== 'leer');
  const [values, setValues] = useState<UsageFormValues>({
    roll_id: selectedRollId || activeRolls[0]?.id || '',
    project_name: '',
    used_weight_g: 50,
    used_at: today,
    note: ''
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const selectedRoll = useMemo(
    () => rolls.find((roll) => roll.id === values.roll_id) || null,
    [rolls, values.roll_id]
  );
  const costPreview = selectedRoll ? (selectedRoll.price / selectedRoll.original_weight_g) * values.used_weight_g : 0;
  const remainingAfter = selectedRoll ? Math.max(0, selectedRoll.remaining_weight_g - values.used_weight_g) : 0;
  const remainingPercent = selectedRoll ? Math.max(0, Math.min(100, (remainingAfter / selectedRoll.original_weight_g) * 100)) : 0;

  function update<K extends keyof UsageFormValues>(key: K, value: UsageFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function validate() {
    const nextErrors: string[] = [];
    if (!values.roll_id) nextErrors.push('Bitte wähle eine Filamentrolle.');
    if (!values.project_name.trim()) nextErrors.push('Projektname fehlt.');
    if (values.used_weight_g <= 0) nextErrors.push('Verbrauch muss groesser als 0 g sein.');
    if (!values.used_at) nextErrors.push('Datum fehlt.');
    if (selectedRoll && values.used_weight_g > selectedRoll.remaining_weight_g) {
      nextErrors.push(`Maximal verfügbar: ${formatGrams(selectedRoll.remaining_weight_g)}.`);
    }
    return nextErrors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationErrors = validate();
    if (validationErrors.length) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    setErrors([]);
    try {
      await onSubmit({
        ...values,
        project_name: values.project_name.trim(),
        note: values.note.trim()
      });
      onClose();
    } catch (submitError) {
      setErrors([submitError instanceof Error ? submitError.message : 'Verbrauch konnte nicht gespeichert werden.']);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="Schnellverbrauch"
      subtitle="Projekt wählen, Gramm tippen, Bestand aktualisieren."
      onClose={onClose}
      variant="sheet"
    >
      <form className="stacked-form quick-usage-form" onSubmit={handleSubmit}>
        {errors.length ? (
          <div className="form-error">
            {errors.map((error) => (
              <div key={error}>{error}</div>
            ))}
          </div>
        ) : null}

        {selectedRoll ? (
          <section className="quick-roll-card">
            <span className="material-dot large" data-material={selectedRoll.material} />
            <div>
              <strong>{selectedRoll.manufacturer} - {selectedRoll.color}</strong>
              <small>{selectedRoll.material} - {formatGrams(selectedRoll.remaining_weight_g)} verfügbar</small>
            </div>
            <em>{formatCurrency(selectedRoll.price / selectedRoll.original_weight_g)}/g</em>
          </section>
        ) : null}

        <label>
          Filamentrolle
          <select value={values.roll_id} onChange={(event) => update('roll_id', event.target.value)}>
            {activeRolls.map((roll) => (
              <option key={roll.id} value={roll.id}>
                {roll.manufacturer} - {roll.material} - {roll.color} - {formatGrams(roll.remaining_weight_g)}
              </option>
            ))}
          </select>
        </label>

        <label>
          Projektname
          <input value={values.project_name} onChange={(event) => update('project_name', event.target.value)} />
        </label>

        <label>
          Verbrauch in g
          <input
            type="number"
            min="1"
            value={values.used_weight_g}
            onChange={(event) => update('used_weight_g', Number(event.target.value))}
          />
        </label>

        <div className="preset-grid" aria-label="Schnelle Verbrauchswerte">
          {presets.map((preset) => (
            <button
              type="button"
              key={preset}
              className={values.used_weight_g === preset ? 'preset-chip active' : 'preset-chip'}
              onClick={() => update('used_weight_g', preset)}
              disabled={selectedRoll ? preset > selectedRoll.remaining_weight_g : false}
            >
              <Bolt size={14} />
              {preset} g
            </button>
          ))}
          {selectedRoll ? (
            <button
              type="button"
              className="preset-chip"
              onClick={() => update('used_weight_g', Math.max(1, Math.round(selectedRoll.remaining_weight_g)))}
            >
              Rest
            </button>
          ) : null}
        </div>

        <label>
          Datum
          <input type="date" value={values.used_at} onChange={(event) => update('used_at', event.target.value)} />
        </label>

        <label>
          Notiz
          <textarea value={values.note} onChange={(event) => update('note', event.target.value)} rows={3} />
        </label>

        <div className="form-summary quick-summary">
          <div>
            <span>Kosten für diesen Druck</span>
            <strong>{formatCurrency(costPreview)}</strong>
          </div>
          <div>
            <span>Rest danach</span>
            <strong>{formatGrams(remainingAfter)}</strong>
          </div>
          <div className="form-gauge" aria-label={`Rest danach ${Math.round(remainingPercent)} Prozent`}>
            <span style={{ width: `${remainingPercent}%` }} />
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="ghost-button" onClick={onClose}>
            Abbrechen
          </button>
          <button type="submit" className="primary-button" disabled={submitting || !activeRolls.length}>
            <Save size={17} />
            {submitting ? 'Speichert' : 'Speichern'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
