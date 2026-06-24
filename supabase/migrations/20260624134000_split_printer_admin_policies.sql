begin;

drop policy if exists "admins can manage printers" on public.printers;

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

commit;
