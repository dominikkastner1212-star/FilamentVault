# FilamentVault

FilamentVault ist eine mobile-first PWA fuer die gemeinsame Filamentverwaltung einer kleinen 3D-Drucker-Gruppe. Die App verwaltet Rollenbestand, Verbrauch, Kaeufer, Kosten und QR-Code-Detailseiten pro Rolle.

## Funktionen

- Supabase Auth mit Benutzerprofilen
- Dashboard mit Gesamtbestand, Materialbestand, niedrigen Rollen, Ausgaben, Verbrauch und Aktivitaeten
- Rollenverwaltung mit Hersteller, Material, Farbe, Gewicht, Preis, Kaeufer, Lagerort, Notizen und Status
- Verbrauchserfassung mit automatischer Restgewichtsreduktion
- Kostenuebersicht pro Person inklusive Ausgleichsbetrag
- Druckauftrag-Kalkulator fuer Verkaufspreise mit Material, Maschinenzeit, Energie, Arbeit, Marge und MwSt.
- Benutzerrollen: `admin` und `member`, inklusive Admin-Seite zum Anlegen, Entfernen und Verwalten von Mitgliedern
- Reines Drucker-Monitoring fuer Status, Fortschritt, Temperaturen, Layer und AMS-Rohdaten
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
- `printers`
- `printer_status`
- `activity_log`
- Enum-Typen fuer Material, Rollenstatus und App-Rollen
- Trigger fuer `updated_at`, Profilanlage, Kostenberechnung, Restgewicht, Leerstatus und Aktivitaetslog
- Explizite Data-API-Grants fuer `authenticated`
- RLS-Policies: eingeloggte Nutzer lesen alle Daten; nur eingeloggte Nutzer schreiben Rollen und Verbraeuche; nur Admins duerfen Benutzerrollen aendern
- Admin-RPCs fuer Mitgliedsanlage und Mitgliedsentfernung ohne Service-Role-Key im Frontend

## Benutzerrollen

Neue Nutzer starten als `member`. Ein `admin` sieht den Admin-Bereich in der Navigation und kann dort Mitglieder anlegen, entfernen und andere Profile auf `admin` oder `member` setzen. Rollen werden in `profiles.role` gespeichert, nicht in user-editierbaren Auth-Metadaten.

Wichtig: Mindestens ein Admin sollte erhalten bleiben. Die Migration verhindert, dass der letzte Admin entfernt wird.

Beim Entfernen eines Mitglieds werden historische Rollen- und Verbrauchsbezuege dem ausfuehrenden Admin zugeordnet. So bleiben Bestand, Verbrauch und Kostenberichte lesbar, ohne tote Profilreferenzen zu behalten.

## Bambu Lab Monitoring

FilamentVault enthaelt eine Monitoring-Schicht fuer Bambu- oder andere 3D-Drucker. Die App liest nur Statusdaten aus Supabase und bietet keine Fernsteuerung. Bambu-Drucker stehen typischerweise im lokalen Netzwerk, und Bambu Farm Manager/Bambu Connect arbeiten LAN-orientiert. Supabase Edge Functions und Vercel Functions koennen lokale Drucker im Heim- oder Werkstattnetz nicht direkt erreichen.

Aktueller sicherer Weg:

1. Ein Poller oder eine Bridge liest Druckerstatus, Jobstatus, Temperaturen, AMS/Filament-Slots und ggf. Verbrauchsdaten.
2. Der Poller schreibt nur normalisierte Statusdaten an den geschuetzten Endpoint `/api/printer-status`.
3. Der Endpoint schreibt mit dem Supabase Service-Role-Key in `printers` und `printer_status`.
4. FilamentVault zeigt die Daten unter `/printers` und aktualisiert per Supabase Realtime.

Wichtig: Drucker-Seriennummern, Access Codes oder Cloud-Zugangsdaten gehoeren nicht ins Frontend und nicht in `VITE_` Env Vars.

Server-Env fuer Vercel:

```text
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PRINTER_INGEST_KEY=generate-a-long-random-secret
```

Beispiel-Payload fuer den Ingest-Endpoint:

```bash
curl -X POST https://your-domain.vercel.app/api/printer-status \
  -H "content-type: application/json" \
  -H "x-filamentvault-ingest-key: $PRINTER_INGEST_KEY" \
  -d '{
    "printer": {
      "serial": "P1S123456",
      "name": "Bambu P1S",
      "model": "P1S",
      "provider": "bambu_cloud",
      "location": "Werkstatt"
    },
    "data": {
      "print": {
        "gcode_state": "RUNNING",
        "mc_percent": 42,
        "mc_remaining_time": 93,
        "layer_num": 84,
        "total_layer_num": 210,
        "nozzle_temper": 220,
        "bed_temper": 60,
        "gcode_file": "auftrag.3mf",
        "ams": {}
      }
    }
  }'
```

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
