-- Admin upgrade
alter table public.profiles add column if not exists role text not null default 'user';
update public.profiles set role = 'user' where role is null or role not in ('user','admin');
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('user', 'admin'));
create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists cards_user_id_idx on public.cards(user_id);
