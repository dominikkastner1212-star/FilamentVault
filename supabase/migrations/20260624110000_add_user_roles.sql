begin;

do $$
begin
  create type public.app_role as enum ('admin', 'member');
exception
  when duplicate_object then null;
end $$;

alter table public.profiles
  add column if not exists role public.app_role not null default 'member';

create index if not exists profiles_role_idx on public.profiles (role);

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'::public.app_role
  );
$$;

revoke all on function private.is_admin() from public, anon, authenticated;
grant execute on function private.is_admin() to authenticated;

create or replace function public.ensure_admin_role_safety()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
    and old.role = 'admin'::public.app_role
    and new.role <> 'admin'::public.app_role
    and not exists (
      select 1
      from public.profiles
      where id <> old.id
        and role = 'admin'::public.app_role
    )
  then
    raise exception 'at least one admin is required';
  end if;

  return new;
end;
$$;

create or replace function public.log_profile_role_activity()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  actor uuid;
begin
  if old.role is distinct from new.role then
    actor = coalesce((select auth.uid()), new.id);

    insert into public.activity_log (actor_id, action, entity_type, entity_id, metadata)
    values (
      actor,
      'profile_role_updated',
      'profile',
      new.id,
      jsonb_build_object(
        'profile', coalesce(new.full_name, new.email, new.id::text),
        'email', new.email,
        'old_role', old.role::text,
        'new_role', new.role::text
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_ensure_admin_role_safety on public.profiles;
create trigger profiles_ensure_admin_role_safety
  before update of role on public.profiles
  for each row execute function public.ensure_admin_role_safety();

drop trigger if exists profiles_log_role_activity on public.profiles;
create trigger profiles_log_role_activity
  after update of role on public.profiles
  for each row execute function public.log_profile_role_activity();

revoke execute on function public.ensure_admin_role_safety() from public, anon, authenticated;
revoke execute on function public.log_profile_role_activity() from public, anon, authenticated;

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (
  (
    (select auth.uid()) = id
    and role = 'member'::public.app_role
  )
  or (select private.is_admin())
);

drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_update_admin" on public.profiles;
drop policy if exists "profiles_update_authenticated" on public.profiles;
create policy "profiles_update_authenticated"
on public.profiles
for update
to authenticated
using (
  (select private.is_admin())
  or (select auth.uid()) = id
)
with check (
  (select private.is_admin())
  or (
    (select auth.uid()) = id
    and role = (
      select p.role
      from public.profiles p
      where p.id = (select auth.uid())
    )
  )
);

commit;
