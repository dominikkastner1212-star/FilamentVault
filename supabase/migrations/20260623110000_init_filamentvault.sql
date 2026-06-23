begin;

create extension if not exists pgcrypto;

do $$
begin
  create type public.filament_material as enum ('PLA', 'PLA+', 'PETG', 'ASA', 'TPU', 'ABS');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.roll_status as enum ('aktiv', 'leer', 'reserviert');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.filament_rolls (
  id uuid primary key default gen_random_uuid(),
  manufacturer text not null,
  material public.filament_material not null,
  color text not null,
  original_weight_g numeric(10, 2) not null check (original_weight_g > 0),
  remaining_weight_g numeric(10, 2) not null check (remaining_weight_g >= 0),
  purchase_date date not null default current_date,
  price numeric(10, 2) not null check (price >= 0),
  buyer_id uuid not null constraint filament_rolls_buyer_id_fkey references public.profiles(id),
  storage_location text not null,
  notes text,
  status public.roll_status not null default 'aktiv',
  created_by uuid constraint filament_rolls_created_by_fkey references public.profiles(id),
  updated_by uuid constraint filament_rolls_updated_by_fkey references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint filament_rolls_remaining_lte_original check (remaining_weight_g <= original_weight_g)
);

create table if not exists public.filament_usage (
  id uuid primary key default gen_random_uuid(),
  roll_id uuid not null constraint filament_usage_roll_id_fkey references public.filament_rolls(id) on delete cascade,
  user_id uuid not null constraint filament_usage_user_id_fkey references public.profiles(id),
  project_name text not null,
  used_weight_g numeric(10, 2) not null check (used_weight_g > 0),
  used_at date not null default current_date,
  note text,
  cost_eur numeric(12, 4) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid constraint activity_log_actor_id_fkey references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null check (entity_type in ('roll', 'usage', 'profile')),
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists profiles_full_name_idx on public.profiles (full_name);
create index if not exists filament_rolls_buyer_id_idx on public.filament_rolls (buyer_id);
create index if not exists filament_rolls_created_by_idx on public.filament_rolls (created_by);
create index if not exists filament_rolls_updated_by_idx on public.filament_rolls (updated_by);
create index if not exists filament_rolls_material_status_idx on public.filament_rolls (material, status);
create index if not exists filament_usage_roll_id_idx on public.filament_usage (roll_id);
create index if not exists filament_usage_user_id_idx on public.filament_usage (user_id);
create index if not exists filament_usage_used_at_idx on public.filament_usage (used_at desc);
create index if not exists activity_log_created_at_idx on public.activity_log (created_at desc);
create index if not exists activity_log_actor_id_idx on public.activity_log (actor_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name),
        avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
        updated_at = now();

  return new;
end;
$$;

create or replace function public.sync_roll_status()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.remaining_weight_g < 0 then
    raise exception 'remaining_weight_g cannot be negative';
  end if;

  if new.remaining_weight_g > new.original_weight_g then
    raise exception 'remaining_weight_g cannot exceed original_weight_g';
  end if;

  if new.remaining_weight_g = 0 then
    new.status = 'leer';
  end if;

  return new;
end;
$$;

create or replace function public.calculate_usage_cost()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  roll_price numeric(10, 2);
  roll_weight numeric(10, 2);
begin
  select price, original_weight_g
  into roll_price, roll_weight
  from public.filament_rolls
  where id = new.roll_id;

  if roll_price is null or roll_weight is null then
    raise exception 'filament roll not found';
  end if;

  new.cost_eur = round((roll_price / roll_weight) * new.used_weight_g, 4);
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.adjust_roll_remaining(p_roll_id uuid, p_delta_g numeric)
returns void
language plpgsql
set search_path = public
as $$
declare
  current_remaining numeric(10, 2);
  next_remaining numeric(10, 2);
begin
  select remaining_weight_g
  into current_remaining
  from public.filament_rolls
  where id = p_roll_id
  for update;

  if current_remaining is null then
    raise exception 'filament roll not found';
  end if;

  next_remaining = current_remaining + p_delta_g;

  if next_remaining < 0 then
    raise exception 'usage exceeds remaining roll weight';
  end if;

  update public.filament_rolls
  set remaining_weight_g = next_remaining,
      status = case
        when next_remaining = 0 then 'leer'::public.roll_status
        when status = 'leer' and next_remaining > 0 then 'aktiv'::public.roll_status
        else status
      end,
      updated_by = coalesce((select auth.uid()), updated_by),
      updated_at = now()
  where id = p_roll_id;
end;
$$;

create or replace function public.apply_usage_delta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid;
  roll_label text;
begin
  if tg_op = 'INSERT' then
    actor = coalesce((select auth.uid()), new.user_id);
    perform public.adjust_roll_remaining(new.roll_id, -new.used_weight_g);

    select manufacturer || ' ' || material::text || ' ' || color
    into roll_label
    from public.filament_rolls
    where id = new.roll_id;

    insert into public.activity_log (actor_id, action, entity_type, entity_id, metadata)
    values (
      actor,
      'usage_logged',
      'usage',
      new.id,
      jsonb_build_object(
        'project_name', new.project_name,
        'used_weight_g', new.used_weight_g,
        'roll', roll_label,
        'cost_eur', new.cost_eur
      )
    );

    return new;
  end if;

  if tg_op = 'UPDATE' then
    actor = coalesce((select auth.uid()), new.user_id, old.user_id);

    if old.roll_id = new.roll_id then
      perform public.adjust_roll_remaining(new.roll_id, old.used_weight_g - new.used_weight_g);
    else
      perform public.adjust_roll_remaining(old.roll_id, old.used_weight_g);
      perform public.adjust_roll_remaining(new.roll_id, -new.used_weight_g);
    end if;

    insert into public.activity_log (actor_id, action, entity_type, entity_id, metadata)
    values (
      actor,
      'usage_updated',
      'usage',
      new.id,
      jsonb_build_object(
        'project_name', new.project_name,
        'old_weight_g', old.used_weight_g,
        'new_weight_g', new.used_weight_g,
        'cost_eur', new.cost_eur
      )
    );

    return new;
  end if;

  if tg_op = 'DELETE' then
    actor = coalesce((select auth.uid()), old.user_id);
    perform public.adjust_roll_remaining(old.roll_id, old.used_weight_g);
    insert into public.activity_log (actor_id, action, entity_type, entity_id, metadata)
    values (
      actor,
      'usage_deleted',
      'usage',
      old.id,
      jsonb_build_object('project_name', old.project_name, 'used_weight_g', old.used_weight_g)
    );
    return old;
  end if;

  return null;
end;
$$;

create or replace function public.log_roll_activity()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  actor uuid;
  roll_label text;
begin
  if pg_trigger_depth() > 1 then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    actor = coalesce((select auth.uid()), new.updated_by, new.created_by);
    roll_label = new.manufacturer || ' ' || new.material::text || ' ' || new.color;
    insert into public.activity_log (actor_id, action, entity_type, entity_id, metadata)
    values (
      actor,
      'roll_created',
      'roll',
      new.id,
      jsonb_build_object('roll', roll_label, 'remaining_weight_g', new.remaining_weight_g)
    );
    return new;
  end if;

  if tg_op = 'UPDATE' then
    actor = coalesce((select auth.uid()), new.updated_by, new.created_by, old.updated_by, old.created_by);
    roll_label = new.manufacturer || ' ' || new.material::text || ' ' || new.color;
    insert into public.activity_log (actor_id, action, entity_type, entity_id, metadata)
    values (
      actor,
      case when new.status = 'leer' and old.status <> 'leer' then 'roll_emptied' else 'roll_updated' end,
      'roll',
      new.id,
      jsonb_build_object(
        'roll', roll_label,
        'old_remaining_weight_g', old.remaining_weight_g,
        'new_remaining_weight_g', new.remaining_weight_g,
        'old_status', old.status,
        'new_status', new.status
      )
    );
    return new;
  end if;

  if tg_op = 'DELETE' then
    actor = coalesce((select auth.uid()), old.updated_by, old.created_by);
    roll_label = old.manufacturer || ' ' || old.material::text || ' ' || old.color;
    insert into public.activity_log (actor_id, action, entity_type, entity_id, metadata)
    values (actor, 'roll_deleted', 'roll', old.id, jsonb_build_object('roll', roll_label));
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists filament_rolls_set_updated_at on public.filament_rolls;
create trigger filament_rolls_set_updated_at
  before update on public.filament_rolls
  for each row execute function public.set_updated_at();

drop trigger if exists filament_rolls_sync_status on public.filament_rolls;
create trigger filament_rolls_sync_status
  before insert or update on public.filament_rolls
  for each row execute function public.sync_roll_status();

drop trigger if exists filament_rolls_log_activity on public.filament_rolls;
create trigger filament_rolls_log_activity
  after insert or update or delete on public.filament_rolls
  for each row execute function public.log_roll_activity();

drop trigger if exists filament_usage_calculate_cost on public.filament_usage;
create trigger filament_usage_calculate_cost
  before insert or update on public.filament_usage
  for each row execute function public.calculate_usage_cost();

drop trigger if exists filament_usage_apply_delta on public.filament_usage;
create trigger filament_usage_apply_delta
  after insert or update or delete on public.filament_usage
  for each row execute function public.apply_usage_delta();

alter table public.profiles enable row level security;
alter table public.filament_rolls enable row level security;
alter table public.filament_usage enable row level security;
alter table public.activity_log enable row level security;

grant usage on schema public to anon, authenticated;
grant select on table public.profiles, public.filament_rolls, public.filament_usage, public.activity_log to authenticated;
grant insert, update on table public.profiles to authenticated;
grant insert, update, delete on table public.filament_rolls, public.filament_usage to authenticated;
grant insert on table public.activity_log to authenticated;

revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.sync_roll_status() from public, anon, authenticated;
revoke execute on function public.calculate_usage_cost() from public, anon, authenticated;
revoke execute on function public.adjust_roll_remaining(uuid, numeric) from public, anon, authenticated;
revoke execute on function public.apply_usage_delta() from public, anon, authenticated;
revoke execute on function public.log_roll_activity() from public, anon, authenticated;

drop policy if exists "profiles_read_authenticated" on public.profiles;
create policy "profiles_read_authenticated"
on public.profiles
for select
to authenticated
using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "rolls_read_authenticated" on public.filament_rolls;
create policy "rolls_read_authenticated"
on public.filament_rolls
for select
to authenticated
using (true);

drop policy if exists "rolls_insert_authenticated" on public.filament_rolls;
create policy "rolls_insert_authenticated"
on public.filament_rolls
for insert
to authenticated
with check ((select auth.uid()) is not null and created_by = (select auth.uid()));

drop policy if exists "rolls_update_authenticated" on public.filament_rolls;
create policy "rolls_update_authenticated"
on public.filament_rolls
for update
to authenticated
using ((select auth.uid()) is not null)
with check ((select auth.uid()) is not null);

drop policy if exists "rolls_delete_authenticated" on public.filament_rolls;
create policy "rolls_delete_authenticated"
on public.filament_rolls
for delete
to authenticated
using ((select auth.uid()) is not null);

drop policy if exists "usage_read_authenticated" on public.filament_usage;
create policy "usage_read_authenticated"
on public.filament_usage
for select
to authenticated
using (true);

drop policy if exists "usage_insert_own" on public.filament_usage;
create policy "usage_insert_own"
on public.filament_usage
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "usage_update_authenticated" on public.filament_usage;
create policy "usage_update_authenticated"
on public.filament_usage
for update
to authenticated
using ((select auth.uid()) is not null)
with check ((select auth.uid()) is not null);

drop policy if exists "usage_delete_authenticated" on public.filament_usage;
create policy "usage_delete_authenticated"
on public.filament_usage
for delete
to authenticated
using ((select auth.uid()) is not null);

drop policy if exists "activity_read_authenticated" on public.activity_log;
create policy "activity_read_authenticated"
on public.activity_log
for select
to authenticated
using (true);

drop policy if exists "activity_insert_authenticated" on public.activity_log;
create policy "activity_insert_authenticated"
on public.activity_log
for insert
to authenticated
with check ((select auth.uid()) is not null and (actor_id is null or actor_id = (select auth.uid())));

commit;
