
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
