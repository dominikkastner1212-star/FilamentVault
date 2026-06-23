import { Navigate, Route, Routes } from 'react-router-dom';
import { useState } from 'react';
import { AppShell } from './components/AppShell';
import { AuthView } from './components/AuthView';
import { ActivityPage } from './components/ActivityPage';
import { CostsPage } from './components/CostsPage';
import { DashboardPage } from './components/DashboardPage';
import { RollDetailPage } from './components/RollDetailPage';
import { RollFormModal } from './components/RollFormModal';
import { RollsPage } from './components/RollsPage';
import { UsageFormModal } from './components/UsageFormModal';
import { UsagePage } from './components/UsagePage';
import { useAuth } from './hooks/useAuth';
import { useFilamentVault } from './hooks/useFilamentVault';
import { FilamentRoll } from './types';

function LoadingScreen() {
  return (
    <main className="loading-screen">
      <div className="brand-mark">FV</div>
      <h1>FilamentVault</h1>
      <p>Bestand wird geladen.</p>
    </main>
  );
}

export default function App() {
  const auth = useAuth();
  const vault = useFilamentVault(auth.profile, auth.isDemo);
  const [rollModal, setRollModal] = useState<{ roll: FilamentRoll | null } | null>(null);
  const [usageRollId, setUsageRollId] = useState<string | null>(null);

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

  async function deleteRoll(roll: FilamentRoll) {
    const confirmed = window.confirm(`${roll.manufacturer} ${roll.material} ${roll.color} loeschen?`);
    if (confirmed) {
      await vault.deleteRoll(roll);
    }
  }

  return (
    <AppShell
      profile={auth.profile}
      isDemo={auth.isDemo}
      onAddRoll={() => setRollModal({ roll: null })}
      onAddUsage={() => openUsage()}
      onSignOut={() => {
        auth.signOut().catch(() => undefined);
      }}
    >
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
                onEdit={(roll) => setRollModal({ roll })}
                onMarkEmpty={vault.markRollEmpty}
                onDelete={deleteRoll}
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
                onAddUsage={openUsage}
              />
            }
          />
          <Route path="/usage" element={<UsagePage usage={vault.usage} onAddUsage={() => openUsage()} />} />
          <Route path="/costs" element={<CostsPage profiles={vault.profiles} rolls={vault.rolls} usage={vault.usage} />} />
          <Route path="/activity" element={<ActivityPage activity={vault.activity} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}

      {rollModal ? (
        <RollFormModal
          roll={rollModal.roll}
          profiles={vault.profiles}
          onClose={() => setRollModal(null)}
          onSubmit={(values) => (rollModal.roll ? vault.updateRoll(rollModal.roll.id, values) : vault.addRoll(values))}
        />
      ) : null}

      {usageRollId !== null ? (
        <UsageFormModal
          rolls={vault.rolls}
          selectedRollId={usageRollId || null}
          onClose={() => setUsageRollId(null)}
          onSubmit={vault.addUsage}
        />
      ) : null}
    </AppShell>
  );
}
