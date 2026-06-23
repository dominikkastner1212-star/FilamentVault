begin;

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
values
  (
    '11111111-1111-4111-8111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'mia@example.com',
    crypt('FilamentVault123!', gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '+4915100000001',
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Mia Schaefer"}'::jsonb,
    now(),
    now()
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'jonas@example.com',
    crypt('FilamentVault123!', gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '+4915100000002',
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Jonas Weber"}'::jsonb,
    now(),
    now()
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'lena@example.com',
    crypt('FilamentVault123!', gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '+4915100000003',
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Lena Braun"}'::jsonb,
    now(),
    now()
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'omar@example.com',
    crypt('FilamentVault123!', gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '+4915100000004',
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Omar Haddad"}'::jsonb,
    now(),
    now()
  )
on conflict (id) do update
set email = excluded.email,
    encrypted_password = excluded.encrypted_password,
    email_confirmed_at = excluded.email_confirmed_at,
    confirmation_token = excluded.confirmation_token,
    recovery_token = excluded.recovery_token,
    email_change_token_new = excluded.email_change_token_new,
    email_change = excluded.email_change,
    phone = excluded.phone,
    phone_change = excluded.phone_change,
    email_change_token_current = excluded.email_change_token_current,
    phone_change_token = excluded.phone_change_token,
    reauthentication_token = excluded.reauthentication_token,
    raw_app_meta_data = excluded.raw_app_meta_data,
    raw_user_meta_data = excluded.raw_user_meta_data,
    updated_at = now();

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
values
  (
    '10000000-0000-4000-8000-000000000001',
    '11111111-1111-4111-8111-111111111111',
    'mia@example.com',
    '{"sub":"11111111-1111-4111-8111-111111111111","email":"mia@example.com"}'::jsonb,
    'email',
    now(),
    now(),
    now()
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    '22222222-2222-4222-8222-222222222222',
    'jonas@example.com',
    '{"sub":"22222222-2222-4222-8222-222222222222","email":"jonas@example.com"}'::jsonb,
    'email',
    now(),
    now(),
    now()
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    '33333333-3333-4333-8333-333333333333',
    'lena@example.com',
    '{"sub":"33333333-3333-4333-8333-333333333333","email":"lena@example.com"}'::jsonb,
    'email',
    now(),
    now(),
    now()
  ),
  (
    '10000000-0000-4000-8000-000000000004',
    '44444444-4444-4444-8444-444444444444',
    'omar@example.com',
    '{"sub":"44444444-4444-4444-8444-444444444444","email":"omar@example.com"}'::jsonb,
    'email',
    now(),
    now(),
    now()
  )
on conflict (provider_id, provider) do update
set identity_data = excluded.identity_data,
    updated_at = now();

insert into public.profiles (id, email, full_name)
values
  ('11111111-1111-4111-8111-111111111111', 'mia@example.com', 'Mia Schaefer'),
  ('22222222-2222-4222-8222-222222222222', 'jonas@example.com', 'Jonas Weber'),
  ('33333333-3333-4333-8333-333333333333', 'lena@example.com', 'Lena Braun'),
  ('44444444-4444-4444-8444-444444444444', 'omar@example.com', 'Omar Haddad')
on conflict (id) do update
set email = excluded.email,
    full_name = excluded.full_name,
    updated_at = now();

delete from public.filament_usage
where id in (
  'bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  'bbbbbbb2-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
  'bbbbbbb3-bbbb-4bbb-8bbb-bbbbbbbbbbb3',
  'bbbbbbb4-bbbb-4bbb-8bbb-bbbbbbbbbbb4'
);

delete from public.activity_log
where entity_id in (
  'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  'aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
  'aaaaaaa3-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
  'aaaaaaa4-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
  'aaaaaaa5-aaaa-4aaa-8aaa-aaaaaaaaaaa5',
  'aaaaaaa6-aaaa-4aaa-8aaa-aaaaaaaaaaa6',
  'bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  'bbbbbbb2-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
  'bbbbbbb3-bbbb-4bbb-8bbb-bbbbbbbbbbb3',
  'bbbbbbb4-bbbb-4bbb-8bbb-bbbbbbbbbbb4'
);

insert into public.filament_rolls (
  id,
  manufacturer,
  material,
  color,
  original_weight_g,
  remaining_weight_g,
  purchase_date,
  price,
  buyer_id,
  storage_location,
  notes,
  status,
  created_by,
  updated_by
)
values
  (
    'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'Prusament',
    'PLA',
    'Galaxy Black',
    1000,
    800,
    current_date - 38,
    29.90,
    '11111111-1111-4111-8111-111111111111',
    'Regal A2',
    'Sehr sauber fuer sichtbare Bauteile.',
    'aktiv',
    '11111111-1111-4111-8111-111111111111',
    '11111111-1111-4111-8111-111111111111'
  ),
  (
    'aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    'Bambu Lab',
    'PETG',
    'Translucent Teal',
    1000,
    378,
    current_date - 21,
    27.49,
    '22222222-2222-4222-8222-222222222222',
    'Trockenbox 1',
    'Nur mit trockener Box verwenden.',
    'aktiv',
    '22222222-2222-4222-8222-222222222222',
    '22222222-2222-4222-8222-222222222222'
  ),
  (
    'aaaaaaa3-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
    'Polymaker',
    'ASA',
    'Matte White',
    1000,
    920,
    current_date - 19,
    34.95,
    '33333333-3333-4333-8333-333333333333',
    'Regal B1',
    'Fuer Aussenteile reserviert.',
    'reserviert',
    '33333333-3333-4333-8333-333333333333',
    '33333333-3333-4333-8333-333333333333'
  ),
  (
    'aaaaaaa4-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
    'eSun',
    'TPU',
    'Soft Grey',
    500,
    182,
    current_date - 49,
    22.50,
    '44444444-4444-4444-8444-444444444444',
    'Box TPU',
    'Langsam drucken, 230 C Duesentemperatur.',
    'aktiv',
    '44444444-4444-4444-8444-444444444444',
    '44444444-4444-4444-8444-444444444444'
  ),
  (
    'aaaaaaa5-aaaa-4aaa-8aaa-aaaaaaaaaaa5',
    'Extrudr',
    'PLA+',
    'Signal Blue',
    1000,
    0,
    current_date - 71,
    24.99,
    '22222222-2222-4222-8222-222222222222',
    'Archiv',
    'Leer nach Roboterarm-Prototyp.',
    'leer',
    '22222222-2222-4222-8222-222222222222',
    '11111111-1111-4111-8111-111111111111'
  ),
  (
    'aaaaaaa6-aaaa-4aaa-8aaa-aaaaaaaaaaa6',
    'Fiberlogy',
    'ABS',
    'Graphite',
    850,
    545,
    current_date - 14,
    26.40,
    '11111111-1111-4111-8111-111111111111',
    'Regal C3',
    'Nur im geschlossenen Drucker.',
    'aktiv',
    '11111111-1111-4111-8111-111111111111',
    '11111111-1111-4111-8111-111111111111'
  )
on conflict (id) do update
set manufacturer = excluded.manufacturer,
    material = excluded.material,
    color = excluded.color,
    original_weight_g = excluded.original_weight_g,
    remaining_weight_g = excluded.remaining_weight_g,
    purchase_date = excluded.purchase_date,
    price = excluded.price,
    buyer_id = excluded.buyer_id,
    storage_location = excluded.storage_location,
    notes = excluded.notes,
    status = excluded.status,
    updated_by = excluded.updated_by,
    updated_at = now();

insert into public.filament_usage (
  id,
  roll_id,
  user_id,
  project_name,
  used_weight_g,
  used_at,
  note,
  cost_eur
)
values
  (
    'bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    '22222222-2222-4222-8222-222222222222',
    'Sensorhalter',
    180,
    current_date - 5,
    'Zwei Iterationen, finaler Halter sitzt.',
    5.3820
  ),
  (
    'bbbbbbb2-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
    'aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    '33333333-3333-4333-8333-333333333333',
    'Pumpengehaeuse',
    260,
    current_date - 3,
    'PETG wegen Feuchtigkeitsschutz.',
    7.1474
  ),
  (
    'bbbbbbb3-bbbb-4bbb-8bbb-bbbbbbbbbbb3',
    'aaaaaaa4-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
    '11111111-1111-4111-8111-111111111111',
    'Kabeldurchfuehrung',
    96,
    current_date - 2,
    'Flexibler Einsatz fuer Testaufbau.',
    4.3200
  ),
  (
    'bbbbbbb4-bbbb-4bbb-8bbb-bbbbbbbbbbb4',
    'aaaaaaa3-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
    '44444444-4444-4444-8444-444444444444',
    'Wetterschutzklappe',
    140,
    current_date - 1,
    'ASA fuer Aussenbereich.',
    4.8930
  )
on conflict (id) do nothing;

commit;
