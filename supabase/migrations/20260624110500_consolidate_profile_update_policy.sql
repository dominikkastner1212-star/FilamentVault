begin;

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
