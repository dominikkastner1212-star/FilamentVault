import { createClient } from '@supabase/supabase-js';

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8'
};

const allowedProviders = new Set(['bambu_cloud', 'lan_bridge', 'manual']);

function numberOrNull(value) {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function integerOrNull(value) {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function clampProgress(value) {
  const parsed = integerOrNull(value);
  if (parsed === null) return null;
  return Math.min(100, Math.max(0, parsed));
}

function stringOrNull(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function extractPrintPayload(body) {
  return body?.data?.print || body?.print || body?.status || body?.raw?.print || body;
}

function normalizeStage(value) {
  const stage = stringOrNull(value);
  if (!stage) return null;

  const normalized = stage.toLowerCase();
  if (normalized === 'running') return 'printing';
  if (normalized === 'finish' || normalized === 'finished') return 'finished';
  if (normalized === 'pause' || normalized === 'paused') return 'paused';
  if (normalized === 'idle') return 'idle';
  return normalized;
}

function normalizeStatus(body) {
  const print = extractPrintPayload(body);
  const raw = body?.raw && typeof body.raw === 'object' ? body.raw : body;

  return {
    stage: normalizeStage(body.stage ?? print.gcode_state ?? print.stage),
    progress: clampProgress(body.progress ?? print.mc_percent),
    layer_num: integerOrNull(body.layer_num ?? print.layer_num),
    total_layer: integerOrNull(body.total_layer ?? print.total_layer_num ?? print.total_layer),
    nozzle_temp: numberOrNull(body.nozzle_temp ?? print.nozzle_temper ?? print.nozzle_temp),
    bed_temp: numberOrNull(body.bed_temp ?? print.bed_temper ?? print.bed_temp),
    remaining: integerOrNull(body.remaining ?? print.mc_remaining_time),
    gcode_file: stringOrNull(body.gcode_file ?? print.gcode_file),
    ams: body.ams ?? print.ams ?? null,
    raw
  };
}

function normalizePrinter(body) {
  const printer = body?.printer || {};
  const serial = stringOrNull(printer.serial ?? body.serial);

  return {
    serial,
    name: stringOrNull(printer.name ?? body.name) || serial,
    model: stringOrNull(printer.model ?? body.model),
    provider: allowedProviders.has(stringOrNull(printer.provider ?? body.provider) || '')
      ? stringOrNull(printer.provider ?? body.provider)
      : 'bambu_cloud',
    location: stringOrNull(printer.location ?? body.location),
    notes: stringOrNull(printer.notes ?? body.notes)
  };
}

function send(res, status, payload) {
  res.status(status).setHeader('content-type', jsonHeaders['content-type']).end(JSON.stringify(payload));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('allow', 'POST');
    send(res, 405, { error: 'method_not_allowed' });
    return;
  }

  const ingestKey = process.env.PRINTER_INGEST_KEY;
  const providedKey = req.headers['x-filamentvault-ingest-key'];
  if (!ingestKey || providedKey !== ingestKey) {
    send(res, 401, { error: 'unauthorized' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    send(res, 500, { error: 'server_not_configured' });
    return;
  }

  let body;
  try {
    body = typeof req.body === 'object' && req.body !== null ? req.body : JSON.parse(req.body || '{}');
  } catch {
    send(res, 400, { error: 'invalid_json' });
    return;
  }
  const printer = normalizePrinter(body);
  if (!printer.serial) {
    send(res, 400, { error: 'printer_serial_required' });
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const { data: printerRow, error: printerError } = await supabase
    .from('printers')
    .upsert(
      {
        serial: printer.serial,
        name: printer.name,
        model: printer.model,
        provider: printer.provider,
        location: printer.location,
        notes: printer.notes,
        is_active: true,
        last_seen_at: new Date().toISOString()
      },
      { onConflict: 'serial' }
    )
    .select('id, serial, name')
    .single();

  if (printerError) {
    send(res, 500, { error: 'printer_upsert_failed', detail: printerError.message });
    return;
  }

  const normalized = normalizeStatus(body);
  const { error: statusError } = await supabase.from('printer_status').insert({
    printer_id: printerRow.id,
    ...normalized
  });

  if (statusError) {
    send(res, 500, { error: 'status_insert_failed', detail: statusError.message });
    return;
  }

  send(res, 200, {
    ok: true,
    printer: printerRow,
    status: {
      stage: normalized.stage,
      progress: normalized.progress,
      remaining: normalized.remaining
    }
  });
}
