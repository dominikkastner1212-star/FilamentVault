import { Link } from 'react-router-dom';
import { Edit3, QrCode, Search, Trash2, Weight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { displayName, formatCurrency, formatDate, formatGrams } from '../lib/format';
import { FilamentRoll, MATERIALS } from '../types';

type RollsPageProps = {
  rolls: FilamentRoll[];
  onEdit: (roll: FilamentRoll) => void;
  onMarkEmpty: (roll: FilamentRoll) => void;
  onDelete: (roll: FilamentRoll) => void;
};

function statusLabel(roll: FilamentRoll) {
  if (roll.status === 'leer') return 'Leer';
  if (roll.remaining_weight_g < 150) return 'Niedrig';
  if (roll.status === 'reserviert') return 'Reserviert';
  return 'Aktiv';
}

export function RollsPage({ rolls, onEdit, onMarkEmpty, onDelete }: RollsPageProps) {
  const [query, setQuery] = useState('');
  const [material, setMaterial] = useState('alle');
  const [status, setStatus] = useState('alle');

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

  return (
    <section className="page-stack">
      <div className="page-title-row">
        <div>
          <h2>Filamentrollen</h2>
          <p>{filteredRolls.length} von {rolls.length} Rollen angezeigt.</p>
        </div>
      </div>

      <div className="filter-bar">
        <label className="search-field">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Suchen" />
        </label>
        <select value={material} onChange={(event) => setMaterial(event.target.value)}>
          <option value="alle">Alle Materialien</option>
          {MATERIALS.map((item) => (
            <option value={item} key={item}>
              {item}
            </option>
          ))}
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="alle">Alle Status</option>
          <option value="aktiv">Aktiv</option>
          <option value="reserviert">Reserviert</option>
          <option value="niedrig">Niedrig</option>
          <option value="leer">Leer</option>
        </select>
      </div>

      <div className="table-panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Rolle</th>
              <th>Bestand</th>
              <th>Kauf</th>
              <th>Lagerort</th>
              <th>Status</th>
              <th aria-label="Aktionen" />
            </tr>
          </thead>
          <tbody>
            {filteredRolls.map((roll) => (
              <tr key={roll.id}>
                <td>
                  <Link to={`/rolls/${roll.id}`} className="roll-link">
                    <span className="material-dot" data-material={roll.material} />
                    <div>
                      <strong>{roll.manufacturer} · {roll.color}</strong>
                      <small>{roll.material}</small>
                    </div>
                  </Link>
                </td>
                <td>
                  <strong>{formatGrams(roll.remaining_weight_g)}</strong>
                  <small>von {formatGrams(roll.original_weight_g)}</small>
                </td>
                <td>
                  <strong>{formatCurrency(roll.price)}</strong>
                  <small>{displayName(roll.buyer)} · {formatDate(roll.purchase_date)}</small>
                </td>
                <td>{roll.storage_location}</td>
                <td>
                  <span className={`status-chip status-${statusLabel(roll).toLowerCase()}`}>{statusLabel(roll)}</span>
                </td>
                <td>
                  <div className="row-actions">
                    <Link to={`/rolls/${roll.id}`} className="icon-button" aria-label="QR-Code und Detailseite">
                      <QrCode size={16} />
                    </Link>
                    <button type="button" className="icon-button" onClick={() => onEdit(roll)} aria-label="Rolle bearbeiten">
                      <Edit3 size={16} />
                    </button>
                    <button type="button" className="icon-button" onClick={() => onMarkEmpty(roll)} aria-label="Als leer markieren">
                      <Weight size={16} />
                    </button>
                    <button type="button" className="icon-button danger" onClick={() => onDelete(roll)} aria-label="Rolle loeschen">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="roll-card-list">
          {filteredRolls.map((roll) => (
            <article className="roll-card" key={roll.id}>
              <div className="roll-card-head">
                <Link to={`/rolls/${roll.id}`} className="roll-link">
                  <span className="material-dot" data-material={roll.material} />
                  <div>
                    <strong>{roll.manufacturer}</strong>
                    <small>{roll.material} · {roll.color}</small>
                  </div>
                </Link>
                <span className={`status-chip status-${statusLabel(roll).toLowerCase()}`}>{statusLabel(roll)}</span>
              </div>
              <div className="roll-card-metrics">
                <div>
                  <span>Rest</span>
                  <strong>{formatGrams(roll.remaining_weight_g)}</strong>
                </div>
                <div>
                  <span>Kauf</span>
                  <strong>{formatCurrency(roll.price)}</strong>
                </div>
                <div>
                  <span>Lager</span>
                  <strong>{roll.storage_location}</strong>
                </div>
              </div>
              <div className="row-actions">
                <button type="button" className="secondary-button compact" onClick={() => onEdit(roll)}>
                  <Edit3 size={15} />
                  Bearbeiten
                </button>
                <Link to={`/rolls/${roll.id}`} className="secondary-button compact">
                  <QrCode size={15} />
                  QR
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
