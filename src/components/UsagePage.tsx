import { Scale } from 'lucide-react';
import { displayName, formatCurrency, formatDate, formatGrams } from '../lib/format';
import { FilamentUsage } from '../types';

type UsagePageProps = {
  usage: FilamentUsage[];
  onAddUsage: () => void;
};

export function UsagePage({ usage, onAddUsage }: UsagePageProps) {
  return (
    <section className="page-stack">
      <div className="page-title-row">
        <div>
          <h2>Verbrauch</h2>
          <p>{usage.length} Eintraege nach Datum sortiert.</p>
        </div>
        <button type="button" className="primary-button" onClick={onAddUsage}>
          <Scale size={17} />
          Verbrauch eintragen
        </button>
      </div>

      <div className="table-panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Projekt</th>
              <th>Rolle</th>
              <th>Benutzer</th>
              <th>Verbrauch</th>
              <th>Kosten</th>
              <th>Datum</th>
            </tr>
          </thead>
          <tbody>
            {usage.map((entry) => (
              <tr key={entry.id}>
                <td>
                  <strong>{entry.project_name}</strong>
                  <small>{entry.note || 'Keine Notiz'}</small>
                </td>
                <td>
                  <strong>{entry.roll?.manufacturer || 'Rolle'} · {entry.roll?.color || ''}</strong>
                  <small>{entry.roll?.material}</small>
                </td>
                <td>{displayName(entry.user)}</td>
                <td>{formatGrams(entry.used_weight_g)}</td>
                <td>{formatCurrency(entry.cost_eur)}</td>
                <td>{formatDate(entry.used_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!usage.length ? <div className="empty-state">Noch kein Verbrauch erfasst.</div> : null}
      </div>
    </section>
  );
}
