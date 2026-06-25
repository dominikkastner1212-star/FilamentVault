import { createClient } from '@supabase/supabase-js';

const SOURCE_NAME = 'BambuStudio GitHub';
const SOURCE_URL = 'https://github.com/bambulab/BambuStudio/tree/master/resources/profiles/BBL/filament';
const SOURCE_LICENSE = 'BambuStudio public GitHub repository';
const FILAMENT_PATH_PREFIX = 'resources/profiles/BBL/filament/';
const GITHUB_TREE_URL = 'https://api.github.com/repos/bambulab/BambuStudio/git/trees/master?recursive=1';
const RAW_BASE_URL = 'https://raw.githubusercontent.com/bambulab/BambuStudio/master/';

const MATERIAL_TARGETS = [
  { key: 'PLA', label: 'PLA', tokens: ['PLA'] },
  { key: 'PLA+', label: 'PLA+', tokens: ['PLA+', 'PLA PLUS', 'PLA TOUGH'] },
  { key: 'PETG', label: 'PETG', tokens: ['PETG'] },
  { key: 'ASA', label: 'ASA', tokens: ['ASA'] },
  { key: 'TPU', label: 'TPU', tokens: ['TPU', 'FLEX'] },
  { key: 'ABS', label: 'ABS', tokens: ['ABS'] }
];

const EXCLUDED_VARIANTS = [
  'SUPPORT',
  '-CF',
  ' CF',
  '-GF',
  ' GF',
  'AERO',
  'WOOD',
  'METAL',
  'GLOW',
  'PA6',
  'PAHT',
  'PPA',
  'PC',
  'HIPS'
];

function send(res, status, payload) {
  res.status(status).setHeader('content-type', 'application/json; charset=utf-8').end(JSON.stringify(payload));
}

function isAuthorized(req) {
  const key = process.env.MATERIAL_PROFILE_SYNC_KEY || process.env.CRON_SECRET;
  if (!key) return false;

  const auth = req.headers.authorization || '';
  const headerKey = req.headers['x-filamentvault-sync-key'];
  return auth === `Bearer ${key}` || headerKey === key;
}

function normalizeName(value) {
  return String(value || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u00df/g, 'SS');
}

function jsonNumber(value) {
  if (Array.isArray(value)) return jsonNumber(value[0]);
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function valuesFor(profile, names) {
  const values = [];
  names.forEach((name) => {
    const raw = profile?.[name];
    if (Array.isArray(raw)) values.push(...raw);
    else if (raw !== undefined && raw !== null) values.push(raw);
  });
  return values.map(jsonNumber).filter((value) => value !== null);
}

function rangeFromProfiles(profiles, names) {
  const values = profiles.flatMap((profile) => valuesFor(profile, names));
  if (!values.length) return { min: null, max: null };
  return { min: Math.min(...values), max: Math.max(...values) };
}

function firstNumber(profiles, names) {
  for (const profile of profiles) {
    for (const name of names) {
      const number = jsonNumber(profile?.[name]);
      if (number !== null) return number;
    }
  }
  return null;
}

function firstString(profiles, names) {
  for (const profile of profiles) {
    for (const name of names) {
      const raw = profile?.[name];
      const value = Array.isArray(raw) ? raw[0] : raw;
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
  }
  return null;
}

function profileUrl(path) {
  return `https://github.com/bambulab/BambuStudio/blob/master/${path.split('/').map(encodeURIComponent).join('/')}`;
}

function rawUrl(path) {
  return `${RAW_BASE_URL}${path.split('/').map(encodeURIComponent).join('/')}`;
}

function materialForFile(path, target) {
  const fileName = normalizeName(path.split('/').pop() || '');
  if (!fileName.endsWith('.JSON')) return false;
  if (EXCLUDED_VARIANTS.some((token) => fileName.includes(token))) return false;

  if (target.key === 'PLA') {
    return fileName.includes('PLA') && !fileName.includes('PLA+') && !fileName.includes('PLA PLUS');
  }

  return target.tokens.some((token) => fileName.includes(normalizeName(token)));
}

function scoreCandidate(path, target) {
  const fileName = normalizeName(path.split('/').pop() || '');
  let score = 0;
  if (fileName.includes('@BASE.JSON')) score += 120;
  if (fileName.startsWith(`BAMBU ${normalizeName(target.key)}`)) score += 40;
  if (fileName.includes('BASIC')) score += 24;
  if (fileName.includes('@BBL X1C.JSON')) score += 14;
  if (fileName.includes('@BBL P1S')) score += 10;
  if (fileName.includes('0.2 NOZZLE') || fileName.includes('0.6 NOZZLE') || fileName.includes('0.8 NOZZLE')) score -= 40;
  return score;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: 'application/vnd.github+json',
      'user-agent': 'FilamentVault material profile sync'
    }
  });

  if (!response.ok) {
    throw new Error(`fetch_failed:${response.status}:${url}`);
  }

  return response.json();
}

