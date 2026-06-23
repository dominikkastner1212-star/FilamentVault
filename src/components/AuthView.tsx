import { FormEvent, useState } from 'react';
import { KeyRound, LogIn, ShieldCheck } from 'lucide-react';

type AuthViewProps = {
  authMessage: string | null;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string, fullName: string) => Promise<void>;
  onDemo: () => void;
};

export function AuthView({ authMessage, onSignIn, onSignUp, onDemo }: AuthViewProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!email.includes('@')) {
      setError('Bitte gib eine gueltige E-Mail-Adresse ein.');
      return;
    }

    if (password.length < 8) {
      setError('Das Passwort braucht mindestens 8 Zeichen.');
      return;
    }

    if (mode === 'signup' && fullName.trim().length < 2) {
      setError('Bitte gib einen Namen fuer dein Profil ein.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await onSignIn(email.trim(), password);
      } else {
        await onSignUp(email.trim(), password, fullName.trim());
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Anmeldung fehlgeschlagen.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-visual" aria-label="FilamentVault">
        <div className="brand-lockup">
          <div className="brand-mark">FV</div>
          <div>
            <h1>FilamentVault</h1>
            <p>Gemeinsame Filamentverwaltung fuer kleine 3D-Drucker-Gruppen.</p>
          </div>
        </div>
        <div className="auth-metrics">
          <div>
            <span>Gesamtbestand</span>
            <strong>4,1 kg</strong>
          </div>
          <div>
            <span>Niedriger Bestand</span>
            <strong>2 Rollen</strong>
          </div>
          <div>
            <span>Offener Ausgleich</span>
            <strong>38,72 €</strong>
          </div>
        </div>
      </section>

      <section className="auth-card">
        <div className="auth-card-header">
          <div className="icon-badge">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2>{mode === 'login' ? 'Anmelden' : 'Profil erstellen'}</h2>
            <p>Supabase Auth ordnet jeden Verbrauch sauber einem Benutzer zu.</p>
          </div>
        </div>

        {authMessage ? <div className="notice">{authMessage}</div> : null}
        {error ? <div className="form-error">{error}</div> : null}

        <form className="stacked-form" onSubmit={handleSubmit}>
          {mode === 'signup' ? (
            <label>
              Name
              <input value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" />
            </label>
          ) : null}
          <label>
            E-Mail
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" />
          </label>
          <label>
            Passwort
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </label>
          <button className="primary-button" type="submit" disabled={submitting}>
            {mode === 'login' ? <LogIn size={18} /> : <KeyRound size={18} />}
            {submitting ? 'Bitte warten' : mode === 'login' ? 'Einloggen' : 'Registrieren'}
          </button>
        </form>

        <div className="auth-switch">
          <button type="button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
            {mode === 'login' ? 'Neues Konto erstellen' : 'Zur Anmeldung wechseln'}
          </button>
          <button type="button" onClick={onDemo}>
            Demo öffnen
          </button>
        </div>
      </section>
    </main>
  );
}
