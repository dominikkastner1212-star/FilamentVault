import { Activity, AlertTriangle, Boxes, ReceiptText, Scale } from 'lucide-react';
import { buildSettlementRows, lowStockRolls, materialStock, totalStock } from '../lib/analytics';
import { displayName, formatCurrency, formatDateTime, formatGrams, formatKg } from '../lib/format';
import { ActivityLog, FilamentRoll, FilamentUsage, Profile } from '../types';

type DashboardPageProps = {
  profiles: Profile[];
  rolls: FilamentRoll[];
  usage: FilamentUsage[];
  activity: ActivityLog[];
  onAddUsage: (rollId?: string) => void;
};

function StatCard({
  label,
  value,
  detail,
  icon: Icon
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Boxes;
}) {
  return (
    <article className="stat-card">
      <div className="stat-icon">
        <Icon size={20} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <p>{detail}</p>
      </div>
    </article>
  );
}

function actionLabel(action: string) {
  const labels: Record<string, string> = {
    usage_logged: 'Verbrauch eingetragen',
    usage_updated: 'Verbrauch korrigiert',
    usage_deleted: 'Verbrauch entfernt',
    roll_created: 'Rolle hinzugefuegt',
    roll_updated: 'Rolle aktualisiert',
    roll_deleted: 'Rolle geloescht',
    roll_emptied: 'Rolle als leer markiert'
  };
  return labels[action] || action;
}

export function DashboardPage({ profiles, rolls, usage, activity, onAddUsage }: DashboardPageProps) {
  const stock = totalStock(rolls);
  const activeRolls = rolls.filter((roll) => roll.status === 'aktiv').length;
  const low = lowStockRolls(rolls);
  const materialRows = materialStock(rolls);
  const maxMaterial = Math.max(...materialRows.map((row) => row.weight), 1);
  const settlement = buildSettlementRows(profiles, rolls, usage);
  const totalSpend = rolls.reduce((sum, roll) => sum + roll.price, 0);
  const totalUsage = usage.reduce((sum, entry) => sum + entry.used_weight_g, 0);
  const openBalance = settlement.reduce((sum, row) => sum + Math.max(0, row.balance), 0);

  return (
    <div className="page-grid">
      <section className="stats-grid">
        <StatCard label="Gesamtbestand" value={formatKg(stock)} detail={`${activeRolls} aktive Rollen`} icon={Boxes} />
        <StatCard
          label="Niedriger Bestand"
          value={String(low.length)}
          detail="unter 150 g Restgewicht"
          icon={AlertTriangle}
        />
        <StatCard label="Verbrauch" value={formatGrams(totalUsage)} detail={`${usage.length} Eintraege`} icon={Scale} />
        <StatCard label="Ausgaben" value={formatCurrency(totalSpend)} detail={`${formatCurrency(openBalance)} offen`} icon={ReceiptText} />
      </section>

      <section className="panel span-7">
        <div className="panel-header">
          <div>
            <h2>Bestand nach Material</h2>
            <p>Aktive und reservierte Rollen, leere Rollen ausgenommen.</p>
          </div>
        </div>
        <div className="material-list">
          {materialRows.map((row) => (
            <div className="material-row" key={row.material}>
              <div>
                <strong>{row.material}</strong>
                <span>{row.activeRolls} Rollen</span>
              </div>
              <div className="bar-track" aria-hidden="true">
                <span style={{ width: `${Math.max(4, (row.weight / maxMaterial) * 100)}%` }} />
              </div>
              <em>{formatKg(row.weight)}</em>
            </div>
          ))}
        </div>
      </section>

      <section className="panel span-5">
        <div className="panel-header">
          <div>
            <h2>Rollen mit niedrigem Bestand</h2>
            <p>Automatisch markiert unter 150 g.</p>
          </div>
        </div>
        <div className="compact-list">
          {low.length ? (
            low.slice(0, 5).map((roll) => (
              <button type="button" key={roll.id} className="compact-row actionable" onClick={() => onAddUsage(roll.id)}>
                <span className="material-dot" data-material={roll.material} />
                <div>
                  <strong>
                    {roll.manufacturer} · {roll.color}
                  </strong>
                  <small>{roll.material}</small>
                </div>
                <em>{formatGrams(roll.remaining_weight_g)}</em>
              </button>
            ))
          ) : (
            <div className="empty-state">Keine Rolle liegt unter dem Grenzwert.</div>
          )}
        </div>
      </section>

      <section className="panel span-6">
        <div className="panel-header">
          <div>
            <h2>Ausgaben pro Person</h2>
            <p>Gekaufte Rollen nach Kaeufer.</p>
          </div>
        </div>
        <div className="person-list">
          {settlement.map((row) => (
            <div className="person-row" key={row.profile.id}>
              <span>{displayName(row.profile).slice(0, 1).toUpperCase()}</span>
              <div>
                <strong>{displayName(row.profile)}</strong>
                <small>{formatCurrency(row.purchased)} gekauft</small>
              </div>
              <em>{row.balance >= 0 ? '+' : ''}{formatCurrency(row.balance)}</em>
            </div>
          ))}
        </div>
      </section>

      <section className="panel span-6">
        <div className="panel-header">
          <div>
            <h2>Verbrauch pro Person</h2>
            <p>Gramm und Kosten nach Benutzer.</p>
          </div>
        </div>
        <div className="person-list">
          {settlement.map((row) => (
            <div className="person-row" key={row.profile.id}>
              <span>{displayName(row.profile).slice(0, 1).toUpperCase()}</span>
              <div>
                <strong>{displayName(row.profile)}</strong>
                <small>{formatGrams(row.usedWeight)} verbraucht</small>
              </div>
              <em>{formatCurrency(row.consumedCost)}</em>
            </div>
          ))}
        </div>
      </section>

      <section className="panel span-12">
        <div className="panel-header">
          <div>
            <h2>Letzte Aktivitaeten</h2>
            <p>Nachvollziehbare Aenderungen an Rollen und Verbraeuchen.</p>
          </div>
          <Activity size={18} />
        </div>
        <div className="activity-strip">
          {activity.slice(0, 6).map((entry) => (
            <article key={entry.id} className="activity-card">
              <span>{actionLabel(entry.action)}</span>
              <strong>{displayName(entry.actor)}</strong>
              <p>{String(entry.metadata.project_name || entry.metadata.roll || entry.metadata.status || 'Bestand aktualisiert')}</p>
              <small>{formatDateTime(entry.created_at)}</small>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
