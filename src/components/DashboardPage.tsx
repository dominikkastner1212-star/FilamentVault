import { Activity, AlertTriangle, Boxes, ReceiptText, Scale, TrendingUp } from 'lucide-react';
import type { CSSProperties } from 'react';
import { buildSettlementRows, lowStockRolls, materialStock, totalStock, usageCost } from '../lib/analytics';
import { filamentStyleVars } from '../lib/filamentColor';
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
  if (action === 'profile_created') {
    return 'Mitglied angelegt';
  }

  if (action === 'profile_deleted') {
    return 'Mitglied entfernt';
  }

  if (action === 'profile_role_updated') {
    return 'Benutzerrolle geändert';
  }

  const labels: Record<string, string> = {
    usage_logged: 'Verbrauch eingetragen',
    usage_updated: 'Verbrauch korrigiert',
    usage_deleted: 'Verbrauch entfernt',
    roll_created: 'Rolle hinzugefügt',
    roll_updated: 'Rolle aktualisiert',
    roll_deleted: 'Rolle gelöscht',
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
  const totalUsageCost = usage.reduce((sum, entry) => sum + usageCost(entry), 0);
  const openBalance = settlement.reduce((sum, row) => sum + Math.max(0, row.balance), 0);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const usage30 = usage.filter((entry) => new Date(entry.used_at) >= thirtyDaysAgo);
  const usage30Weight = usage30.reduce((sum, entry) => sum + entry.used_weight_g, 0);
  const materialGradient = materialRows
    .filter((row) => row.weight > 0)
    .map((row, index, rows) => {
      const start = rows.slice(0, index).reduce((sum, item) => sum + (item.weight / stock) * 100, 0);
      const end = start + (row.weight / stock) * 100;
      return `var(--mat-${row.material.toLowerCase().replace('+', 'plus')}) ${start}% ${end}%`;
    })
    .join(', ');
  const settlementLead = settlement[0];

  return (
    <div className="page-grid dashboard-cockpit">
      <section className="cockpit-hero span-12">
        <div>
          <span className="eyebrow">Live Vault</span>
          <h2>{formatKg(stock)} im gemeinsamen Bestand</h2>
          <p>{activeRolls} aktive Rollen, {low.length} kritisch, {formatGrams(usage30Weight)} Verbrauch in 30 Tagen.</p>
        </div>
        <div
          className="material-donut"
          style={{ '--donut': materialGradient || 'var(--line) 0 100%' } as CSSProperties}
          aria-label="Materialverteilung"
        >
          <strong>{formatKg(stock)}</strong>
          <span>gesamt</span>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard label="Gesamtbestand" value={formatKg(stock)} detail={`${activeRolls} aktive Rollen`} icon={Boxes} />
        <StatCard
          label="Niedriger Bestand"
          value={String(low.length)}
          detail="unter 150 g Restgewicht"
          icon={AlertTriangle}
        />
        <StatCard label="Verbrauch" value={formatGrams(totalUsage)} detail={`${usage.length} Einträge`} icon={Scale} />
        <StatCard label="Ausgaben" value={formatCurrency(totalSpend)} detail={`${formatCurrency(openBalance)} offen`} icon={ReceiptText} />
      </section>

      <section className="panel span-7">
        <div className="panel-header">
          <div>
            <h2>Bestand nach Material</h2>
            <p>Aktive und reservierte Rollen, leere Rollen ausgenommen.</p>
          </div>
        </div>
        <div className="material-list material-list-rich">
          {materialRows.map((row) => (
            <div className="material-row" key={row.material}>
              <div>
                <span className="material-dot mini" data-material={row.material} />
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

      <section className="panel span-5 cockpit-side">
        <div className="panel-header">
          <div>
            <h2>30-Tage-Puls</h2>
            <p>Kosten und Verbrauch der letzten Druckphase.</p>
          </div>
          <TrendingUp size={18} />
        </div>
        <div className="pulse-grid">
          <div>
            <span>Verbrauch</span>
            <strong>{formatGrams(usage30Weight)}</strong>
          </div>
          <div>
            <span>Kosten</span>
            <strong>{formatCurrency(usage30.reduce((sum, entry) => sum + usageCost(entry), 0))}</strong>
          </div>
          <div>
            <span>Gesamt-Kosten</span>
            <strong>{formatCurrency(totalUsageCost)}</strong>
          </div>
          <div>
            <span>Ausgleich</span>
            <strong>{settlementLead ? `${displayName(settlementLead.profile)} ${settlementLead.balance >= 0 ? '+' : ''}${formatCurrency(settlementLead.balance)}` : '-'}</strong>
          </div>
        </div>
      </section>

      <section className="panel span-5">
        <div className="panel-header">
          <div>
            <h2>Kritische Rollen</h2>
            <p>Ein Tap öffnet den Schnellverbrauch.</p>
          </div>
        </div>
        <div className="compact-list critical-list">
          {low.length ? (
            low.slice(0, 5).map((roll) => (
              <button
                type="button"
                key={roll.id}
                className="compact-row actionable"
                style={filamentStyleVars(roll.color) as CSSProperties}
                onClick={() => onAddUsage(roll.id)}
              >
                <span className="filament-spool small" aria-hidden="true" />
                <div>
                  <strong>{roll.manufacturer} - {roll.color}</strong>
                  <small>{roll.material} - {roll.storage_location}</small>
                </div>
                <em>{formatGrams(roll.remaining_weight_g)}</em>
              </button>
            ))
          ) : (
            <div className="empty-state">Keine Rolle liegt unter dem Grenzwert.</div>
          )}
        </div>
      </section>

      <section className="panel span-7">
        <div className="panel-header">
          <div>
            <h2>Ausgleich pro Person</h2>
            <p>Gekauft, verbraucht und daraus entstehender Saldo.</p>
          </div>
        </div>
        <div className="settlement-mini-list">
          {settlement.map((row) => (
            <div className="settlement-mini-row" key={row.profile.id}>
              <span>{displayName(row.profile).slice(0, 1).toUpperCase()}</span>
              <div>
                <strong>{displayName(row.profile)}</strong>
                <small>{formatCurrency(row.purchased)} gekauft - {formatGrams(row.usedWeight)} verbraucht</small>
              </div>
              <em>{row.balance >= 0 ? '+' : ''}{formatCurrency(row.balance)}</em>
            </div>
          ))}
        </div>
      </section>

      <section className="panel span-12">
        <div className="panel-header">
          <div>
            <h2>Letzte Aktivitäten</h2>
            <p>Nachvollziehbare Änderungen an Rollen und Verbräuchen.</p>
          </div>
          <Activity size={18} />
        </div>
        <div className="activity-strip">
          {activity.slice(0, 6).map((entry) => (
            <article key={entry.id} className="activity-card">
              <span>{actionLabel(entry.action)}</span>
              <strong>{displayName(entry.actor)}</strong>
              <p>
                {String(
                  entry.metadata.project_name ||
                    entry.metadata.roll ||
                    entry.metadata.profile ||
                    entry.metadata.status ||
                    'Bestand aktualisiert'
                )}
              </p>
              <small>{formatDateTime(entry.created_at)}</small>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
