begin;

create index if not exists filament_rolls_created_by_idx on public.filament_rolls (created_by);
create index if not exists filament_rolls_updated_by_idx on public.filament_rolls (updated_by);

commit;
