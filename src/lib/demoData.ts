import { ActivityLog, FilamentRoll, FilamentUsage, Profile } from '../types';

const now = new Date();
const iso = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86400000).toISOString();
const date = (daysAgo: number) => iso(daysAgo).slice(0, 10);

export const demoProfiles: Profile[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'mia@example.com',
    full_name: 'Mia Schaefer',
    avatar_url: null,
    created_at: iso(60),
    updated_at: iso(3)
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'jonas@example.com',
    full_name: 'Jonas Weber',
    avatar_url: null,
    created_at: iso(58),
    updated_at: iso(4)
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    email: 'lena@example.com',
    full_name: 'Lena Braun',
    avatar_url: null,
    created_at: iso(50),
    updated_at: iso(2)
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    email: 'omar@example.com',
    full_name: 'Omar Haddad',
    avatar_url: null,
    created_at: iso(45),
    updated_at: iso(5)
  }
];

export const demoRolls: FilamentRoll[] = [
  {
    id: 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    manufacturer: 'Prusament',
    material: 'PLA',
    color: 'Galaxy Black',
    original_weight_g: 1000,
    remaining_weight_g: 620,
    purchase_date: date(38),
    price: 29.9,
    buyer_id: demoProfiles[0].id,
    storage_location: 'Regal A2',
    notes: 'Sehr sauber fuer sichtbare Bauteile.',
    status: 'aktiv',
    created_by: demoProfiles[0].id,
    updated_by: demoProfiles[0].id,
    created_at: iso(38),
    updated_at: iso(4),
    buyer: demoProfiles[0]
  },
  {
    id: 'aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    manufacturer: 'Bambu Lab',
    material: 'PETG',
    color: 'Translucent Teal',
    original_weight_g: 1000,
    remaining_weight_g: 118,
    purchase_date: date(21),
    price: 27.49,
    buyer_id: demoProfiles[1].id,
    storage_location: 'Trockenbox 1',
    notes: 'Nur mit trockener Box verwenden.',
    status: 'aktiv',
    created_by: demoProfiles[1].id,
    updated_by: demoProfiles[1].id,
    created_at: iso(21),
    updated_at: iso(1),
    buyer: demoProfiles[1]
  },
  {
    id: 'aaaaaaa3-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
    manufacturer: 'Polymaker',
    material: 'ASA',
    color: 'Matte White',
    original_weight_g: 1000,
    remaining_weight_g: 780,
    purchase_date: date(19),
    price: 34.95,
    buyer_id: demoProfiles[2].id,
    storage_location: 'Regal B1',
    notes: 'Fuer Aussenteile reserviert.',
    status: 'reserviert',
    created_by: demoProfiles[2].id,
    updated_by: demoProfiles[2].id,
    created_at: iso(19),
    updated_at: iso(2),
    buyer: demoProfiles[2]
  },
  {
    id: 'aaaaaaa4-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
    manufacturer: 'eSun',
    material: 'TPU',
    color: 'Soft Grey',
    original_weight_g: 500,
    remaining_weight_g: 86,
    purchase_date: date(49),
    price: 22.5,
    buyer_id: demoProfiles[3].id,
    storage_location: 'Box TPU',
    notes: 'Langsam drucken, 230 C Duesentemperatur.',
    status: 'aktiv',
    created_by: demoProfiles[3].id,
    updated_by: demoProfiles[3].id,
    created_at: iso(49),
    updated_at: iso(3),
    buyer: demoProfiles[3]
  },
  {
    id: 'aaaaaaa5-aaaa-4aaa-8aaa-aaaaaaaaaaa5',
    manufacturer: 'Extrudr',
    material: 'PLA+',
    color: 'Signal Blue',
    original_weight_g: 1000,
    remaining_weight_g: 0,
    purchase_date: date(71),
    price: 24.99,
    buyer_id: demoProfiles[1].id,
    storage_location: 'Archiv',
    notes: 'Leer nach Roboterarm-Prototyp.',
    status: 'leer',
    created_by: demoProfiles[1].id,
    updated_by: demoProfiles[0].id,
    created_at: iso(71),
    updated_at: iso(7),
    buyer: demoProfiles[1]
  },
  {
    id: 'aaaaaaa6-aaaa-4aaa-8aaa-aaaaaaaaaaa6',
    manufacturer: 'Fiberlogy',
    material: 'ABS',
    color: 'Graphite',
    original_weight_g: 850,
    remaining_weight_g: 545,
    purchase_date: date(14),
    price: 26.4,
    buyer_id: demoProfiles[0].id,
    storage_location: 'Regal C3',
    notes: 'Nur im geschlossenen Drucker.',
    status: 'aktiv',
    created_by: demoProfiles[0].id,
    updated_by: demoProfiles[0].id,
    created_at: iso(14),
    updated_at: iso(6),
    buyer: demoProfiles[0]
  }
];

