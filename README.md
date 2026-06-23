# FilamentVault

FilamentVault ist eine mobile-first PWA fuer die gemeinsame Filamentverwaltung einer kleinen 3D-Drucker-Gruppe. Die App verwaltet Rollenbestand, Verbrauch, Kaeufer, Kosten und QR-Code-Detailseiten pro Rolle.

## Funktionen

- Supabase Auth mit Benutzerprofilen
- Dashboard mit Gesamtbestand, Materialbestand, niedrigen Rollen, Ausgaben, Verbrauch und Aktivitaeten
- Rollenverwaltung mit Hersteller, Material, Farbe, Gewicht, Preis, Kaeufer, Lagerort, Notizen und Status
- Verbrauchserfassung mit automatischer Restgewichtsreduktion
- Kostenuebersicht pro Person inklusive Ausgleichsbetrag
- QR-Code pro Rolle, der direkt zur Detailseite fuehrt
- Warnsystem ab unter 150 g und automatischer Status `leer` bei 0 g
- PWA Manifest, Service Worker und App-Icons

## Tech Stack

- React 19 + Vite
- TypeScript
- Supabase Auth und Postgres
- Row Level Security mit expliziten Grants
- Vercel-ready SPA Rewrites

## Lokaler Start

1. Abhaengigkeiten installieren:

```bash
pnpm install
```

2. Env-Datei anlegen:

```bash
cp .env.example .env.local
```

3. Supabase-Werte setzen:

```text
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
VITE_APP_BASE_URL=http://localhost:5173
```

4. Entwicklungsserver starten:

```bash
pnpm dev
```

Ohne Supabase-Env startet die App im lokalen Demo-Modus mit Beispieldaten.

## Supabase Setup

1. Neues Supabase-Projekt erstellen.
2. Migration ausfuehren:

```bash
supabase db push
```

Alternativ die Datei `supabase/migrations/20260623110000_init_filamentvault.sql` im Supabase SQL Editor ausfuehren.

3. Demo-Daten optional laden:

```bash
supabase db reset
```

Oder `supabase/seed.sql` im SQL Editor ausfuehren.

Demo-Logins nach Seed:

- `mia@example.com`
- `jonas@example.com`
- `lena@example.com`
- `omar@example.com`

Passwort fuer alle Demo-Accounts: `FilamentVault123!`

## Datenbank

Die Migration erstellt:

- `profiles`
- `filament_rolls`
- `filament_usage`
- `activity_log`
- Enum-Typen fuer Material und Rollenstatus
- Trigger fuer `updated_at`, Profilanlage, Kostenberechnung, Restgewicht, Leerstatus und Aktivitaetslog
- Explizite Data-API-Grants fuer `authenticated`
- RLS-Policies: eingeloggte Nutzer lesen alle Daten; nur eingeloggte Nutzer schreiben Rollen, Verbraeuche und eigene Profile

## Build

```bash
pnpm build
```

Der Build fuehrt TypeScript-Pruefung und Vite-Bundling aus.

## Deployment

### Vercel

1. Repository importieren.
2. Framework Preset: Vite.
3. Build Command: `pnpm build`.
4. Output Directory: `dist`.
5. Env Vars setzen:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_APP_BASE_URL`

`vercel.json` leitet SPA-Routen auf `index.html` um.

### Railway

Railway kann die App als Node/Vite-Projekt bauen. Setze dieselben Env Vars und nutze `pnpm build`; die statischen Dateien liegen danach in `dist`.

## Sicherheitsnotizen

- Keine Service-Role-Keys im Frontend verwenden.
- Neue Supabase-Tabellen werden in aktuellen Projekten nicht zwingend automatisch ueber die Data API exponiert; die Migration enthaelt deshalb explizite `GRANT`-Statements.
- RLS ist auf allen oeffentlichen Tabellen aktiv.
- Verbrauchskosten werden serverseitig in Postgres berechnet.
