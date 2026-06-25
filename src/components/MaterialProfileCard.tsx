import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { detectAbrasiveMaterial, getMaterialProfile } from '../lib/materialProfiles';

type MaterialProfileCardProps = {
  material: string;
  color?: string | null;
  notes?: string | null;
  variant?: 'compact' | 'full';
  className?: string;
};

export function MaterialProfileCard({
  material,
  color,
  notes,
  variant = 'full',
  className = ''
}: MaterialProfileCardProps) {
  const profile = getMaterialProfile(material);
  const abrasive = detectAbrasiveMaterial({ material, color, notes });
  const compact = variant === 'compact';

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

      <p>{abrasive.hint}</p>
    </section>
  );
}