export const demoUsage: FilamentUsage[] = [
  {
    id: 'bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    roll_id: demoRolls[0].id,
    user_id: demoProfiles[1].id,
    project_name: 'Sensorhalter',
    used_weight_g: 180,
    used_at: date(5),
    note: 'Zwei Iterationen, finaler Halter sitzt.',
    cost_eur: 5.382,
    created_at: iso(5),
    updated_at: iso(5),
    user: demoProfiles[1],
    roll: demoRolls[0]
  },
  {
    id: 'bbbbbbb2-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
    roll_id: demoRolls[1].id,
    user_id: demoProfiles[2].id,
    project_name: 'Pumpengehaeuse',
    used_weight_g: 260,
    used_at: date(3),
    note: 'PETG wegen Feuchtigkeitsschutz.',
    cost_eur: 7.1474,
    created_at: iso(3),
    updated_at: iso(3),
    user: demoProfiles[2],
    roll: demoRolls[1]
  },
  {
    id: 'bbbbbbb3-bbbb-4bbb-8bbb-bbbbbbbbbbb3',
    roll_id: demoRolls[3].id,
    user_id: demoProfiles[0].id,
    project_name: 'Kabeldurchfuehrung',
    used_weight_g: 96,
    used_at: date(2),
    note: 'Flexibler Einsatz fuer Testaufbau.',
    cost_eur: 4.32,
    created_at: iso(2),
    updated_at: iso(2),
    user: demoProfiles[0],
    roll: demoRolls[3]
  },
  {
    id: 'bbbbbbb4-bbbb-4bbb-8bbb-bbbbbbbbbbb4',
    roll_id: demoRolls[2].id,
    user_id: demoProfiles[3].id,
    project_name: 'Wetterschutzklappe',
    used_weight_g: 140,
    used_at: date(1),
    note: 'ASA fuer Aussenbereich.',
    cost_eur: 4.893,
    created_at: iso(1),
    updated_at: iso(1),
    user: demoProfiles[3],
    roll: demoRolls[2]
  }
];

export const demoActivity: ActivityLog[] = [
  {
    id: 'ccccccc1-cccc-4ccc-8ccc-ccccccccccc1',
    actor_id: demoProfiles[3].id,
    action: 'usage_logged',
    entity_type: 'usage',
    entity_id: demoUsage[3].id,
    metadata: { project_name: 'Wetterschutzklappe', used_weight_g: 140, roll: 'Polymaker ASA Matte White' },
    created_at: iso(1),
    actor: demoProfiles[3]
  },
  {
    id: 'ccccccc2-cccc-4ccc-8ccc-ccccccccccc2',
    actor_id: demoProfiles[0].id,
    action: 'usage_logged',
    entity_type: 'usage',
    entity_id: demoUsage[2].id,
    metadata: { project_name: 'Kabeldurchfuehrung', used_weight_g: 96, roll: 'eSun TPU Soft Grey' },
    created_at: iso(2),
    actor: demoProfiles[0]
  },
  {
    id: 'ccccccc3-cccc-4ccc-8ccc-ccccccccccc3',
    actor_id: demoProfiles[1].id,
    action: 'roll_created',
    entity_type: 'roll',
    entity_id: demoRolls[5].id,
    metadata: { roll: 'Fiberlogy ABS Graphite', remaining_weight_g: 545 },
    created_at: iso(6),
    actor: demoProfiles[1]
  },
  {
    id: 'ccccccc4-cccc-4ccc-8ccc-ccccccccccc4',
    actor_id: demoProfiles[0].id,
    action: 'roll_emptied',
    entity_type: 'roll',
    entity_id: demoRolls[4].id,
    metadata: { roll: 'Extrudr PLA+ Signal Blue' },
    created_at: iso(7),
    actor: demoProfiles[0]
  }
];
