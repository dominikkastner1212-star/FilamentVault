import { buildSettlementRows } from '../lib/analytics';
import { displayName, formatCurrency, formatGrams } from '../lib/format';
import { FilamentRoll, FilamentUsage, Profile } from '../types';

type CostsPageProps = {
  profiles: Profile[];
  rolls: FilamentRoll[];
  usage: FilamentUsage[];
};

export function CostsPage({ profiles, rolls, usage }: CostsPageProps) {
  const rows = buildSettlementRows(profiles, rolls, usage);
  const max = Math.max(...rows.flatMap((row) => [row.purchased, row.consumedCost]), 1);

  return (
    <section className="page-stack">
      <div className="page-title-row">
        <div>
          <h2>Kostenuebersicht</h2>
          <p>Gekauft, verbraucht und offene Ausgleichsbetraege pro Person.</p>
        </div>
      </div>

      <div className="settlement-grid">
        {rows.map((row) => (
          <article className="settlement-card" key={row.profile.id}>
            <div className="person-row">
              <span>{displayName(row.profile).slice(0, 1).toUpperCase()}</span>
              <div>
                <strong>{displayName(row.profile)}</strong>
                <small>{row.balance >= 0 ? 'bekommt Ausgleich' : 'zahlt Ausgleich'}</small>
              </div>
              <em className={row.balance >= 0 ? 'positive' : 'negative'}>{formatCurrency(Math.abs(row.balance))}</em>
            </div>
            <div className="mini-bars">
              <div>
                <label>Gekauft</label>
                <span>
                  <i style={{ width: `${Math.max(3, (row.purchased / max) * 100)}%` }} />
                </span>
                <strong>{formatCurrency(row.purchased)}</strong>
              </div>
              <div>
                <label>Verbraucht</label>
                <span>
                  <i style={{ width: `${Math.max(3, (row.consumedCost / max) * 100)}%` }} />
                </span>
                <strong>{formatCurrency(row.consumedCost)}</strong>
              </div>
            </div>
            <div className="settlement-foot">
              <span>{formatGrams(row.usedWeight)}</span>
              <span>Preis pro Gramm aus der jeweiligen Rolle</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
