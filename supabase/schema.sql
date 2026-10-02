create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  email text unique not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "public read profiles for login" on public.profiles;


drop policy if exists "users insert own profile" on public.profiles;


drop policy if exists "users update own profile" on public.profiles;


create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sport text not null default 'Hockey',
  player text not null default '',
  year text not null default '',
  brand text not null default '',
  set_name text not null default '',
  subset text not null default '',
  card_number text not null default '',
  team text not null default '',
  rookie boolean not null default false,
  autograph boolean not null default false,
  relic_patch boolean not null default false,
  serial_number text not null default '',
  parallel text not null default '',
  grading_company text not null default '',
  grade text not null default '',
  quantity integer not null default 1,
  estimated_value_cad numeric(12,2) not null default 0,
  notes text not null default '',
  front_image_url text not null default '',
  back_image_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cards enable row level security;

drop policy if exists "users read own cards" on public.cards;
create policy "users read own cards" on public.cards for select using (auth.uid() = user_id);

drop policy if exists "users insert own cards" on public.cards;
create policy "users insert own cards" on public.cards for insert with check (auth.uid() = user_id);

drop policy if exists "users update own cards" on public.cards;
create policy "users update own cards" on public.cards for update using (auth.uid() = user_id);

drop policy if exists "users delete own cards" on public.cards;
create policy "users delete own cards" on public.cards for delete using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('card-images', 'card-images', true)
on conflict (id) do nothing;

drop policy if exists "users read own card images" on storage.objects;
create policy "users read own card images" on storage.objects for select
using (bucket_id = 'card-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users insert own card images" on storage.objects;
create policy "users insert own card images" on storage.objects for insert
with check (bucket_id = 'card-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users update own card images" on storage.objects;
create policy "users update own card images" on storage.objects for update
using (bucket_id = 'card-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users delete own card images" on storage.objects;
create policy "users delete own card images" on storage.objects for delete
using (bucket_id = 'card-images' and (storage.foldername(name))[1] = auth.uid()::text);

alter table public.profiles add column if not exists role text not null default 'user';

update public.profiles
set role = 'user'
where role is null or role not in ('user', 'admin');

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check check (role in ('user', 'admin'));

drop function if exists public.is_admin(uuid);
create or replace function public.is_admin(target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = target_user_id
      and role = 'admin'
  );
$$;

grant execute on function public.is_admin(uuid) to authenticated;

drop function if exists public.admin_dashboard();
create or replace function public.admin_dashboard()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result json;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Not authorized';
  end if;

  select json_build_object(
    'totalUsers', (select count(*) from public.profiles),
    'totalCards', (select count(*) from public.cards),
    'totalEstimatedValueCad', coalesce((select sum(estimated_value_cad * greatest(quantity, 1)) from public.cards), 0),
    'newUsers7d', (select count(*) from public.profiles where created_at >= now() - interval '7 days')
  ) into result;

  return result;
end;
$$;

grant execute on function public.admin_dashboard() to authenticated;

drop function if exists public.admin_users_overview();
create or replace function public.admin_users_overview()
returns table (
  id uuid,
  username text,
  email text,
  role text,
  created_at timestamptz,
  card_count bigint,
  total_estimated_value numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.username,
    p.email,
    p.role,
    p.created_at,
    count(c.id)::bigint as card_count,
    coalesce(sum(c.estimated_value_cad * greatest(c.quantity, 1)), 0)::numeric as total_estimated_value
  from public.profiles p
  left join public.cards c on c.user_id = p.id
  where public.is_admin(auth.uid())
  group by p.id, p.username, p.email, p.role, p.created_at
  order by p.created_at desc;
$$;

grant execute on function public.admin_users_overview() to authenticated;

-- Site content and profile hardening for fresh installations.

create table if not exists public.site_content (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_content enable row level security;

drop policy if exists "site_content_public_read" on public.site_content;
create policy "site_content_public_read"
on public.site_content
for select
to anon, authenticated
using (true);

insert into public.site_content (key, value) values
('homepage', '{}'::jsonb),
('scan', '{}'::jsonb),
('manual', '{}'::jsonb),
('collection', '{}'::jsonb),
('analytics', '{}'::jsonb)
on conflict (key) do nothing;

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

-- Atomic quantity increments and durable image cleanup.
begin;

create index if not exists cards_owner_created_idx on public.cards(user_id, created_at desc, id);

-- SQL UPDATE adds under the row lock, so concurrent additions cannot overwrite one another.
create or replace function public.increment_card_quantity(card_id uuid, amount integer)
returns public.cards language plpgsql security invoker set search_path = '' as $$
declare result public.cards;
begin
  if auth.uid() is null then raise exception 'Please log in'; end if;
  if amount is null or amount < 1 then raise exception 'Quantity must be positive'; end if;
  update public.cards set quantity = quantity + amount, updated_at = now()
  where id = card_id and user_id = auth.uid() returning * into result;
  if not found then raise exception 'Card not found'; end if;
  return result;
end;
$$;
revoke all on function public.increment_card_quantity(uuid, integer) from public, anon;
grant execute on function public.increment_card_quantity(uuid, integer) to authenticated;

-- Retain cleanup work after row deletion, image replacement, or a network failure.
create table if not exists public.card_image_cleanup (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  image_url text not null,
  created_at timestamptz not null default now(),
  unique (user_id, image_url)
);
alter table public.card_image_cleanup enable row level security;
revoke all on public.card_image_cleanup from public, anon, authenticated;
grant select, delete on public.card_image_cleanup to authenticated;
grant select, insert, update, delete on public.card_image_cleanup to service_role;
drop policy if exists "users read own image cleanup" on public.card_image_cleanup;
create policy "users read own image cleanup" on public.card_image_cleanup for select to authenticated
using ((select auth.uid()) = user_id);
drop policy if exists "users complete own image cleanup" on public.card_image_cleanup;
create policy "users complete own image cleanup" on public.card_image_cleanup for delete to authenticated
using ((select auth.uid()) = user_id);
create index if not exists card_image_cleanup_owner_idx on public.card_image_cleanup(user_id, created_at, id);

create or replace function private.queue_removed_card_images()
returns trigger language plpgsql security definer set search_path = '' as $$
declare image text; retained text[];
begin
  if tg_op = 'UPDATE' then retained := array[new.front_image_url, new.back_image_url];
  else retained := array[]::text[]; end if;
  foreach image in array array[old.front_image_url, old.back_image_url] loop
    if image <> '' and not (image = any(retained))
      and split_part(image, '/storage/v1/object/public/card-images/', 2) like old.user_id::text || '/%'
    then
      insert into public.card_image_cleanup(user_id, image_url) values(old.user_id, image)
      on conflict (user_id, image_url) do nothing;
    end if;
  end loop;
  return null;
end;
$$;
revoke all on function private.queue_removed_card_images() from public, anon, authenticated;
drop trigger if exists shadowfox_queue_removed_images on public.cards;
create trigger shadowfox_queue_removed_images after update of front_image_url, back_image_url or delete on public.cards
for each row execute function private.queue_removed_card_images();

commit;
