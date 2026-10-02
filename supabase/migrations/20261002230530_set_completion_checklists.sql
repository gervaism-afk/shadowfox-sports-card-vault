create table public.set_checklists (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 title text not null check (length(trim(title)) between 1 and 150),
 sport text not null check (sport in ('Hockey','Baseball')),
 year text not null check (length(trim(year)) between 1 and 150),
 brand text not null check (length(trim(brand)) between 1 and 150),
 set_name text not null check (length(trim(set_name)) between 1 and 150),
 subset text not null default '' check (length(subset)<=150),
 parallel text not null default '' check (length(parallel)<=150),
 entries jsonb not null check (jsonb_typeof(entries)='array' and jsonb_array_length(entries) between 1 and 2000 and octet_length(entries::text)<=1000000),
 created_at timestamptz not null default now()
);
create index set_checklists_owner_idx on public.set_checklists(user_id);
alter table public.set_checklists enable row level security;
revoke all on public.set_checklists from anon,authenticated;
grant select,insert,update,delete on public.set_checklists to authenticated;
grant all on public.set_checklists to service_role;
create policy set_checklists_read on public.set_checklists for select to authenticated using ((select auth.uid())=user_id);
create policy set_checklists_insert on public.set_checklists for insert to authenticated with check ((select auth.uid())=user_id);
create policy set_checklists_update on public.set_checklists for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy set_checklists_delete on public.set_checklists for delete to authenticated using ((select auth.uid())=user_id);
