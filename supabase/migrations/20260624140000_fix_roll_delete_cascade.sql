begin;

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

    -- When the parent roll itself is being deleted, ON DELETE CASCADE removes
    -- this usage row first within the same statement, so the roll is already
    -- gone by the time this trigger runs. Only restore weight when the roll
    -- still exists (i.e. a usage entry was deleted on its own).
    if exists (select 1 from public.filament_rolls where id = old.roll_id) then
      perform public.adjust_roll_remaining(old.roll_id, old.used_weight_g);
    end if;

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

revoke execute on function public.apply_usage_delta() from public, anon, authenticated;

commit;
