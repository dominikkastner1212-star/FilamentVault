import { FormEvent, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
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

export function UsageFormModal({ rolls, selectedRollId, onClose, onSubmit }: UsageFormModalProps) {
  const activeRolls = rolls.filter((roll) => roll.status !== 'leer');
  const [values, setValues] = useState<UsageFormValues>({
    roll_id: selectedRollId || activeRolls[0]?.id || '',
    project_name: '',
    used_weight_g: 25,
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

  function update<K extends keyof UsageFormValues>(key: K, value: UsageFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function validate() {
    const nextErrors: string[] = [];
    if (!values.roll_id) nextErrors.push('Bitte waehle eine Filamentrolle.');
    if (!values.project_name.trim()) nextErrors.push('Projektname fehlt.');
    if (values.used_weight_g <= 0) nextErrors.push('Verbrauch muss groesser als 0 g sein.');
    if (!values.used_at) nextErrors.push('Datum fehlt.');
    if (selectedRoll && values.used_weight_g > selectedRoll.remaining_weight_g) {
      nextErrors.push(`Maximal verfuegbar: ${formatGrams(selectedRoll.remaining_weight_g)}.`);
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
    <Modal title="Verbrauch eintragen" subtitle="Restgewicht und Kosten werden nach dem Speichern aktualisiert." onClose={onClose}>
      <form className="stacked-form" onSubmit={handleSubmit}>
        {errors.length ? (
          <div className="form-error">
            {errors.map((error) => (
              <div key={error}>{error}</div>
            ))}
          </div>
        ) : null}

        <label>
          Filamentrolle
          <select value={values.roll_id} onChange={(event) => update('roll_id', event.target.value)}>
            {activeRolls.map((roll) => (
              <option key={roll.id} value={roll.id}>
                {roll.manufacturer} · {roll.material} · {roll.color} · {formatGrams(roll.remaining_weight_g)}
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

        <label>
          Datum
          <input type="date" value={values.used_at} onChange={(event) => update('used_at', event.target.value)} />
        </label>

        <label>
          Notiz
          <textarea value={values.note} onChange={(event) => update('note', event.target.value)} rows={3} />
        </label>

        <div className="form-summary">
          <span>{selectedRoll ? `${selectedRoll.manufacturer} ${selectedRoll.material}` : 'Keine Rolle gewaehlt'}</span>
          <strong>{formatCurrency(costPreview)}</strong>
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
