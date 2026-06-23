import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Edit3, Scale } from 'lucide-react';
import { QrCode } from './QrCode';
import { getAppBaseUrl } from '../lib/supabase';
import { displayName, formatCurrency, formatDate, formatGrams } from '../lib/format';
import { FilamentRoll, FilamentUsage } from '../types';

type RollDetailPageProps = {
  rolls: FilamentRoll[];
  usage: FilamentUsage[];
  onEdit: (roll: FilamentRoll) => void;
  onAddUsage: (rollId: string) => void;
};

export function RollDetailPage({ rolls, usage, onEdit, onAddUsage }: RollDetailPageProps) {
  const { rollId } = useParams();
  const roll = rolls.find((item) => item.id === rollId);

  if (!roll) {
    return (
      <section className="panel">
        <div className="empty-state">Diese Rolle wurde nicht gefunden.</div>
        <Link to="/rolls" className="secondary-button compact">
          <ArrowLeft size={16} />
          Zurueck zu Rollen
        </Link>
      </section>
    );
  }

  const rollUsage = usage.filter((entry) => entry.roll_id === roll.id);
  const detailUrl = `${getAppBaseUrl().replace(/\/$/, '')}/rolls/${roll.id}`;
  const used = roll.original_weight_g - roll.remaining_weight_g;
  const fill = Math.max(0, Math.min(100, (roll.remaining_weight_g / roll.original_weight_g) * 100));

  return (
    <section className="detail-layout">
      <div className="detail-main">
        <Link to="/rolls" className="text-link">
          <ArrowLeft size={16} />
          Rollen
        </Link>

        <div className="detail-hero">
          <span className="material-dot large" data-material={roll.material} />
          <div>
            <h2>{roll.manufacturer} · {roll.color}</h2>
            <p>{roll.material} · {roll.storage_location}</p>
          </div>
          <span className={`status-chip status-${roll.status}`}>{roll.status}</span>
        </div>

        <div className="detail-actions">
          <button type="button" className="primary-button" onClick={() => onAddUsage(roll.id)} disabled={roll.status === 'leer'}>
            <Scale size={17} />
            Verbrauch eintragen
          </button>
          <button type="button" className="secondary-button" onClick={() => onEdit(roll)}>
            <Edit3 size={17} />
            Bearbeiten
          </button>
        </div>

        <div className="detail-metrics">
          <div>
            <span>Restgewicht</span>
            <strong>{formatGrams(roll.remaining_weight_g)}</strong>
          </div>
          <div>
            <span>Verbraucht</span>
            <strong>{formatGrams(used)}</strong>
          </div>
          <div>
            <span>Preis pro Gramm</span>
            <strong>{formatCurrency(roll.price / roll.original_weight_g)}</strong>
          </div>
          <div>
            <span>Kaeufer</span>
            <strong>{displayName(roll.buyer)}</strong>
          </div>
        </div>

        <div className="remaining-gauge" aria-label={`Restgewicht ${Math.round(fill)} Prozent`}>
          <span style={{ width: `${fill}%` }} />
        </div>

        <section className="panel inset-panel">
          <div className="panel-header">
            <div>
              <h3>Rollendaten</h3>
              <p>Gekauft am {formatDate(roll.purchase_date)} fuer {formatCurrency(roll.price)}.</p>
            </div>
          </div>
          <dl className="detail-list">
            <div>
              <dt>ID</dt>
              <dd>{roll.id}</dd>
            </div>
            <div>
              <dt>Ursprungsgewicht</dt>
              <dd>{formatGrams(roll.original_weight_g)}</dd>
            </div>
            <div>
              <dt>Lagerort</dt>
              <dd>{roll.storage_location}</dd>
            </div>
            <div>
              <dt>Notizen</dt>
              <dd>{roll.notes || 'Keine Notiz'}</dd>
            </div>
          </dl>
        </section>

        <section className="panel inset-panel">
          <div className="panel-header">
            <div>
              <h3>Verbrauchshistorie</h3>
              <p>{rollUsage.length} Eintraege fuer diese Rolle.</p>
            </div>
          </div>
          <div className="compact-list">
            {rollUsage.length ? (
              rollUsage.map((entry) => (
                <div className="compact-row" key={entry.id}>
                  <span className="material-dot" data-material={roll.material} />
                  <div>
                    <strong>{entry.project_name}</strong>
                    <small>{displayName(entry.user)} · {formatDate(entry.used_at)}</small>
                  </div>
                  <em>{formatGrams(entry.used_weight_g)}</em>
                </div>
              ))
            ) : (
              <div className="empty-state">Noch kein Verbrauch fuer diese Rolle.</div>
            )}
          </div>
        </section>
      </div>

      <aside className="detail-side">
        <section className="qr-panel">
          <QrCode value={detailUrl} label={`QR-Code fuer ${roll.manufacturer} ${roll.color}`} />
          <h3>QR-Code pro Rolle</h3>
          <p>Scan oeffnet direkt diese Detailseite mit Schnellverbrauch.</p>
        </section>
      </aside>
    </section>
  );
}
