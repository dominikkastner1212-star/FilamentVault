export const MATERIALS = ['PLA', 'PLA+', 'PETG', 'ASA', 'TPU', 'ABS'] as const;
export const ROLL_STATUSES = ['aktiv', 'reserviert', 'leer'] as const;
export const APP_ROLES = ['admin', 'member'] as const;
export const PRINTER_PROVIDERS = ['bambu_cloud', 'lan_bridge', 'manual'] as const;

export type Material = string;
export type RollStatus = (typeof ROLL_STATUSES)[number];
export type AppRole = (typeof APP_ROLES)[number];
export type PrinterProvider = (typeof PRINTER_PROVIDERS)[number];

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: AppRole;
  created_at: string;
  updated_at: string;
};

export type FilamentRoll = {
  id: string;
  manufacturer: string;
  material: Material;
  color: string;
  original_weight_g: number;
  remaining_weight_g: number;
  purchase_date: string;
  price: number;
  buyer_id: string;
  storage_location: string;
  notes: string | null;
  status: RollStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  buyer?: Pick<Profile, 'id' | 'full_name' | 'email'> | null;
};

export type FilamentUsage = {
  id: string;
  roll_id: string;
  user_id: string;
  project_name: string;
  used_weight_g: number;
  used_at: string;
  note: string | null;
  cost_eur: number;
  created_at: string;
  updated_at: string;
  user?: Pick<Profile, 'id' | 'full_name' | 'email'> | null;
  roll?: Pick<FilamentRoll, 'id' | 'manufacturer' | 'material' | 'color' | 'price' | 'original_weight_g'> | null;
};

export type Printer = {
  id: string;
  name: string;
  model: string | null;
  serial: string;
  provider: PrinterProvider;
  location: string | null;
  notes: string | null;
  is_active: boolean;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PrinterStatus = {
  id: number;
  printer_id: string;
  recorded_at: string;
  stage: string | null;
  progress: number | null;
  layer_num: number | null;
  total_layer: number | null;
  nozzle_temp: number | null;
  bed_temp: number | null;
  remaining: number | null;
  gcode_file: string | null;
  ams: Record<string, unknown> | null;
  raw: Record<string, unknown>;
  printer?: Pick<Printer, 'id' | 'name' | 'model' | 'serial' | 'provider' | 'location'> | null;
};

export type ActivityLog = {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: 'roll' | 'usage' | 'profile';
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  actor?: Pick<Profile, 'id' | 'full_name' | 'email'> | null;
};

export type RollFormValues = {
  manufacturer: string;
  material: Material;
  color: string;
  original_weight_g: number;
  remaining_weight_g: number;
  purchase_date: string;
  price: number;
  buyer_id: string;
  storage_location: string;
  notes: string;
  status: RollStatus;
};

export type UsageFormValues = {
  roll_id: string;
  project_name: string;
  used_weight_g: number;
  used_at: string;
  note: string;
};

export type MemberFormValues = {
  email: string;
  full_name: string;
  password: string;
  role: AppRole;
};

export type SettlementRow = {
  profile: Profile;
  purchased: number;
  consumedCost: number;
  usedWeight: number;
  balance: number;
};

export type MaterialStock = {
  material: Material;
  weight: number;
  activeRolls: number;
};
