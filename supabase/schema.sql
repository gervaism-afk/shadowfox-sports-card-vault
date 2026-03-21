create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  email text unique not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "public read profiles for login" on public.profiles;
create policy "public read profiles for login" on public.profiles for select using (true);

drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles for update using (auth.uid() = id);

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
