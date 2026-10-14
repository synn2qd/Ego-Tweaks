-- Ego Tweaks: shared accounts metadata and download analytics for Supabase.
-- Run in Supabase Dashboard > SQL Editor. Safe for a fresh setup; does not alter auth settings.
-- Browser clients must use only the publishable/anon key. Never expose secret/service_role keys.

create extension if not exists pgcrypto;

-- Profile rows are created automatically for every new Supabase Auth user.
create table if not exists public.ego_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (char_length(username) between 3 and 20 and username ~ '^[A-Za-z0-9_.-]+$'),
  created_at timestamptz not null default now()
);

create table if not exists public.ego_download_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  file_name text not null check (char_length(file_name) between 1 and 180),
  version text not null check (char_length(version) between 1 and 40)
);

alter table public.ego_profiles enable row level security;
alter table public.ego_download_events enable row level security;

-- Admin status is assigned only by trusted SQL using auth.users.raw_app_meta_data.
-- Do not use user-editable raw_user_meta_data for authorization.
create or replace function public.ego_is_admin()
returns boolean
language sql stable security invoker
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

-- Profiles are not publicly enumerable. Users can read/update only their own profile.
drop policy if exists "profile owner can read" on public.ego_profiles;
create policy "profile owner can read" on public.ego_profiles
for select to authenticated using (id = (select auth.uid()) or (select public.ego_is_admin()));

drop policy if exists "profile owner can update username" on public.ego_profiles;
create policy "profile owner can update username" on public.ego_profiles
for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Only admins can read detailed download events. Public visitors can submit limited
-- anonymous click events; counts can be spammed, so treat as approximate analytics.
drop policy if exists "admin reads download events" on public.ego_download_events;
create policy "admin reads download events" on public.ego_download_events
for select to authenticated using ((select public.ego_is_admin()));

drop policy if exists "visitors record download clicks" on public.ego_download_events;
create policy "visitors record download clicks" on public.ego_download_events
for insert to anon, authenticated with check (
  (user_id is null or user_id = (select auth.uid()))
  and file_name in ('EgoTweaks.exe')
  and char_length(version) between 1 and 40
);

-- Prevent direct client inserts/deletes to profile rows. The trigger below runs as owner.
revoke all on public.ego_profiles from anon, authenticated;
grant select on public.ego_profiles to authenticated;
grant update (username) on public.ego_profiles to authenticated;
revoke all on public.ego_download_events from anon, authenticated;
grant select, insert on public.ego_download_events to anon, authenticated;

create or replace function public.ego_handle_new_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  desired_username text;
  base_username text;
begin
  desired_username := coalesce(new.raw_user_meta_data ->> 'username', split_part(coalesce(new.email, 'user'), '@', 1));
  desired_username := regexp_replace(desired_username, '[^A-Za-z0-9_.-]', '', 'g');
  if char_length(desired_username) < 3 then desired_username := 'user_' || left(replace(new.id::text, '-', ''), 10); end if;
  if char_length(desired_username) > 20 then desired_username := left(desired_username, 20); end if;
  base_username := desired_username;
  if exists (select 1 from public.ego_profiles p where lower(p.username) = lower(desired_username) and p.id <> new.id) then
    desired_username := left(base_username, 10) || '_' || left(replace(new.id::text, '-', ''), 8);
  end if;
  insert into public.ego_profiles (id, username)
  values (new.id, desired_username)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists ego_auth_user_created on auth.users;
create trigger ego_auth_user_created
after insert on auth.users
for each row execute procedure public.ego_handle_new_user();

-- Admin-only statistics RPC. It checks the trusted app_metadata role on every call.
drop view if exists public.ego_admin_stats;
create or replace function public.ego_get_admin_stats()
returns table (registered_accounts bigint, tracked_download_clicks bigint, downloads_last_30_days bigint)
language plpgsql stable security invoker
set search_path = ''
as $$
begin
  if not coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false) then
    raise exception 'admin access required' using errcode = '42501';
  end if;
  return query select
    (select count(*) from public.ego_profiles),
    (select count(*) from public.ego_download_events),
    (select count(*) from public.ego_download_events where created_at >= now() - interval '30 days');
end;
$$;
revoke all on function public.ego_get_admin_stats() from public, anon;
grant execute on function public.ego_get_admin_stats() to authenticated;

-- Admin must be assigned after this email has signed up in Supabase Auth.
-- Run separately after registration, replacing the email if needed:
-- update auth.users
-- set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
-- where lower(email) = lower('kellanevers100@gmail.com');
-- Then sign out and sign back in so the new JWT includes the admin role.
