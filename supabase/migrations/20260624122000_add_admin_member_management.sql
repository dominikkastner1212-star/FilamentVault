begin;

create or replace function public.admin_create_member(
  p_email text,
  p_full_name text,
  p_password text,
  p_role public.app_role default 'member'
)
returns public.profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor uuid;
  normalized_email text;
  normalized_name text;
  new_user_id uuid;
  created_profile public.profiles;
begin
  actor = (select auth.uid());
  if actor is null or not (select private.is_admin()) then
    raise exception 'admin privileges required' using errcode = '42501';
  end if;

  normalized_email = lower(trim(p_email));
  normalized_name = nullif(trim(p_full_name), '');

  if normalized_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    raise exception 'valid email required';
  end if;

  if normalized_name is null then
    raise exception 'full name required';
  end if;

  if length(coalesce(p_password, '')) < 8 then
    raise exception 'password must be at least 8 characters';
  end if;

  if exists (select 1 from auth.users where lower(email) = normalized_email) then
    raise exception 'email already exists';
  end if;

  new_user_id = gen_random_uuid();

  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    phone,
    phone_change,
    email_change_token_current,
    phone_change_token,
    reauthentication_token,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  values (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    normalized_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    null,
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', normalized_name),
    now(),
    now()
  );

  insert into auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    gen_random_uuid(),
    new_user_id,
    normalized_email,
    jsonb_build_object('sub', new_user_id::text, 'email', normalized_email),
    'email',
    now(),
    now(),
    now()
  );

  insert into public.profiles (id, email, full_name, role)
  values (new_user_id, normalized_email, normalized_name, p_role)
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        role = excluded.role,
        updated_at = now();

  insert into public.activity_log (actor_id, action, entity_type, entity_id, metadata)
  values (
    actor,
    'profile_created',
    'profile',
    new_user_id,
    jsonb_build_object('profile', normalized_name, 'email', normalized_email, 'role', p_role::text)
  );

  select *
  into created_profile
  from public.profiles
  where id = new_user_id;

  return created_profile;
end;
$$;

create or replace function public.admin_delete_member(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor uuid;
  target_profile public.profiles;
begin
  actor = (select auth.uid());
  if actor is null or not (select private.is_admin()) then
    raise exception 'admin privileges required' using errcode = '42501';
  end if;

  if p_profile_id = actor then
    raise exception 'admins cannot delete their own account';
  end if;

  select *
  into target_profile
  from public.profiles
  where id = p_profile_id;

  if target_profile.id is null then
    raise exception 'profile not found';
  end if;

  if target_profile.role = 'admin'::public.app_role
    and not exists (
      select 1
      from public.profiles
      where id <> target_profile.id
        and role = 'admin'::public.app_role
    )
  then
    raise exception 'at least one admin is required';
  end if;

  update public.filament_rolls
  set buyer_id = case when buyer_id = target_profile.id then actor else buyer_id end,
      created_by = case when created_by = target_profile.id then actor else created_by end,
      updated_by = case when updated_by = target_profile.id then actor else updated_by end,
      updated_at = now()
  where buyer_id = target_profile.id
     or created_by = target_profile.id
     or updated_by = target_profile.id;

  update public.filament_usage
  set user_id = actor,
      updated_at = now()
  where user_id = target_profile.id;

  insert into public.activity_log (actor_id, action, entity_type, entity_id, metadata)
  values (
    actor,
    'profile_deleted',
    'profile',
    target_profile.id,
    jsonb_build_object(
      'profile', coalesce(target_profile.full_name, target_profile.email, target_profile.id::text),
      'email', target_profile.email,
      'role', target_profile.role::text,
      'historical_records_reassigned_to', actor
    )
  );

  delete from auth.identities
  where user_id = target_profile.id;

  delete from auth.users
  where id = target_profile.id;
end;
$$;

revoke all on function public.admin_create_member(text, text, text, public.app_role) from public, anon, authenticated;
revoke all on function public.admin_delete_member(uuid) from public, anon, authenticated;
grant execute on function public.admin_create_member(text, text, text, public.app_role) to authenticated;
grant execute on function public.admin_delete_member(uuid) to authenticated;

commit;
