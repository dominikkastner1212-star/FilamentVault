import { CSSProperties, ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Activity,
  Boxes,
  Calculator,
  Gauge,
  LogOut,
  Plus,
  Printer,
  ReceiptText,
  Scale,
  Settings2,
  ShieldCheck
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

const baseNavItems = [
  { to: '/', label: 'Dashboard', mobileLabel: 'Start', icon: Gauge, tone: 'var(--accent)' },
  { to: '/rolls', label: 'Rollen', mobileLabel: 'Rollen', icon: Boxes, tone: 'var(--blue)' },
  { to: '/usage', label: 'Verbrauch', mobileLabel: 'Gramm', icon: Scale, tone: 'var(--warning)' },
  { to: '/costs', label: 'Kosten', mobileLabel: 'Kosten', icon: ReceiptText, tone: 'var(--mat-pla)' },
  { to: '/printers', label: 'Drucker', mobileLabel: 'Drucker', icon: Printer, tone: 'var(--mat-abs)' },
  { to: '/calculator', label: 'Kalkulator', mobileLabel: 'Preis', icon: Calculator, tone: 'var(--danger)' },
  { to: '/activity', label: 'Aktivitäten', mobileLabel: 'Log', icon: Activity, tone: 'var(--accent-strong)' }
];

const adminNavItem = {
  to: '/admin',
  label: 'Admin',
  mobileLabel: 'Admin',
  icon: ShieldCheck,
  tone: 'var(--mat-tpu)'
};

function isActivePath(pathname: string, to: string) {
  if (to === '/') return pathname === '/';
  return pathname === to || pathname.startsWith(`${to}/`);
}

function roleLabel(profile: Profile | null) {
  return profile?.role === 'admin' ? 'Admin' : 'Mitglied';
}

function roleClass(profile: Profile | null) {
  return profile?.role === 'admin' ? 'role-admin' : 'role-member';
}

function buildNavItems(profile: Profile | null) {
  return profile?.role === 'admin' ? [...baseNavItems, adminNavItem] : baseNavItems;
}

function buildMobileNavItems(profile: Profile | null) {
  if (profile?.role !== 'admin') return baseNavItems;
  return [...baseNavItems.filter((item) => item.to !== '/activity'), adminNavItem];
}

export function AppShell({ children, profile, isDemo, onAddRoll, onAddUsage, onSignOut }: AppShellProps) {
  const navItems = buildNavItems(profile);
  const mobileNavItems = buildMobileNavItems(profile);
  const location = useLocation();
  const activeIndex = navItems.findIndex((item) => isActivePath(location.pathname, item.to));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink to="/" className="app-brand" aria-label="FilamentVault Dashboard">
          <span className="brand-mark small" aria-hidden="true">
            <span />
          </span>
          <span>FilamentVault</span>
        </NavLink>
        <nav className="nav-list" aria-label="Hauptnavigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} className="nav-link">
                <span className="nav-icon" style={{ '--tone': item.tone } as CSSProperties}>
                  <Icon size={18} />
                </span>
                <span>{item.label}</span>
                <i aria-hidden="true" />
              </NavLink>
            );
          })}
          <div
            className={`nav-active-indicator${activeIndex >= 0 ? ' is-visible' : ''}`}
            style={{ transform: `translateY(${Math.max(activeIndex, 0) * 56}px)` }}
            aria-hidden="true"
          />
        </nav>
        <div className="sidebar-footer">
          <div className="profile-chip">
            <span>{displayName(profile).slice(0, 1).toUpperCase()}</span>
            <div>
              <strong>{displayName(profile)}</strong>
              <small>{isDemo ? 'Demo-Sitzung' : profile?.email}</small>
              <em className={`profile-role-chip ${roleClass(profile)}`}>{roleLabel(profile)}</em>
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
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} className="mobile-nav-link">
                <span className="nav-icon" style={{ '--tone': item.tone } as CSSProperties}>
                  <Icon size={18} />
                </span>
                <span>{item.mobileLabel}</span>
                <i aria-hidden="true" />
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
