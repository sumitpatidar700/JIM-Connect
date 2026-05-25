create extension if not exists "pgcrypto";

do $$
declare
  admin_id uuid := '11111111-1111-1111-1111-111111111111';
  admin_email text := 'admin@jiconnect.edu';
  admin_password text := 'Admin@12345';
begin
  insert into auth.users (
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  values (
    admin_id,
    'authenticated',
    'authenticated',
    admin_email,
    crypt(admin_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Campus Admin"}'::jsonb,
    now(),
    now()
  )
  on conflict (id) do nothing;

  insert into public.users (id, name, email, role)
  values (admin_id, 'Campus Admin', admin_email, 'admin')
  on conflict (id) do update
  set
    name = excluded.name,
    email = excluded.email,
    role = excluded.role;
end $$;
