import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  Boxes,
  Gauge,
  LogOut,
  Plus,
  ReceiptText,
  Scale,
  Settings2
} from 'lucide-react';
import { Profile } from '../types';
import { displayName } from '../lib/format';

type AppShellProps = {
  children: ReactNode;
  profile: Profile | null;
  isDemo: boolean;
  onAddRoll: () => void;
  onAddUsage: () => void;
  onSignOut: () => void;
};

const navItems = [
  { to: '/', label: 'Dashboard', icon: Gauge },
  { to: '/rolls', label: 'Rollen', icon: Boxes },
  { to: '/usage', label: 'Verbrauch', icon: Scale },
  { to: '/costs', label: 'Kosten', icon: ReceiptText },
  { to: '/activity', label: 'Aktivitaeten', icon: Activity }
];

export function AppShell({ children, profile, isDemo, onAddRoll, onAddUsage, onSignOut }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink to="/" className="app-brand" aria-label="FilamentVault Dashboard">
          <span className="brand-mark small">FV</span>
          <span>FilamentVault</span>
        </NavLink>
        <nav className="nav-list" aria-label="Hauptnavigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} className="nav-link">
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <div className="profile-chip">
            <span>{displayName(profile).slice(0, 1).toUpperCase()}</span>
            <div>
              <strong>{displayName(profile)}</strong>
              <small>{isDemo ? 'Demo-Sitzung' : profile?.email}</small>
            </div>
          </div>
          <button type="button" className="ghost-button full" onClick={onSignOut}>
            <LogOut size={16} />
            Abmelden
          </button>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div>
            <h1>FilamentVault</h1>
          </div>
          <div className="topbar-actions">
            <button type="button" className="secondary-button" onClick={onAddUsage}>
              <Scale size={17} />
              Verbrauch
            </button>
            <button type="button" className="primary-button" onClick={onAddRoll}>
              <Plus size={17} />
              Rolle
            </button>
          </div>
        </header>

        <nav className="mobile-nav" aria-label="Mobile Navigation">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} className="mobile-nav-link">
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {isDemo ? (
          <div className="demo-banner">
            <Settings2 size={16} />
            Lokale Demo-Daten aktiv. Supabase wird genutzt, sobald die Env-Werte gesetzt sind.
          </div>
        ) : null}

        <main className="content">{children}</main>
      </div>
    </div>
  );
}
