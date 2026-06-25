import { FormEvent, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { MaterialProfileCard } from './MaterialProfileCard';
import { Modal } from './Modal';
import { FilamentRoll, MATERIALS, Profile, ROLL_STATUSES, RollFormValues } from '../types';

type RollFormModalProps = {
  roll?: FilamentRoll | null;
  duplicateFrom?: FilamentRoll | null;
  profiles: Profile[];
  onClose: () => void;
  onSubmit: (values: RollFormValues) => Promise<void>;
};

const today = new Date().toISOString().slice(0, 10);

function initialValues(
  roll?: FilamentRoll | null,
  profiles: Profile[] = [],
  duplicateFrom?: FilamentRoll | null
): RollFormValues {
  const source = roll || duplicateFrom;
  return {
    manufacturer: source?.manufacturer || '',
    material: source?.material || 'PLA',
    color: source?.color || '',
    original_weight_g: source?.original_weight_g || 1000,
    remaining_weight_g: roll ? roll.remaining_weight_g ?? 1000 : source?.original_weight_g || 1000,
    purchase_date: roll ? roll.purchase_date : today,
    price: source?.price || 0,
    buyer_id: source?.buyer_id || profiles[0]?.id || '',
    storage_location: source?.storage_location || '',
    notes: roll ? source?.notes || '' : '',
    status: roll ? roll.status || 'aktiv' : 'aktiv'
  };
}

function validateRoll(values: RollFormValues) {
  const errors: string[] = [];
  if (!values.manufacturer.trim()) errors.push('Hersteller fehlt.');
  if (!values.material.trim()) errors.push('Material fehlt.');
  if (!values.color.trim()) errors.push('Farbe fehlt.');
  if (!values.buyer_id) errors.push('Käufer fehlt.');
  if (!values.storage_location.trim()) errors.push('Lagerort fehlt.');
  if (values.original_weight_g <= 0) errors.push('Ursprungsgewicht muss groesser als 0 g sein.');
  if (values.remaining_weight_g < 0) errors.push('Restgewicht darf nicht negativ sein.');
  if (values.remaining_weight_g > values.original_weight_g) {
    errors.push('Restgewicht darf nicht groesser als das Ursprungsgewicht sein.');
  }
  if (values.price < 0) errors.push('Preis darf nicht negativ sein.');
  if (!values.purchase_date) errors.push('Kaufdatum fehlt.');
  return errors;
}

export function RollFormModal({ roll, duplicateFrom, profiles, onClose, onSubmit }: RollFormModalProps) {
  const [values, setValues] = useState<RollFormValues>(() => initialValues(roll, profiles, duplicateFrom));
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const pricePerGram = useMemo(
    () => (values.original_weight_g > 0 ? values.price / values.original_weight_g : 0),
    [values.original_weight_g, values.price]
  );

  function update<K extends keyof RollFormValues>(key: K, value: RollFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationErrors = validateRoll(values);
    if (validationErrors.length) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    setErrors([]);
    try {
      await onSubmit({
        ...values,
        manufacturer: values.manufacturer.trim(),
        material: values.material.trim(),
        color: values.color.trim(),
        storage_location: values.storage_location.trim(),
        notes: values.notes.trim(),
        status: values.remaining_weight_g <= 0 ? 'leer' : values.status
      });
      onClose();
    } catch (submitError) {
      setErrors([submitError instanceof Error ? submitError.message : 'Rolle konnte nicht gespeichert werden.']);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={roll ? 'Rolle bearbeiten' : duplicateFrom ? 'Rolle kopieren' : 'Rolle hinzufuegen'}
      subtitle={
        roll
          ? 'Bestand, Status und Standort aktualisieren.'
          : duplicateFrom
            ? 'Werte übernommen - Gewicht, Kaufdatum und Käufer prüfen.'
            : 'Neue Filamentrolle für die Gruppe erfassen.'
      }
      onClose={onClose}
      size="wide"
    >
      <form className="form-grid" onSubmit={handleSubmit}>
        {errors.length ? (
          <div className="form-error form-grid-full">
            {errors.map((error) => (
              <div key={error}>{error}</div>
            ))}
          </div>
        ) : null}

        <label>
          Hersteller
          <input value={values.manufacturer} onChange={(event) => update('manufacturer', event.target.value)} />
        </label>

        <label>
          Material
          <input
            value={values.material}
            onChange={(event) => update('material', event.target.value)}
            placeholder="z. B. PLA, PETG oder eigene Bezeichnung"
            list="material-suggestions"
          />
          <datalist id="material-suggestions">
            {MATERIALS.map((material) => (
              <option key={material} value={material} />
            ))}
          </datalist>
        </label>

        <label>
          Farbe
          <input value={values.color} onChange={(event) => update('color', event.target.value)} />
        </label>

        <MaterialProfileCard
          className="form-grid-full"
          material={values.material}
          color={values.color}
          notes={values.notes}
          variant="compact"
        />

        <label>
          Status
          <select value={values.status} onChange={(event) => update('status', event.target.value as RollFormValues['status'])}>
            {ROLL_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <label>
          Ursprungsgewicht in g
          <input
            type="number"
            min="1"
            value={values.original_weight_g}
            onChange={(event) => update('original_weight_g', Number(event.target.value))}
          />
        </label>

        <label>
          Restgewicht in g
          <input
            type="number"
            min="0"
            value={values.remaining_weight_g}
            onChange={(event) => update('remaining_weight_g', Number(event.target.value))}
          />
        </label>

        <label>
          Kaufdatum
          <input type="date" value={values.purchase_date} onChange={(event) => update('purchase_date', event.target.value)} />
        </label>

        <label>
          Preis in EUR
          <input
            type="number"
            min="0"
            step="0.01"
            value={values.price}
            onChange={(event) => update('price', Number(event.target.value))}
          />
        </label>

        <label>
          Käufer
          <select value={values.buyer_id} onChange={(event) => update('buyer_id', event.target.value)}>
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.full_name || profile.email}
              </option>
            ))}
          </select>
        </label>

        <label>
          Lagerort
          <input value={values.storage_location} onChange={(event) => update('storage_location', event.target.value)} />
        </label>

        <label className="form-grid-full">
          Notizen
          <textarea value={values.notes} onChange={(event) => update('notes', event.target.value)} rows={3} />
        </label>

        <div className="form-summary form-grid-full">
          <span>Preis pro Gramm</span>
          <strong>{pricePerGram.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 4 })}</strong>
        </div>

        <div className="modal-actions form-grid-full">
          <button type="button" className="ghost-button" onClick={onClose}>
            Abbrechen
          </button>
          <button type="submit" className="primary-button" disabled={submitting}>
            <Save size={17} />
            {submitting ? 'Speichert' : 'Speichern'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
