import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Copy, Edit3, MapPin, QrCode as QrIcon, Scale, Trash2 } from 'lucide-react';
import type { CSSProperties } from 'react';
import { MaterialProfileCard } from './MaterialProfileCard';
import { QrCode } from './QrCode';
import { filamentStyleVars } from '../lib/filamentColor';
import { getAppBaseUrl } from '../lib/supabase';
import { displayName, formatCurrency, formatDate, formatGrams } from '../lib/format';
import { FilamentRoll, FilamentUsage, MaterialProfileRecord } from '../types';

type RollDetailPageProps = {
  rolls: FilamentRoll[];
  usage: FilamentUsage[];
  materialProfiles: MaterialProfileRecord[];
  onEdit: (roll: FilamentRoll) => void;
  onDuplicate: (roll: FilamentRoll) => void;
  onAddUsage: (rollId: string) => void;
  onDelete: (roll: FilamentRoll) => Promise<boolean> | boolean;
};

function statusLabel(roll: FilamentRoll) {
  if (roll.status === 'leer') return 'Leer';
  if (roll.remaining_weight_g < 150) return 'Niedrig';
  if (roll.status === 'reserviert') return 'Reserviert';
  return 'Aktiv';
}

function statusClass(roll: FilamentRoll) {
  return statusLabel(roll).toLowerCase();
}

export function RollDetailPage({
  rolls,
  usage,
  materialProfiles,
  onEdit,
  onDuplicate,
  onAddUsage,
  onDelete
}: RollDetailPageProps) {
  const { rollId } = useParams();
  const navigate = useNavigate();
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

  const activeRoll = roll;
  const rollUsage = usage.filter((entry) => entry.roll_id === activeRoll.id);
  const detailUrl = `${getAppBaseUrl().replace(/\/$/, '')}/rolls/${activeRoll.id}`;
  const used = activeRoll.original_weight_g - activeRoll.remaining_weight_g;
  const fill = Math.max(0, Math.min(100, (activeRoll.remaining_weight_g / activeRoll.original_weight_g) * 100));
  const usageCost = rollUsage.reduce((sum, entry) => sum + entry.cost_eur, 0);

  async function deleteAndReturn() {
    const deleted = await onDelete(activeRoll);
    if (deleted) {
      navigate('/rolls', { replace: true });
    }
  }

  return (
    <section className="detail-layout detail-profile-layout">
      <div className="detail-main">
        <Link to="/rolls" className="text-link">
          <ArrowLeft size={16} />
          Rollen
        </Link>

        <div className="roll-profile-hero" style={filamentStyleVars(roll.color) as CSSProperties}>
          <div className="roll-profile-copy">
            <span className={`status-chip status-${statusClass(roll)}`}>{statusLabel(roll)}</span>
            <h2>{roll.manufacturer} - {roll.color}</h2>
            <p>
              {roll.material} in {roll.storage_location}, gekauft von {displayName(roll.buyer)}.
            </p>
            <div className="detail-actions">
              <button type="button" className="primary-button" onClick={() => onAddUsage(roll.id)} disabled={roll.status === 'leer'}>
                <Scale size={17} />
                Schnellverbrauch
              </button>
              <button type="button" className="secondary-button" onClick={() => onEdit(roll)}>
                <Edit3 size={17} />
                Bearbeiten
              </button>
              <button type="button" className="secondary-button" onClick={() => onDuplicate(roll)}>
                <Copy size={17} />
                Kopieren
              </button>
              <button type="button" className="ghost-button danger" onClick={deleteAndReturn}>
                <Trash2 size={17} />
                Löschen
              </button>
            </div>
          </div>

          <div className="roll-profile-visual">
            <span className="spool-orb large" aria-hidden="true">
              <i>{roll.material}</i>
            </span>
            <div className="remaining-ring large" style={{ '--remaining': `${fill * 3.6}deg` } as CSSProperties}>
              <strong>{formatGrams(roll.remaining_weight_g)}</strong>
              <span>{Math.round(fill)}% Rest</span>
            </div>
          </div>
        </div>

        <div className="detail-metrics detail-metrics-rich">
          <div>
            <span>Restgewicht</span>
            <strong>{formatGrams(roll.remaining_weight_g)}</strong>
          </div>
          <div>
            <span>Verbraucht</span>
            <strong>{formatGrams(used)}</strong>
          </div>
          <div>
            <span>Verbrauchskosten</span>
            <strong>{formatCurrency(usageCost)}</strong>
          </div>
          <div>
            <span>Preis pro Gramm</span>
            <strong>{formatCurrency(roll.price / roll.original_weight_g)}</strong>
          </div>
        </div>

        <MaterialProfileCard
          material={roll.material}
          color={roll.color}
          notes={roll.notes}
          syncedProfiles={materialProfiles}
        />

        <section className="panel inset-panel">
          <div className="panel-header">
            <div>
              <h3>Rollendaten</h3>
              <p>Gekauft am {formatDate(roll.purchase_date)} für {formatCurrency(roll.price)}.</p>
            </div>
            <MapPin size={18} />
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
              <p>{rollUsage.length} Einträge für diese Rolle.</p>
            </div>
          </div>
          <div className="timeline-list">
            {rollUsage.length ? (
              rollUsage.map((entry) => (
                <article className="timeline-row" key={entry.id}>
                  <span className="filament-spool small" style={filamentStyleVars(roll.color) as CSSProperties} aria-hidden="true" />
                  <div>
                    <strong>{entry.project_name}</strong>
                    <p>{displayName(entry.user)} - {entry.note || 'Keine Notiz'}</p>
                    <small>{formatDate(entry.used_at)}</small>
                  </div>
                  <em>{formatGrams(entry.used_weight_g)}</em>
                </article>
              ))
            ) : (
              <div className="empty-state">Noch kein Verbrauch für diese Rolle.</div>
            )}
          </div>
        </section>
      </div>

      <aside className="detail-side detail-side-stack">
        <section className="qr-panel">
          <QrCode value={detailUrl} label={`QR-Code für ${roll.manufacturer} ${roll.color}`} />
          <h3>QR-Schnellzugriff</h3>
          <p>Scan öffnet direkt diese Detailseite mit Schnellverbrauch.</p>
          <Link to={detailUrl.replace(getAppBaseUrl().replace(/\/$/, ''), '')} className="secondary-button compact">
            <QrIcon size={15} />
            Detailseite
          </Link>
        </section>
      </aside>
    </section>
  );
}
