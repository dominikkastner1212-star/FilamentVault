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

revoke all on function public.admin_create_member(text, text, text, public.app_role) from public, anon, authenticated;
grant execute on function public.admin_create_member(text, text, text, public.app_role) to authenticated;

commit;
