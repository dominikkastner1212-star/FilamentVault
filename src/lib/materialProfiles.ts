import type { MaterialProfileRecord } from '../types';

export type MaterialProfile = {
  key: string;
  label: string;
  applications: string[];
  properties: string[];
  printNotes: string[];
  baseAbrasive: boolean;
  baseAbrasiveHint: string;
  synced?: MaterialProfileRecord | null;
};

export type AbrasiveInfo = {
  isAbrasive: boolean;
  label: string;
  hint: string;
};

const MATERIAL_PROFILES: Record<string, MaterialProfile> = {
  PLA: {
    key: 'PLA',
    label: 'PLA',
    applications: ['Prototypen', 'Deko', 'Passproben', 'leichte Halter'],
    properties: ['einfach zu drucken', 'steif', 'geringer Verzug', 'geringe Temperaturfestigkeit'],
    printNotes: ['ideal fuer schnelle Tests', 'nicht fuer heisse Umgebungen'],
    baseAbrasive: false,
    baseAbrasiveHint: 'Standard-PLA ist nicht abrasiv. Zusaetze wie Glow, Holz, Metall oder Carbon aendern das.'
  },
  'PLA+': {
    key: 'PLA+',
    label: 'PLA+',
    applications: ['Alltagsbauteile', 'Prototypen', 'Gehaeuse', 'saubere Sichtteile'],
    properties: ['zaeher als PLA', 'gute Oberflaeche', 'einfach zu drucken', 'moderate Temperaturfestigkeit'],
    printNotes: ['guter Standard fuer Gruppenbestand', 'mechanisch etwas robuster als PLA'],
    baseAbrasive: false,
    baseAbrasiveHint: 'PLA+ ist normalerweise nicht abrasiv. Gefuellte Varianten koennen abrasive Duesenabnutzung verursachen.'
  },
  PETG: {
    key: 'PETG',
    label: 'PETG',
    applications: ['funktionale Teile', 'Clips', 'Halter', 'feuchtigkeitsnahe Anwendungen'],
    properties: ['zaeh', 'chemisch robuster', 'leicht flexibel', 'neigt zu Stringing'],
    printNotes: ['guter Kompromiss aus Alltag und Funktion', 'Druckbett-Haftung nicht zu aggressiv einstellen'],
    baseAbrasive: false,
    baseAbrasiveHint: 'Standard-PETG ist nicht abrasiv. Carbon-, Glasfaser- oder Glow-PETG ist abrasiv.'
  },
  ASA: {
    key: 'ASA',
    label: 'ASA',
    applications: ['Outdoor-Teile', 'UV-belastete Bauteile', 'Gehaeuse', 'Automotive-nahe Teile'],
    properties: ['UV-bestaendig', 'witterungsfest', 'temperaturfester', 'verzieht sich leichter'],
    printNotes: ['geschlossener Bauraum empfohlen', 'Lueftung wegen Daempfen beachten'],
    baseAbrasive: false,
    baseAbrasiveHint: 'Standard-ASA ist nicht abrasiv. Gefuellte ASA-Sorten koennen abrasiv sein.'
  },
  TPU: {
    key: 'TPU',
    label: 'TPU',
    applications: ['Dichtungen', 'Puffer', 'Griffe', 'flexible Scharniere', 'Schutzteile'],
    properties: ['flexibel', 'abriebfest', 'langsam zu drucken', 'feuchtigkeitsempfindlich'],
    printNotes: ['langsam und mit wenig Retract drucken', 'trocken lagern'],
    baseAbrasive: false,
    baseAbrasiveHint: 'Standard-TPU ist nicht abrasiv, nutzt aber durch Flexibilitaet andere Druckprofile.'
  },
  ABS: {
    key: 'ABS',
    label: 'ABS',
    applications: ['technische Teile', 'Gehaeuse', 'waermere Umgebungen', 'nachbearbeitete Teile'],
    properties: ['zaeh', 'temperaturfester', 'acetonglaettbar', 'starker Verzug moeglich'],
    printNotes: ['geschlossener Bauraum empfohlen', 'Lueftung wegen Daempfen beachten'],
    baseAbrasive: false,
    baseAbrasiveHint: 'Standard-ABS ist nicht abrasiv. Gefuellte Spezialvarianten koennen abrasiv sein.'
  }
};

