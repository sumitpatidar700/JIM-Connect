create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('student', 'admin');
  end if;
end $$;

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null unique,
  phone text unique,
  avatar_url text,
  role public.user_role not null default 'student',
  created_at timestamptz not null default now()
);

alter table public.users
add column if not exists phone text;

create unique index if not exists users_phone_unique
on public.users (phone)
where phone is not null and phone <> '';

alter table public.users
add column if not exists avatar_url text;

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  date timestamptz not null,
  registration_until timestamptz,
  registrations_paused boolean not null default false,
  venue text not null,
  created_by uuid not null references public.users (id) on delete cascade,
  image_url text,
  created_at timestamptz not null default now()
);

alter table public.events
add column if not exists registration_until timestamptz;

alter table public.events
add column if not exists registrations_paused boolean not null default false;

alter table public.events
add column if not exists pdf_url text,
add column if not exists max_registrations int;

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  phone text not null check (phone ~ '^[0-9]{10}$'),
  created_at timestamptz not null default now(),
  unique (user_id, event_id)
);

alter table public.registrations
add column if not exists phone text;

alter table public.registrations
drop constraint if exists registrations_phone_10_digits;

alter table public.registrations
add constraint registrations_phone_10_digits
check (phone is null or phone ~ '^[0-9]{10}$');

create or replace function public.registration_counts_for_events(event_ids uuid[])
returns table(event_id uuid, total bigint)
language sql
security definer
set search_path = public
as $$
  select registrations.event_id, count(*)::bigint as total
  from public.registrations
  where registrations.event_id = any(event_ids)
  group by registrations.event_id;
$$;

grant execute on function public.registration_counts_for_events(uuid[]) to authenticated;

create or replace function public.group_counts_for_events(event_ids uuid[])
returns table(event_id uuid, total_groups bigint)
language sql
security definer
set search_path = public
as $$
  select event_teams.event_id, count(*)::bigint as total_groups
  from public.event_teams
  where event_teams.event_id = any(event_ids)
  group by event_teams.event_id;
$$;

grant execute on function public.group_counts_for_events(uuid[]) to authenticated;

create table if not exists public.winners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  event_id uuid not null references public.events (id) on delete cascade,
  image_url text,
  position text not null
);

alter table public.winners
add column if not exists created_at timestamptz not null default now();

create table if not exists public.repository (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  description text not null,
  image_url text
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, name, email, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    'student'
  )
  on conflict (id) do update
  set
    name = excluded.name,
    email = excluded.email,
    phone = excluded.phone;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.users enable row level security;
alter table public.announcements enable row level security;
alter table public.events enable row level security;
alter table public.registrations enable row level security;
alter table public.winners enable row level security;
alter table public.repository enable row level security;

drop policy if exists "users_read_own_profile" on public.users;
drop policy if exists "users_read_all" on public.users;
create policy "users_read_all"
on public.users for select
using (auth.role() = 'authenticated');

drop policy if exists "users_update_own_profile" on public.users;
create policy "users_update_own_profile"
on public.users for update
using (auth.uid() = id or public.is_admin())
with check (auth.uid() = id or public.is_admin());

drop policy if exists "announcements_read_all" on public.announcements;
create policy "announcements_read_all"
on public.announcements for select
using (auth.role() = 'authenticated');

drop policy if exists "announcements_admin_manage" on public.announcements;
create policy "announcements_admin_manage"
on public.announcements for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "events_read_all" on public.events;
create policy "events_read_all"
on public.events for select
using (auth.role() = 'authenticated');

drop policy if exists "events_admin_manage" on public.events;
create policy "events_admin_manage"
on public.events for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "registrations_admin_delete" on public.registrations;
create policy "registrations_admin_delete"
on public.registrations for delete
using (public.is_admin());

drop policy if exists "winners_read_all" on public.winners;
create policy "winners_read_all"
on public.winners for select
using (auth.role() = 'authenticated');

drop policy if exists "winners_admin_manage" on public.winners;
create policy "winners_admin_manage"
on public.winners for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "repository_read_all" on public.repository;
create policy "repository_read_all"
on public.repository for select
using (auth.role() = 'authenticated');

drop policy if exists "repository_admin_manage" on public.repository;
create policy "repository_admin_manage"
on public.repository for all
using (public.is_admin())
with check (public.is_admin());

insert into storage.buckets (id, name, public)
values
  ('event-assets', 'event-assets', true),
  ('profile-assets', 'profile-assets', true),
  ('winner-assets', 'winner-assets', true),
  ('repository-assets', 'repository-assets', true),
  ('support-assets', 'support-assets', true)