async function loadFilamentTree() {
  const tree = await fetchJson(GITHUB_TREE_URL);
  if (!Array.isArray(tree?.tree)) {
    throw new Error('invalid_github_tree_response');
  }

  return tree.tree
    .filter((entry) => entry.type === 'blob' && entry.path?.startsWith(FILAMENT_PATH_PREFIX) && entry.path.endsWith('.json'))
    .map((entry) => entry.path);
}

async function loadProfiles(paths) {
  const profiles = [];

  for (const path of paths) {
    try {
      const profile = await fetchJson(rawUrl(path));
      profiles.push({ path, profile });
    } catch (error) {
      profiles.push({ path, error: error instanceof Error ? error.message : 'profile_fetch_failed' });
    }
  }

  return profiles.filter((entry) => entry.profile);
}

function buildSyncedRecord(target, loadedProfiles) {
  if (!loadedProfiles.length) return null;

  const profiles = loadedProfiles.map((entry) => entry.profile);
  const nozzle = rangeFromProfiles(profiles, ['nozzle_temperature', 'nozzle_temperature_initial_layer']);
  const bed = rangeFromProfiles(profiles, [
    'hot_plate_temp',
    'hot_plate_temp_initial_layer',
    'textured_plate_temp',
    'textured_plate_temp_initial_layer',
    'eng_plate_temp',
    'eng_plate_temp_initial_layer',
    'cool_plate_temp',
    'cool_plate_temp_initial_layer'
  ]);
  const first = loadedProfiles[0];

  return {
    material_key: target.key,
    display_name: target.label,
    source_name: SOURCE_NAME,
    source_url: SOURCE_URL,
    source_profile_name: firstString(profiles, ['name']) || first.path.split('/').pop(),
    source_profile_url: profileUrl(first.path),
    source_license: SOURCE_LICENSE,
    source_updated_at: new Date().toISOString(),
    density_g_cm3: firstNumber(profiles, ['filament_density']),
    filament_cost: firstNumber(profiles, ['filament_cost']),
    flow_ratio: firstNumber(profiles, ['filament_flow_ratio']),
    nozzle_temp_min: nozzle.min,
    nozzle_temp_max: nozzle.max,
    bed_temp_min: bed.min,
    bed_temp_max: bed.max,
    volumetric_speed: firstNumber(profiles, ['filament_max_volumetric_speed']),
    description: firstString(profiles, ['description']),
    raw: {
      fetched_profiles: loadedProfiles.map((entry) => ({
        path: entry.path,
        name: entry.profile.name,
        inherits: entry.profile.inherits,
        filament_id: entry.profile.filament_id
      }))
    },
    synced_at: new Date().toISOString()
  };
}

async function syncMaterialProfiles(supabase) {
  const paths = await loadFilamentTree();
  const records = [];
  const skipped = [];

  for (const target of MATERIAL_TARGETS) {
    const candidates = paths
      .filter((path) => materialForFile(path, target))
      .sort((a, b) => scoreCandidate(b, target) - scoreCandidate(a, target))
      .slice(0, 8);

    if (!candidates.length) {
      skipped.push(target.key);
      continue;
    }

    const loaded = await loadProfiles(candidates);
    const record = buildSyncedRecord(target, loaded);
    if (record) records.push(record);
    else skipped.push(target.key);
  }

  if (!records.length) {
    throw new Error('no_material_profiles_loaded');
  }

  const { error } = await supabase.from('material_profiles').upsert(records, { onConflict: 'material_key' });
  if (error) throw new Error(error.message);

  return {
    imported: records.map((record) => record.material_key),
    skipped,
    source: SOURCE_URL
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('allow', 'GET, POST');
    send(res, 405, { error: 'method_not_allowed' });
    return;
  }

  if (!isAuthorized(req)) {
    send(res, 401, { error: 'unauthorized' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    send(res, 500, { error: 'server_not_configured' });
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const { data: run } = await supabase
    .from('material_profile_sync_runs')
    .insert({ source_name: SOURCE_NAME, status: 'running', metadata: { source_url: SOURCE_URL } })
    .select('id')
    .single();

  try {
    const result = await syncMaterialProfiles(supabase);
    if (run?.id) {
      await supabase
        .from('material_profile_sync_runs')
        .update({
          status: 'success',
          finished_at: new Date().toISOString(),
          imported_count: result.imported.length,
          metadata: result
        })
        .eq('id', run.id);
    }

    send(res, 200, { ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'sync_failed';
    if (run?.id) {
      await supabase
        .from('material_profile_sync_runs')
        .update({
          status: 'error',
          finished_at: new Date().toISOString(),
          error: message
        })
        .eq('id', run.id);
    }

    send(res, 500, { error: 'sync_failed', detail: message });
  }
}
