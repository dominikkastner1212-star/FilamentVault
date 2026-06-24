import { Cpu, Layers3, Radio, Thermometer, Timer, WifiOff, type LucideIcon } from 'lucide-react';
import { formatDateTime } from '../lib/format';
import { Printer, PrinterStatus } from '../types';

type PrinterMonitoringPageProps = {
  printers: Printer[];
  status: PrinterStatus[];
};

type StatusWithPrinter = PrinterStatus & {
  printer: Pick<Printer, 'id' | 'name' | 'model' | 'serial' | 'provider' | 'location'>;
};

function latestByPrinter(printers: Printer[], status: PrinterStatus[]) {
  return printers.map((printer) => ({
    printer,
    latest: status.find((entry) => entry.printer_id === printer.id) || null
  }));
}

function stageLabel(stage: string | null) {
  const labels: Record<string, string> = {
    printing: 'Druckt',
    running: 'Druckt',
    idle: 'Bereit',
    paused: 'Pausiert',
    pause: 'Pausiert',
    finished: 'Fertig',
    finish: 'Fertig',
    failed: 'Fehler'
  };
  return stage ? labels[stage.toLowerCase()] || stage : 'Unbekannt';
}

function stageClass(stage: string | null) {
  const normalized = stage?.toLowerCase();
  if (normalized === 'printing' || normalized === 'running') return 'printing';
  if (normalized === 'paused' || normalized === 'pause') return 'paused';
  if (normalized === 'failed' || normalized === 'error') return 'failed';
  return 'idle';
}

function percent(value: number | null) {
  return Math.max(0, Math.min(100, value ?? 0));
}

function minuteText(value: number | null) {
  if (value === null) return '-';
  if (value < 60) return `${value} min`;
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${hours} h ${minutes} min`;
}

function tempText(value: number | null) {
  return value === null ? '-' : `${Math.round(value)} °C`;
}

function amsSummary(status: PrinterStatus | null) {
  const ams = status?.ams;
  if (!ams || typeof ams !== 'object') return 'Keine AMS-Daten';
  const trays = Array.isArray(ams.trays) ? ams.trays.length : null;
  if (trays !== null) return `${trays} AMS-Slots`;
  return 'AMS-Daten vorhanden';
}

export function PrinterMonitoringPage({ printers, status }: PrinterMonitoringPageProps) {
  const rows = latestByPrinter(printers, status);
  const latest = status[0] as StatusWithPrinter | undefined;
  const activePrints = rows.filter((row) => stageClass(row.latest?.stage || null) === 'printing').length;
  const online = rows.filter((row) => row.latest).length;

  return (
    <section className="page-stack printer-page">
      <div className="printer-hero">
        <div>
          <span className="eyebrow">Bambu Monitoring</span>
          <h2>{activePrints ? `${activePrints} Druck läuft` : 'Druckerstatus im Blick'}</h2>
          <p>Reines Monitoring für Status, Fortschritt, Temperaturen, Layer und AMS-Daten. Ohne Fernsteuerung.</p>
        </div>
        <div className="printer-signal">
          <Radio size={22} />
          <strong>{online}/{Math.max(printers.length, 1)}</strong>
          <span>melden Status</span>
        </div>
      </div>

      {rows.length ? (
        <div className="printer-grid">
          {rows.map(({ printer, latest: latestStatus }) => (
            <article className="printer-card" key={printer.id}>
              <div className="printer-card-head">
                <div>
                  <span className={`stage-pill ${stageClass(latestStatus?.stage || null)}`}>
                    {stageLabel(latestStatus?.stage || null)}
                  </span>
                  <h3>{printer.name}</h3>
                  <p>
                    {printer.model || 'Bambu Lab'} · {printer.location || 'kein Standort'}
                  </p>
                </div>
                <Cpu size={22} />
              </div>

              <div className="printer-progress" aria-label="Druckfortschritt">
                <div>
                  <strong>{percent(latestStatus?.progress ?? null)}%</strong>
                  <span>{latestStatus?.gcode_file || 'Kein aktiver Job'}</span>
                </div>
                <em>
                  <i style={{ width: `${percent(latestStatus?.progress ?? null)}%` }} />
                </em>
              </div>

              <div className="printer-metrics">
                <StatusMetric icon={Timer} label="Restzeit" value={minuteText(latestStatus?.remaining ?? null)} />
                <StatusMetric
                  icon={Layers3}
                  label="Layer"
                  value={
                    latestStatus?.layer_num !== null && latestStatus?.total_layer
                      ? `${latestStatus?.layer_num}/${latestStatus?.total_layer}`
                      : '-'
                  }
                />
                <StatusMetric icon={Thermometer} label="Nozzle" value={tempText(latestStatus?.nozzle_temp ?? null)} />
                <StatusMetric icon={Thermometer} label="Bett" value={tempText(latestStatus?.bed_temp ?? null)} />
              </div>

              <div className="printer-foot">
                <span>{amsSummary(latestStatus)}</span>
                <small>{latestStatus ? formatDateTime(latestStatus.recorded_at) : 'Noch kein Status'}</small>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state printer-empty">
          <WifiOff size={28} />
          <strong>Noch kein Drucker verbunden.</strong>
          <span>Der geschützte Ingest-Endpunkt kann reine Statusdaten in Supabase schreiben.</span>
        </div>
      )}

      <section className="panel printer-log-panel">
        <div className="panel-header">
          <div>
            <h2>Letzte Statusmeldungen</h2>
            <p>Neueste Reports aus `printer_status`, bereit für Realtime.</p>
          </div>
        </div>
        <div className="printer-log-list">
          {status.slice(0, 8).map((entry) => (
            <div key={entry.id}>
              <span className={`status-dot ${stageClass(entry.stage)}`} />
              <div>
                <strong>{entry.printer?.name || 'Drucker'}</strong>
                <small>
                  {stageLabel(entry.stage)} · {percent(entry.progress)}% · {formatDateTime(entry.recorded_at)}
                </small>
              </div>
              <em>{minuteText(entry.remaining)}</em>
            </div>
          ))}
          {!status.length ? <div className="empty-state">Noch keine Statusmeldung vorhanden.</div> : null}
        </div>
      </section>

      {latest?.raw ? (
        <section className="panel raw-monitor-panel">
          <div className="panel-header">
            <div>
              <h2>Letzter Rohreport</h2>
              <p>Auszug zur Feldprüfung, bevor wir automatische Verbrauchslogik ergänzen.</p>
            </div>
          </div>
          <pre>{JSON.stringify(latest.raw, null, 2)}</pre>
        </section>
      ) : null}
    </section>
  );
}

function StatusMetric({
  icon: Icon,
  label,
  value
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="printer-metric">
      <span>
        <Icon size={15} />
      </span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}