on conflict (id) do nothing;

drop policy if exists "asset_buckets_public_read" on storage.objects;
create policy "asset_buckets_public_read"
on storage.objects for select
using (bucket_id in ('event-assets', 'profile-assets', 'winner-assets', 'repository-assets', 'support-assets'));

drop policy if exists "asset_buckets_authenticated_upload" on storage.objects;
create policy "asset_buckets_authenticated_upload"
on storage.objects for insert
with check (
  auth.role() = 'authenticated'
  and bucket_id in ('event-assets', 'profile-assets', 'winner-assets', 'repository-assets', 'support-assets')
);

drop policy if exists "asset_buckets_authenticated_update" on storage.objects;
create policy "asset_buckets_authenticated_update"
on storage.objects for update
using (
  auth.role() = 'authenticated'
  and bucket_id in ('event-assets', 'profile-assets', 'winner-assets', 'repository-assets', 'support-assets')
)
with check (
  auth.role() = 'authenticated'
  and bucket_id in ('event-assets', 'profile-assets', 'winner-assets', 'repository-assets', 'support-assets')
);

alter table public.events
add column if not exists google_drive_link text,
add column if not exists links jsonb not null default '[]'::jsonb,
add column if not exists committees text[] default '{}'::text[],
add column if not exists clubs text[] default '{}'::text[];

alter table public.events
add column if not exists min_team_size int not null default 1,
add column if not exists max_team_size int not null default 1;

create table if not exists public.event_teams (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  leader_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(event_id, name)
);

alter table public.registrations
add column if not exists team_id uuid references public.event_teams (id) on delete cascade,
add column if not exists status text not null default 'accepted',
add column if not exists invited_by uuid references public.users (id) on delete cascade;

alter table public.event_teams enable row level security;

drop policy if exists "event_teams_read_all" on public.event_teams;
create policy "event_teams_read_all"
on public.event_teams for select
using (auth.role() = 'authenticated');

drop policy if exists "event_teams_insert_auth" on public.event_teams;
create policy "event_teams_insert_auth"
on public.event_teams for insert
with check (auth.uid() = leader_id or public.is_admin());

drop policy if exists "event_teams_admin_manage" on public.event_teams;
create policy "event_teams_admin_manage"
on public.event_teams for all
using (public.is_admin())
with check (public.is_admin());

create or replace function public.is_teammate(target_team_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.registrations
    where user_id = auth.uid() and team_id = target_team_id
  );
$$;

create or replace function public.is_team_leader(target_team_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.event_teams
    where id = target_team_id and leader_id = auth.uid()
  );
$$;

drop policy if exists "registrations_read_own_or_admin" on public.registrations;
create policy "registrations_read_own_or_admin"
on public.registrations for select
using (auth.uid() = user_id or public.is_admin() or auth.uid() = invited_by or (team_id is not null and public.is_teammate(team_id)));

drop policy if exists "registrations_insert_own" on public.registrations;
create policy "registrations_insert_own"
on public.registrations for insert
with check (auth.uid() = user_id or auth.uid() = invited_by or public.is_admin() or (team_id is not null and public.is_team_leader(team_id)));

drop policy if exists "registrations_update_own" on public.registrations;
create policy "registrations_update_own"
on public.registrations for update
using (auth.uid() = user_id or auth.uid() = invited_by or public.is_admin() or (team_id is not null and public.is_team_leader(team_id)))
with check (auth.uid() = user_id or auth.uid() = invited_by or public.is_admin() or (team_id is not null and public.is_team_leader(team_id)));

drop policy if exists "registrations_delete_own_or_leader" on public.registrations;
create policy "registrations_delete_own_or_leader"
on public.registrations for delete
using (auth.uid() = user_id or public.is_admin() or auth.uid() = invited_by or (team_id is not null and public.is_team_leader(team_id)));

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  event_id uuid references public.events (id) on delete set null,
  subject text not null,
  message text not null,
  image_url text,
  admin_reply text,
  admin_reply_image_url text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.support_tickets enable row level security;

drop policy if exists "support_tickets_read_own_or_admin" on public.support_tickets;
create policy "support_tickets_read_own_or_admin"
on public.support_tickets for select
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "support_tickets_insert_own" on public.support_tickets;
create policy "support_tickets_insert_own"
on public.support_tickets for insert
with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "support_tickets_update_own_or_admin" on public.support_tickets;
create policy "support_tickets_update_own_or_admin"
on public.support_tickets for update
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "support_tickets_delete_admin" on public.support_tickets;
create policy "support_tickets_delete_admin"
on public.support_tickets for delete
using (public.is_admin());
