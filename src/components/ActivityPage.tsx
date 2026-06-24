import { displayName, formatDateTime, formatGrams } from '../lib/format';
import { ActivityLog } from '../types';

type ActivityPageProps = {
  activity: ActivityLog[];
};

function readableAction(action: string) {
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

export function ActivityPage({ activity }: ActivityPageProps) {
  return (
    <section className="page-stack">
      <div className="page-title-row">
        <div>
          <h2>Letzte Aktivitäten</h2>
          <p>Audit-Log für Rollen, Verbrauch und Profilereignisse.</p>
        </div>
      </div>

      <div className="timeline">
        {activity.map((entry) => (
          <article className="timeline-item" key={entry.id}>
            <div className="timeline-dot" />
            <div>
              <span>{formatDateTime(entry.created_at)}</span>
              <h3>{readableAction(entry.action)}</h3>
              <p>
                {displayName(entry.actor)} ·{' '}
                {String(entry.metadata.project_name || entry.metadata.roll || entry.metadata.status || entry.entity_type)}
              </p>
              {'used_weight_g' in entry.metadata ? <small>{formatGrams(Number(entry.metadata.used_weight_g))}</small> : null}
            </div>
          </article>
        ))}
        {!activity.length ? <div className="empty-state">Noch keine Aktivitäten vorhanden.</div> : null}
      </div>
    </section>
  );
}
