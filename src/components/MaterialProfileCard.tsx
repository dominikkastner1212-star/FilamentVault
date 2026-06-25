import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { detectAbrasiveMaterial, getMaterialProfile } from '../lib/materialProfiles';
import type { MaterialProfileRecord } from '../types';

type MaterialProfileCardProps = {
  material: string;
  color?: string | null;
  notes?: string | null;
  syncedProfiles?: MaterialProfileRecord[];
  variant?: 'compact' | 'full';
  className?: string;
};

function formatNumber(value: number | null, suffix = '') {
  if (value === null || value === undefined) return null;
  return `${value.toLocaleString('de-DE', { maximumFractionDigits: 2 })}${suffix}`;
}

function formatTemperature(min: number | null, max: number | null) {
  if (min === null && max === null) return null;
  if (min !== null && max !== null && min !== max) return `${min}-${max} C`;
  return `${min ?? max} C`;
}

function formatSyncDate(value: string | null) {
  if (!value) return 'lokaler Fallback';
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' }).format(new Date(value));
}

export function MaterialProfileCard({
  material,
  color,
  notes,
  syncedProfiles = [],
  variant = 'full',
  className = ''
}: MaterialProfileCardProps) {
  const profile = getMaterialProfile(material, syncedProfiles);
  const abrasive = detectAbrasiveMaterial({ material, color, notes });
  const compact = variant === 'compact';
  const synced = profile.synced;
  const technicalValues = [
    ['Dichte', formatNumber(synced?.density_g_cm3 ?? null, ' g/cm3')],
    ['Flow', formatNumber(synced?.flow_ratio ?? null)],
    ['Duese', formatTemperature(synced?.nozzle_temp_min ?? null, synced?.nozzle_temp_max ?? null)],
    ['Bett', formatTemperature(synced?.bed_temp_min ?? null, synced?.bed_temp_max ?? null)],
    ['Volumetric', formatNumber(synced?.volumetric_speed ?? null, ' mm3/s')],
    ['Profilpreis', formatNumber(synced?.filament_cost ?? null, ' /kg')]
  ].filter((item): item is [string, string] => Boolean(item[1]));

  return (
    <section className={`material-profile-card material-profile-${variant} ${className}`.trim()}>
      <div className="material-profile-head">
        <div>
          <span>Materialprofil</span>
          <h3>{profile.label}</h3>
        </div>
        <span className={abrasive.isAbrasive ? 'abrasive-chip abrasive-chip-warning' : 'abrasive-chip'}>
          {abrasive.isAbrasive ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
          {abrasive.label}
        </span>
      </div>

      {synced ? (
        <div className="material-source-row">
          <span>Quelle: {synced.source_name}</span>
          <span>Stand: {formatSyncDate(synced.synced_at)}</span>
        </div>
      ) : (
        <div className="material-source-row">
          <span>Lokaler Fallback</span>
          <span>Online-Sync noch nicht geladen</span>
        </div>
      )}

      <div className="material-profile-grid">
        <div>
          <strong>Anwendungsbereiche</strong>
          <div className="profile-tags">
            {profile.applications.slice(0, compact ? 4 : profile.applications.length).map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>

        <div>
          <strong>Eigenschaften</strong>
          <ul>
            {profile.properties.slice(0, compact ? 4 : profile.properties.length).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        {!compact && technicalValues.length ? (
          <div>
            <strong>Online-Werte</strong>
            <dl className="technical-profile-list">
              {technicalValues.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}

        {!compact ? (
          <div>
            <strong>Druckhinweise</strong>
            <ul>
              {profile.printNotes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {compact && technicalValues.length ? (
        <div className="technical-profile-strip">
          {technicalValues.slice(0, 3).map(([label, value]) => (
            <span key={label}>
              {label}: {value}
            </span>
          ))}
        </div>
      ) : null}

      <p>{abrasive.hint}</p>
    </section>
  );
}
