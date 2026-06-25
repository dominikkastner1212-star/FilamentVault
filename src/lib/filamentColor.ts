const COLOR_RULES: Array<{ needles: string[]; color: string }> = [
  { needles: ['schwarz', 'black', 'graphite', 'grafit', 'anthrazit', 'anthracite', 'carbon', 'galaxy'], color: '#2b3033' },
  { needles: ['braun', 'brown', 'wood', 'holz', 'cork', 'coffee', 'chocolate', 'bronze'], color: '#8a5a3b' },
  { needles: ['oliv', 'olive', 'khaki', 'army'], color: '#6f8f3a' },
  { needles: ['gruen', 'grün', 'green', 'lime', 'neon green'], color: '#28c76f' },
  { needles: ['teal', 'tuerkis', 'türkis', 'cyan', 'petrol', 'mint'], color: '#2fc8b8' },
  { needles: ['blau', 'blue', 'navy', 'saphir', 'sapphire'], color: '#3f7cf4' },
  { needles: ['rot', 'red', 'ruby', 'weinrot', 'burgundy'], color: '#dc4a52' },
  { needles: ['orange', 'copper', 'kupfer'], color: '#f28735' },
  { needles: ['gelb', 'yellow', 'gold'], color: '#f2c94c' },
  { needles: ['lila', 'purple', 'violet', 'violett', 'magenta'], color: '#9b6cf3' },
  { needles: ['pink', 'rose', 'rosa'], color: '#ef6aa5' },
  { needles: ['weiss', 'weiß', 'white', 'ivory', 'natural', 'natur'], color: '#e8ece7' },
  { needles: ['grau', 'grey', 'gray', 'silber', 'silver', 'slate', 'soft grey'], color: '#9aa4a6' },
  { needles: ['transparent', 'translucent', 'clear', 'klar'], color: '#6dded2' }
];

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss');
}

function hashColor(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = value.charCodeAt(index) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 58% 48%)`;
}

export function filamentColor(colorName: string | null | undefined) {
  const normalized = normalize(colorName || '');
  const match = COLOR_RULES.find((rule) => rule.needles.some((needle) => normalized.includes(normalize(needle))));

  return match?.color || hashColor(normalized || 'filament');
}

export function filamentStyleVars(colorName: string | null | undefined) {
  return {
    '--filament-color': filamentColor(colorName)
  };
}
