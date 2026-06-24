import { Link } from 'react-router-dom';
import { Edit3, QrCode, Search, Scale, Trash2, Weight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { displayName, formatCurrency, formatDate, formatGrams } from '../lib/format';
import { FilamentRoll, FilamentUsage, MATERIALS } from '../types';

type RollsPageProps = {
  rolls: FilamentRoll[];
  usage: FilamentUsage[];
  onEdit: (roll: FilamentRoll) => void;
  onMarkEmpty: (roll: FilamentRoll) => void;
  onDelete: (roll: FilamentRoll) => Promise<boolean> | boolean;
  onAddUsage: (rollId?: string) => void;
};

const statusFilters = [
  { value: 'alle', label: 'Alle' },
  { value: 'aktiv', label: 'Aktiv' },
  { value: 'reserviert', label: 'Reserviert' },
  { value: 'niedrig', label: 'Niedrig' },
  { value: 'leer', label: 'Leer' }
];

function statusLabel(roll: FilamentRoll) {
  if (roll.status === 'leer') return 'Leer';
  if (roll.remaining_weight_g < 150) return 'Niedrig';
  if (roll.status === 'reserviert') return 'Reserviert';
  return 'Aktiv';
}

function statusClass(roll: FilamentRoll) {
  return statusLabel(roll).toLowerCase();
}

function remainingPercent(roll: FilamentRoll) {
  return Math.max(0, Math.min(100, (roll.remaining_weight_g / roll.original_weight_g) * 100));
}

export function RollsPage({ rolls, usage, onEdit, onMarkEmpty, onDelete, onAddUsage }: RollsPageProps) {
  const [query, setQuery] = useState('');
  const [material, setMaterial] = useState('alle');
  const [status, setStatus] = useState('alle');
  const [selectedRollId, setSelectedRollId] = useState<string | null>(rolls[0]?.id || null);

  const usageByRoll = useMemo(() => {
    const map = new Map<string, FilamentUsage[]>();
    usage.forEach((entry) => {
      map.set(entry.roll_id, [...(map.get(entry.roll_id) || []), entry]);
    });
    return map;
  }, [usage]);

  const filteredRolls = useMemo(() => {
    return rolls.filter((roll) => {
      const searchable = `${roll.manufacturer} ${roll.material} ${roll.color} ${roll.storage_location}`.toLowerCase();
      const matchesQuery = searchable.includes(query.toLowerCase());
      const matchesMaterial = material === 'alle' || roll.material === material;
      const matchesStatus =
        status === 'alle' ||
        roll.status === status ||
        (status === 'niedrig' && roll.status !== 'leer' && roll.remaining_weight_g < 150);
      return matchesQuery && matchesMaterial && matchesStatus;
    });
  }, [material, query, rolls, status]);

  useEffect(() => {
    if (!filteredRolls.length) {
      setSelectedRollId(null);
      return;
    }

    if (!selectedRollId || !filteredRolls.some((roll) => roll.id === selectedRollId)) {
      setSelectedRollId(filteredRolls[0].id);
    }
  }, [filteredRolls, selectedRollId]);

  const selectedRoll = filteredRolls.find((roll) => roll.id === selectedRollId) || filteredRolls[0] || null;
  const selectedUsage = selectedRoll ? usageByRoll.get(selectedRoll.id) || [] : [];
  const activeFilterCount = [material !== 'alle', status !== 'alle', Boolean(query.trim())].filter(Boolean).length;

  return (
    <section className="page-stack rolls-page">
      <div className="page-title-row">
        <div>
          <h2>Filamentrollen</h2>
          <p>{filteredRolls.length} von {rolls.length} Rollen angezeigt.</p>
        </div>
        <span className="toolbar-count">{activeFilterCount ? `${activeFilterCount} Filter aktiv` : 'Alle Rollen'}</span>
      </div>

      <div className="filter-panel">
        <label className="search-field">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Suchen" />
        </label>

        <div className="chip-row" aria-label="Materialfilter">
          <button type="button" className={material === 'alle' ? 'filter-chip active' : 'filter-chip'} onClick={() => setMaterial('alle')}>
            Alle
          </button>
          {MATERIALS.map((item) => (
            <button
              type="button"
              value={item}
              key={item}
              className={material === item ? 'filter-chip active' : 'filter-chip'}
              onClick={() => setMaterial(item)}
            >
              <span className="material-dot mini" data-material={item} />
              {item}
            </button>
          ))}
        </div>

        <div className="chip-row" aria-label="Statusfilter">
          {statusFilters.map((item) => (
            <button
              type="button"
              key={item.value}
              className={status === item.value ? 'filter-chip active' : 'filter-chip'}
              onClick={() => setStatus(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rolls-workspace">
        <div className="roll-list-panel">
          {filteredRolls.length ? (
            filteredRolls.map((roll) => {
              const isSelected = selectedRoll?.id === roll.id;
              const rollUsage = usageByRoll.get(roll.id) || [];
              return (
                <button
                  type="button"
                  className={isSelected ? 'roll-list-item selected' : 'roll-list-item'}
                  key={roll.id}
                  onClick={() => setSelectedRollId(roll.id)}
                >
                  <span className="material-dot" data-material={roll.material} />
                  <div>
                    <strong>{roll.manufacturer} - {roll.color}</strong>
                    <small>{roll.material} - {roll.storage_location} - {rollUsage.length} Verbräuche</small>
                    <span className="micro-gauge">
                      <i style={{ width: `${remainingPercent(roll)}%` }} />
                    </span>
                  </div>
                  <em>{formatGrams(roll.remaining_weight_g)}</em>
                </button>
              );
            })
          ) : (
            <div className="empty-state">Keine Rolle passt zu den Filtern.</div>
          )}
        </div>

        {selectedRoll ? (
          <aside className="roll-inspector">
            <div className="roll-inspector-head">
              <span className="spool-orb" data-material={selectedRoll.material}>
                <i>{selectedRoll.material}</i>
              </span>
              <div>
                <h3>{selectedRoll.manufacturer}</h3>
                <p>{selectedRoll.color} - {selectedRoll.storage_location}</p>
              </div>
              <span className={`status-chip status-${statusClass(selectedRoll)}`}>{statusLabel(selectedRoll)}</span>
            </div>

            <div className="remaining-ring" style={{ '--remaining': `${remainingPercent(selectedRoll) * 3.6}deg` } as CSSProperties}>
              <strong>{formatGrams(selectedRoll.remaining_weight_g)}</strong>
              <span>von {formatGrams(selectedRoll.original_weight_g)}</span>
            </div>

            <div className="inspector-grid">
              <div>
                <span>Kauf</span>
                <strong>{formatCurrency(selectedRoll.price)}</strong>
              </div>
              <div>
                <span>Käufer</span>
                <strong>{displayName(selectedRoll.buyer)}</strong>
              </div>
              <div>
                <span>Gekauft</span>
                <strong>{formatDate(selectedRoll.purchase_date)}</strong>
              </div>
              <div>
                <span>Verbrauch</span>
                <strong>{selectedUsage.length} Einträge</strong>
              </div>
            </div>

            <div className="detail-actions">
              <button type="button" className="primary-button" onClick={() => onAddUsage(selectedRoll.id)} disabled={selectedRoll.status === 'leer'}>
                <Scale size={17} />
                Schnellverbrauch
              </button>
              <button type="button" className="secondary-button" onClick={() => onEdit(selectedRoll)}>
                <Edit3 size={17} />
                Bearbeiten
              </button>
              <Link to={`/rolls/${selectedRoll.id}`} className="secondary-button">
                <QrCode size={17} />
                QR
              </Link>
            </div>

            <div className="inspector-foot">
              <button type="button" className="ghost-button" onClick={() => onMarkEmpty(selectedRoll)} disabled={selectedRoll.status === 'leer'}>
                <Weight size={16} />
                Als leer markieren
              </button>
              <button type="button" className="ghost-button danger" onClick={() => onDelete(selectedRoll)}>
                <Trash2 size={16} />
                Löschen
              </button>
            </div>
          </aside>
        ) : null}
      </div>

      <div className="roll-card-list">
        {filteredRolls.map((roll) => (
          <article className="roll-card compact-roll-card" key={roll.id}>
            <div className="roll-card-head">
              <Link to={`/rolls/${roll.id}`} className="roll-link">
                <span className="material-dot" data-material={roll.material} />
                <div>
                  <strong>{roll.manufacturer}</strong>
                  <small>{roll.material} - {roll.color}</small>
                </div>
              </Link>
              <span className={`status-chip status-${statusClass(roll)}`}>{statusLabel(roll)}</span>
            </div>

            <div className="roll-card-gauge">
              <div>
                <span>Rest</span>
                <strong>{formatGrams(roll.remaining_weight_g)}</strong>
              </div>
              <span className="micro-gauge">
                <i style={{ width: `${remainingPercent(roll)}%` }} />
              </span>
            </div>

            <div className="roll-card-meta">
              <span>{formatCurrency(roll.price)}</span>
              <span>{roll.storage_location}</span>
              <span>{displayName(roll.buyer)}</span>
            </div>

            <div className="row-actions">
              <button type="button" className="primary-button compact" onClick={() => onAddUsage(roll.id)} disabled={roll.status === 'leer'}>
                <Scale size={15} />
                Verbrauch
              </button>
              <button type="button" className="secondary-button compact" onClick={() => onEdit(roll)}>
                <Edit3 size={15} />
                Edit
              </button>
              <Link to={`/rolls/${roll.id}`} className="secondary-button compact">
                <QrCode size={15} />
                QR
              </Link>
              <button type="button" className="ghost-button compact danger" onClick={() => onDelete(roll)}>
                <Trash2 size={15} />
                Löschen
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
