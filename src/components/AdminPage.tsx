import { KeyRound, Mail, ShieldCheck, Shield, Trash2, UserPlus, UsersRound } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { displayName, formatDateTime } from '../lib/format';
import { ActivityLog, AppRole, MemberFormValues, Profile } from '../types';

type AdminPageProps = {
  currentProfile: Profile | null;
  profiles: Profile[];
  activity: ActivityLog[];
  onUpdateRole: (profileId: string, role: AppRole) => Promise<void>;
  onCreateMember: (values: MemberFormValues) => Promise<void>;
  onDeleteMember: (profile: Profile) => Promise<void>;
};

const roleCopy: Record<AppRole, { label: string; detail: string }> = {
  admin: {
    label: 'Admin',
    detail: 'Kann Mitglieder anlegen, entfernen, Rollen verwalten und Systemeinstellungen ändern.'
  },
  member: {
    label: 'Mitglied',
    detail: 'Kann Bestand sehen, Rollen pflegen, Verbrauch buchen und Kalkulator nutzen.'
  }
};

const emptyMemberValues: MemberFormValues = {
  email: '',
  full_name: '',
  password: '',
  role: 'member'
};

export function AdminPage({
  currentProfile,
  profiles,
  activity,
  onUpdateRole,
  onCreateMember,
  onDeleteMember
}: AdminPageProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null);
  const [createBusy, setCreateBusy] = useState(false);
  const [memberValues, setMemberValues] = useState<MemberFormValues>(emptyMemberValues);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = currentProfile?.role === 'admin';
  const adminCount = profiles.filter((profile) => profile.role === 'admin').length;
  const roleActivity = activity
    .filter((item) => ['profile_role_updated', 'profile_created', 'profile_deleted'].includes(item.action))
    .slice(0, 6);

  function setMemberField<K extends keyof MemberFormValues>(key: K, value: MemberFormValues[K]) {
    setError(null);
    setMemberValues((current) => ({ ...current, [key]: value }));
  }

  async function submitMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!memberValues.email.trim() || !memberValues.full_name.trim()) {
      setError('E-Mail und Name sind erforderlich.');
      return;
    }

    if (memberValues.password.length < 8) {
      setError('Das Passwort muss mindestens 8 Zeichen lang sein.');
      return;
    }

    setCreateBusy(true);
    setError(null);
    try {
      await onCreateMember(memberValues);
      setMemberValues(emptyMemberValues);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Mitglied konnte nicht angelegt werden.');
    } finally {
      setCreateBusy(false);
    }
  }

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

  async function removeMember(profile: Profile) {
    const confirmed = window.confirm(
      `${displayName(profile)} komplett entfernen? Historische Rollen und Verbräuche werden deinem Admin-Konto zugeordnet.`
    );
    if (!confirmed) return;

    setDeleteBusyId(profile.id);
    setError(null);
    try {
      await onDeleteMember(profile);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Mitglied konnte nicht entfernt werden.');
    } finally {
      setDeleteBusyId(null);
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
          <p>
            Admins verwalten Konten und Rollen direkt in FilamentVault. Jede Änderung wird im Activity-Log
            festgehalten.
          </p>
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
              <p>Mitglieder können angelegt, entfernt und mit Rollen versehen werden.</p>
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
                  <div className="role-control admin-user-actions">
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
                    {!isSelf ? (
                      <button
                        type="button"
                        className="danger-button"
                        disabled={deleteBusyId === profile.id || busyId === profile.id}
                        onClick={() => removeMember(profile)}
                      >
                        <Trash2 size={15} />
                        {deleteBusyId === profile.id ? 'Entferne...' : 'Entfernen'}
                      </button>
                    ) : null}
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
                <h2>Mitglied hinzufügen</h2>
                <p>Admin legt Konto, Passwort und Rolle direkt an.</p>
              </div>
              <UserPlus size={18} />
            </div>
            <form className="admin-create-form" onSubmit={submitMember}>
              <label>
                E-Mail
                <span className="input-with-icon">
                  <Mail size={15} />
                  <input
                    type="email"
                    value={memberValues.email}
                    onChange={(event) => setMemberField('email', event.target.value)}
                    placeholder="name@firma.de"
                    autoComplete="email"
                    required
                  />
                </span>
              </label>
              <label>
                Name
                <input
                  value={memberValues.full_name}
                  onChange={(event) => setMemberField('full_name', event.target.value)}
                  placeholder="Vorname Nachname"
                  autoComplete="name"
                  required
                />
              </label>
              <label>
                Passwort
                <span className="input-with-icon">
                  <KeyRound size={15} />
                  <input
                    type="password"
                    value={memberValues.password}
                    onChange={(event) => setMemberField('password', event.target.value)}
                    placeholder="Mindestens 8 Zeichen"
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </span>
              </label>
              <label>
                Rolle
                <select value={memberValues.role} onChange={(event) => setMemberField('role', event.target.value as AppRole)}>
                  <option value="member">Mitglied</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <button type="submit" className="primary-button full" disabled={createBusy}>
                <UserPlus size={16} />
                {createBusy ? 'Lege an...' : 'Mitglied anlegen'}
              </button>
            </form>
          </section>

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
                <span>Mitglieder anlegen, entfernen, Rollen verwalten und normale Vault-Aktionen nutzen.</span>
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
                <h2>Letzte Admin-Aktionen</h2>
                <p>Aus dem Activity-Log.</p>
              </div>
            </div>
            <div className="admin-activity-list">
              {roleActivity.length ? (
                roleActivity.map((entry) => (
                  <div key={entry.id}>
                    <strong>{String(entry.metadata.profile || 'Profil')}</strong>
                    <span>{activityCopy(entry)}</span>
                    <small>{formatDateTime(entry.created_at)}</small>
                  </div>
                ))
              ) : (
                <div className="empty-state">Noch keine Admin-Aktion vorhanden.</div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

function activityCopy(entry: ActivityLog) {
  if (entry.action === 'profile_created') {
    return `angelegt als ${String(entry.metadata.role || 'member')}`;
  }

  if (entry.action === 'profile_deleted') {
    return `entfernt (${String(entry.metadata.role || '-')})`;
  }

  return `${String(entry.metadata.old_role || '-')} -> ${String(entry.metadata.new_role || '-')}`;
}
