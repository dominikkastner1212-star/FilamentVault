begin;

create table public.material_profiles (
  material_key text primary key,
  display_name text not null,
  source_name text not null,
  source_url text,
  source_profile_name text,
  source_profile_url text,
  source_license text,
  source_updated_at timestamptz,
  density_g_cm3 numeric(8, 4),
  filament_cost numeric(10, 2),
  flow_ratio numeric(8, 4),
  nozzle_temp_min int,
  nozzle_temp_max int,
  bed_temp_min int,
  bed_temp_max int,
  volumetric_speed numeric(8, 2),
  description text,
  raw jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.material_profile_sync_runs (
  id bigint generated always as identity primary key,
  source_name text not null,
  status text not null check (status in ('running', 'success', 'error')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  imported_count int not null default 0,
  error text,
  metadata jsonb not null default '{}'::jsonb
);

create index material_profiles_synced_at_idx on public.material_profiles(synced_at desc);
create index material_profile_sync_runs_started_idx on public.material_profile_sync_runs(started_at desc);

create trigger set_material_profiles_updated_at
before update on public.material_profiles
for each row
execute function public.set_updated_at();

alter table public.material_profiles enable row level security;
alter table public.material_profile_sync_runs enable row level security;

grant select on public.material_profiles, public.material_profile_sync_runs to authenticated;
grant select, insert, update, delete on public.material_profiles, public.material_profile_sync_runs to service_role;
grant usage, select on sequence public.material_profile_sync_runs_id_seq to authenticated, service_role;

create policy "authenticated users can read material profiles"
on public.material_profiles
for select
to authenticated
using (true);

create policy "authenticated users can read material profile sync runs"
on public.material_profile_sync_runs
for select
to authenticated
using (true);

commit;
