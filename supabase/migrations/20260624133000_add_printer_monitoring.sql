begin;

create table public.printers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  model text,
  serial text not null unique,
  provider text not null default 'bambu_cloud'
    check (provider in ('bambu_cloud', 'lan_bridge', 'manual')),
  location text,
  notes text,
  is_active boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.printer_status (
  id bigint generated always as identity primary key,
  printer_id uuid not null references public.printers(id) on delete cascade,
  recorded_at timestamptz not null default now(),
  stage text,
  progress int check (progress is null or (progress >= 0 and progress <= 100)),
  layer_num int check (layer_num is null or layer_num >= 0),
  total_layer int check (total_layer is null or total_layer >= 0),
  nozzle_temp real,
  bed_temp real,
  remaining int check (remaining is null or remaining >= 0),
  gcode_file text,
  ams jsonb,
  raw jsonb not null default '{}'::jsonb
);

create index printers_active_idx on public.printers(is_active);
create index printer_status_printer_recorded_idx on public.printer_status(printer_id, recorded_at desc);
create index printer_status_recorded_idx on public.printer_status(recorded_at desc);

create trigger set_printers_updated_at
before update on public.printers
for each row
execute function public.set_updated_at();

alter table public.printers enable row level security;
alter table public.printer_status enable row level security;

grant select on public.printers, public.printer_status to authenticated;
grant insert, update, delete on public.printers to authenticated;
grant usage, select on sequence public.printer_status_id_seq to authenticated;

create policy "authenticated users can read printers"
on public.printers
for select
to authenticated
using (true);

create policy "admins can insert printers"
on public.printers
for insert
to authenticated
with check ((select private.is_admin()));

create policy "admins can update printers"
on public.printers
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "admins can delete printers"
on public.printers
for delete
to authenticated
using ((select private.is_admin()));

create policy "authenticated users can read printer status"
on public.printer_status
for select
to authenticated
using (true);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'printer_status'
  ) then
    alter publication supabase_realtime add table public.printer_status;
  end if;
end $$;

commit;
