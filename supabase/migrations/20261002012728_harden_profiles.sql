begin;

-- Profile ownership is not permission to change authorization columns.
drop policy if exists "public read profiles for login" on public.profiles;
drop policy if exists "users insert own profile" on public.profiles;
drop policy if exists "users update own profile" on public.profiles;
drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile" on public.profiles for select
to authenticated using ((select auth.uid()) = id);
create policy "users update own profile" on public.profiles for update
to authenticated using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- Revoke table AND column grants, including grants inherited from PUBLIC.
revoke all on public.profiles from public, anon, authenticated;
revoke all (id, username, email, role, created_at) on public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant update (username) on public.profiles to authenticated;
grant select, insert, update, delete on public.profiles to service_role;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Signup creates profiles on the server and never accepts a role from metadata.
create or replace function private.create_user_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.email is null then return new; end if;
  insert into public.profiles (id, username, email, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'username'), ''), 'collector_' || new.id::text),
    new.email,
    'user'
  ) on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;
revoke all on function private.create_user_profile() from public, anon, authenticated;
drop trigger if exists shadowfox_create_user_profile on auth.users;
create trigger shadowfox_create_user_profile after insert or update of email on auth.users
for each row execute function private.create_user_profile();

-- Backfill missing profiles without modifying existing usernames or roles.
insert into public.profiles (id, username, email, role)
select u.id, 'collector_' || u.id::text, u.email, 'user'
from auth.users u where u.email is not null
and not exists (select 1 from public.profiles p where p.id = u.id)
on conflict do nothing;

-- Make exposure explicit for projects with opt-in Data API grants.
grant select, insert, update, delete on public.cards to authenticated, service_role;
grant select on public.site_content to anon, authenticated;
grant select, insert, update, delete on public.site_content to service_role;
revoke insert, update, delete on public.site_content from public, anon, authenticated;
revoke all on function public.is_admin(uuid) from public, anon;
revoke all on function public.admin_dashboard() from public, anon;
revoke all on function public.admin_users_overview() from public, anon;
grant execute on function public.is_admin(uuid), public.admin_dashboard(), public.admin_users_overview() to authenticated;

commit;
