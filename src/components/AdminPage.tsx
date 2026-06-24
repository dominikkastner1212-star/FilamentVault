import { ShieldCheck, Shield, UsersRound } from 'lucide-react';
import { useState } from 'react';
import { displayName, formatDateTime } from '../lib/format';
import { ActivityLog, AppRole, Profile } from '../types';

type AdminPageProps = {
  currentProfile: Profile | null;
  profiles: Profile[];
  activity: ActivityLog[];
  onUpdateRole: (profileId: string, role: AppRole) => Promise<void>;
};

const roleCopy: Record<AppRole, { label: string; detail: string }> = {
  admin: {
    label: 'Admin',
    detail: 'Kann Rollen verwalten und Systemeinstellungen ändern.'
  },
  member: {
    label: 'Mitglied',
    detail: 'Kann Bestand sehen, Rollen pflegen und Verbrauch buchen.'
  }
};

export function AdminPage({ currentProfile, profiles, activity, onUpdateRole }: AdminPageProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = currentProfile?.role === 'admin';
  const adminCount = profiles.filter((profile) => profile.role === 'admin').length;
  const roleActivity = activity.filter((item) => item.action === 'profile_role_updated').slice(0, 6);

  async function changeRole(profile: Profile, role: AppRole) {
    if (role === profile.role) return;
    setBusyId(profile.id);
    setError(null);
    try {
      await onUpdateRole(profile.id, role);
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : 'Rolle konnte nicht geändert werden.');
    } finally {
      setBusyId(null);
    }
  }

  if (!isAdmin) {
    return (
      <section className="page-stack">
        <div className="access-denied-panel">
          <Shield size={36} />
          <div>
            <h2>Admin-Bereich</h2>
            <p>Dieser Bereich ist nur für Admins sichtbar. Deine aktuelle Rolle ist Mitglied.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page-stack admin-page">
      <div className="admin-hero">
        <div>
          <span className="eyebrow">Benutzerrollen</span>
          <h2>Teamzugriff sauber steuern.</h2>
          <p>Admins verwalten Rollen direkt in FilamentVault. Rollenänderungen werden im Activity-Log festgehalten.</p>
        </div>
        <div className="admin-summary-grid" aria-label="Rollenübersicht">
          <div>
            <ShieldCheck size={18} />
            <strong>{adminCount}</strong>
            <span>Admins</span>
          </div>
          <div>
            <UsersRound size={18} />
            <strong>{profiles.length - adminCount}</strong>
            <span>Mitglieder</span>
          </div>
        </div>
      </div>

      {error ? <div className="form-error">{error}</div> : null}

      <div className="admin-layout">
        <section className="panel admin-users-panel">
          <div className="panel-header">
            <div>
              <h2>Mitglieder</h2>
              <p>Neue Registrierungen starten automatisch als Mitglied.</p>
            </div>
          </div>
          <div className="admin-user-list">
            {profiles.map((profile) => {
              const isSelf = profile.id === currentProfile?.id;
              return (
                <article className="admin-user-card" key={profile.id}>
                  <span className="admin-avatar">{displayName(profile).slice(0, 1).toUpperCase()}</span>
                  <div>
                    <div className="admin-user-title">
                      <strong>{displayName(profile)}</strong>
                      {isSelf ? <em>Du</em> : null}
                    </div>
                    <small>{profile.email || 'Keine E-Mail'}</small>
                    <p>{roleCopy[profile.role].detail}</p>
                  </div>
                  <div className="role-control">
                    <span className={`role-pill role-${profile.role}`}>{roleCopy[profile.role].label}</span>
                    <select
                      value={profile.role}
                      disabled={busyId === profile.id || isSelf}
                      onChange={(event) => changeRole(profile, event.target.value as AppRole)}
                      aria-label={`Rolle für ${displayName(profile)}`}
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Mitglied</option>
                    </select>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <aside className="admin-side">
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Rechte</h2>
                <p>Aktuelles Zugriffskonzept der App.</p>
              </div>
            </div>
            <div className="permission-list">
              <div>
                <strong>Admin</strong>
                <span>Rollen verwalten, Einstellungen vorbereiten, normale Vault-Aktionen nutzen.</span>
              </div>
              <div>
                <strong>Mitglied</strong>
                <span>Bestand, Verbrauch, Kosten und Kalkulator nutzen.</span>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Letzte Rollenänderungen</h2>
                <p>Aus dem Activity-Log.</p>
              </div>
            </div>
            <div className="admin-activity-list">
              {roleActivity.length ? (
                roleActivity.map((entry) => (
                  <div key={entry.id}>
                    <strong>{String(entry.metadata.profile || 'Profil')}</strong>
                    <span>
                      {String(entry.metadata.old_role || '-')} → {String(entry.metadata.new_role || '-')}
                    </span>
                    <small>{formatDateTime(entry.created_at)}</small>
                  </div>
                ))
              ) : (
                <div className="empty-state">Noch keine Rollenänderung vorhanden.</div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