const GENERIC_PROFILE: MaterialProfile = {
  key: 'CUSTOM',
  label: 'Material',
  applications: ['Sondermaterial', 'profilabhaengige Bauteile'],
  properties: ['Eigenschaften vom Herstellerdatenblatt pruefen'],
  printNotes: ['Temperatur, Bauraum und Trocknung nach Herstellerangabe einstellen'],
  baseAbrasive: false,
  baseAbrasiveHint: 'Abrasivitaet haengt von Zusaetzen ab. Carbon, Glasfaser, Glow, Holz und Metall gelten als kritisch.'
};

const ABRASIVE_TERMS = [
  'abrasiv',
  'carbon',
  'cf',
  'kohlefaser',
  'glasfaser',
  'glass fiber',
  'gf',
  'glow',
  'leucht',
  'wood',
  'holz',
  'metal',
  'metall',
  'steel',
  'stainless',
  'bronze',
  'copper',
  'keramik',
  'ceramic',
  'filled',
  'gefuellt',
  'gefullt'
];

function normalize(value: string) {
  return value
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u00df/g, 'SS');
}

function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u00df/g, 'ss');
}

function syncedForMaterial(material: string, syncedProfiles: MaterialProfileRecord[] = []) {
  const normalized = normalize(material);
  return syncedProfiles.find((profile) => {
    const key = normalize(profile.material_key);
    if (normalized.includes('PLA+') && key === 'PLA+') return true;
    if (normalized.includes('PLA') && !normalized.includes('PLA+') && key === 'PLA') return true;
    return normalized.includes(key);
  });
}

export function getMaterialProfile(material: string, syncedProfiles: MaterialProfileRecord[] = []): MaterialProfile {
  const normalized = normalize(material);
  const synced = syncedForMaterial(material, syncedProfiles) || null;
  const withSynced = (profile: MaterialProfile) => ({ ...profile, synced });

  if (normalized.includes('PLA+')) return withSynced(MATERIAL_PROFILES['PLA+']);
  if (normalized.includes('PLA')) return withSynced(MATERIAL_PROFILES.PLA);
  if (normalized.includes('PETG')) return withSynced(MATERIAL_PROFILES.PETG);
  if (normalized.includes('ASA')) return withSynced(MATERIAL_PROFILES.ASA);
  if (normalized.includes('TPU') || normalized.includes('FLEX')) return withSynced(MATERIAL_PROFILES.TPU);
  if (normalized.includes('ABS')) return withSynced(MATERIAL_PROFILES.ABS);

  return withSynced({ ...GENERIC_PROFILE, label: material || GENERIC_PROFILE.label });
}

export function detectAbrasiveMaterial(input: {
  material: string;
  color?: string | null;
  notes?: string | null;
}): AbrasiveInfo {
  const profile = getMaterialProfile(input.material);
  const haystack = normalizeSearch(`${input.material} ${input.color || ''} ${input.notes || ''}`);
  const hasAbrasiveAdditive = ABRASIVE_TERMS.some((term) => haystack.includes(term));

  if (profile.baseAbrasive || hasAbrasiveAdditive) {
    return {
      isAbrasive: true,
      label: 'Abrasiv',
      hint: 'Gehaertete Duese empfohlen. Messingduesen koennen bei diesem Material schnell verschleissen.'
    };
  }

  return {
    isAbrasive: false,
    label: 'Nicht abrasiv',
    hint: profile.baseAbrasiveHint
  };
}
