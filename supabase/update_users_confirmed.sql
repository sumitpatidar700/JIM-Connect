-- 1. Add email_confirmed column to public.users if it doesn't exist
alter table public.users add column if not exists email_confirmed boolean not null default false;

-- 2. Mark all existing users as email_confirmed = true (since they are already active users)
update public.users set email_confirmed = true;

-- 3. Create or replace the RPC check function
create or replace function public.check_user_credentials_exist(
  email_to_check text default null,
  phone_to_check text default null,
  user_id_to_exclude uuid default null
)
returns table (email_exists boolean, phone_exists boolean)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    coalesce((
      select exists (
        select 1 from public.users 
        where email = email_to_check 
          and email_confirmed = true
          and (user_id_to_exclude is null or id <> user_id_to_exclude)
      )
    ), false) as email_exists,
    coalesce((
      select exists (
        select 1 from public.users 
        where phone = phone_to_check 
          and (user_id_to_exclude is null or id <> user_id_to_exclude)
      )
    ), false) as phone_exists;
end;
$$;
