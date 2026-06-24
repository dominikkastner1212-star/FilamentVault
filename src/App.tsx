import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AppShell } from './components/AppShell';
import { AdminPage } from './components/AdminPage';
import { AuthView } from './components/AuthView';
import { ActivityPage } from './components/ActivityPage';
import { CalculatorPage } from './components/CalculatorPage';
import { CostsPage } from './components/CostsPage';
import { DashboardPage } from './components/DashboardPage';
import { PrinterMonitoringPage } from './components/PrinterMonitoringPage';
import { RollDetailPage } from './components/RollDetailPage';
import { RollFormModal } from './components/RollFormModal';
import { RollsPage } from './components/RollsPage';
import { UsageFormModal } from './components/UsageFormModal';
import { UsagePage } from './components/UsagePage';
import { useAuth } from './hooks/useAuth';
import { useFilamentVault } from './hooks/useFilamentVault';
import { FilamentRoll, RollFormValues, UsageFormValues } from './types';

type Toast = {
  id: string;
  title: string;
  detail: string;
};

function LoadingScreen() {
  return (
    <main className="loading-screen">
      <div className="brand-mark">FV</div>
      <h1>FilamentVault</h1>
      <p>Bestand wird geladen.</p>
    </main>
  );
}

function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [location.pathname]);

  return null;
}

export default function App() {
  const auth = useAuth();
  const vault = useFilamentVault(auth.profile, auth.isDemo);
  const currentProfile = vault.profiles.find((profile) => profile.id === auth.profile?.id) || auth.profile;
  const [rollModal, setRollModal] = useState<{ roll: FilamentRoll | null; duplicateFrom?: FilamentRoll | null } | null>(
    null
  );
  const [usageRollId, setUsageRollId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  if (auth.loading) {
    return <LoadingScreen />;
  }

  if (!auth.session && !auth.isDemo) {
    return (
      <AuthView
        authMessage={auth.authMessage}
        onSignIn={auth.signIn}
        onSignUp={auth.signUp}
        onDemo={auth.startDemo}
      />
    );
  }

  function openUsage(rollId?: string) {
    setUsageRollId(rollId || '');
  }

  function showToast(title: string, detail: string) {
    const id = crypto.randomUUID();
    setToasts((items) => [...items.slice(-2), { id, title, detail }]);
    window.setTimeout(() => {
      setToasts((items) => items.filter((item) => item.id !== id));
    }, 4200);
  }

  async function submitRoll(values: RollFormValues) {
    if (rollModal?.roll) {
      await vault.updateRoll(rollModal.roll.id, values);
      showToast('Rolle aktualisiert', `${values.manufacturer} ${values.color} ist gespeichert.`);
      return;
    }

    await vault.addRoll(values);
    showToast('Rolle hinzugefügt', `${values.manufacturer} ${values.material} ist im Vault.`);
  }

  async function submitUsage(values: UsageFormValues) {
    const roll = vault.rolls.find((item) => item.id === values.roll_id);
    await vault.addUsage(values);
    showToast('Verbrauch gebucht', `${values.used_weight_g} g${roll ? ` von ${roll.manufacturer}` : ''} abgezogen.`);
  }

  async function deleteRoll(roll: FilamentRoll) {
    const confirmed = window.confirm(`${roll.manufacturer} ${roll.material} ${roll.color} löschen?`);
    if (!confirmed) {
      return false;
    }

    try {
      await vault.deleteRoll(roll);
      showToast('Rolle gelöscht', `${roll.manufacturer} ${roll.color} wurde entfernt.`);
      return true;
    } catch (deleteError) {
      showToast(
        'Rolle nicht gelöscht',
        deleteError instanceof Error ? deleteError.message : 'Bitte versuche es erneut.'
      );
      return false;
    }
  }

  function duplicateRoll(roll: FilamentRoll) {
    setRollModal({ roll: null, duplicateFrom: roll });
  }

  async function markRollEmpty(roll: FilamentRoll) {
    await vault.markRollEmpty(roll);
    showToast('Rolle geleert', `${roll.manufacturer} ${roll.color} steht jetzt auf leer.`);
  }

  return (
    <AppShell
      profile={currentProfile}
      isDemo={auth.isDemo}
      onAddRoll={() => setRollModal({ roll: null })}
      onAddUsage={() => openUsage()}
      onSignOut={() => {
        auth.signOut().catch(() => undefined);
      }}
    >
      <ScrollToTop />
      {vault.error ? <div className="form-error app-error">{vault.error}</div> : null}
      {vault.loading ? (
        <LoadingScreen />
      ) : (
        <Routes>
          <Route
            path="/"
            element={
              <DashboardPage
                profiles={vault.profiles}
                rolls={vault.rolls}
                usage={vault.usage}
                activity={vault.activity}
                onAddUsage={openUsage}
              />
            }
          />
          <Route
            path="/rolls"
            element={
              <RollsPage
                rolls={vault.rolls}
                usage={vault.usage}
                onEdit={(roll) => setRollModal({ roll })}
                onDuplicate={duplicateRoll}
                onMarkEmpty={markRollEmpty}
                onDelete={deleteRoll}
                onAddUsage={openUsage}
              />
            }
          />
          <Route
            path="/rolls/:rollId"
            element={
              <RollDetailPage
                rolls={vault.rolls}
                usage={vault.usage}
                onEdit={(roll) => setRollModal({ roll })}
                onDuplicate={duplicateRoll}
                onAddUsage={openUsage}
                onDelete={deleteRoll}
              />
            }
          />
          <Route path="/usage" element={<UsagePage usage={vault.usage} onAddUsage={() => openUsage()} />} />
          <Route path="/costs" element={<CostsPage profiles={vault.profiles} rolls={vault.rolls} usage={vault.usage} />} />
          <Route path="/printers" element={<PrinterMonitoringPage printers={vault.printers} status={vault.printerStatus} />} />
          <Route path="/calculator" element={<CalculatorPage rolls={vault.rolls} />} />
          <Route
            path="/admin"
            element={
              <AdminPage
                currentProfile={currentProfile}
                profiles={vault.profiles}
                activity={vault.activity}
                onUpdateRole={vault.updateProfileRole}
                onCreateMember={vault.createMember}
                onDeleteMember={vault.deleteMember}
              />
            }
          />
          <Route path="/activity" element={<ActivityPage activity={vault.activity} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}

      {rollModal ? (
        <RollFormModal
          roll={rollModal.roll}
          duplicateFrom={rollModal.duplicateFrom}
          profiles={vault.profiles}
          onClose={() => setRollModal(null)}
          onSubmit={submitRoll}
        />
      ) : null}

      {usageRollId !== null ? (
        <UsageFormModal
          rolls={vault.rolls}
          selectedRollId={usageRollId || null}
          onClose={() => setUsageRollId(null)}
          onSubmit={submitUsage}
        />
      ) : null}

      {toasts.length ? (
        <div className="toast-stack" aria-live="polite" aria-label="Benachrichtigungen">
          {toasts.map((toast) => (
            <div className="toast-card" key={toast.id}>
              <strong>{toast.title}</strong>
              <span>{toast.detail}</span>
            </div>
          ))}
        </div>
      ) : null}
    </AppShell>
  );
}
