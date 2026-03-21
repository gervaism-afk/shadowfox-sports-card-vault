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

insert into public.site_content (key, value)
values (
  'homepage',
  '{
    "heroEyebrow": "ShadowFox Sports Cards",
    "heroTitle": "Track Your Collection Like a Pro",
    "heroSubtitle": "ShadowFox Sports Cards helps you scan, organize, and value your cards with a premium collector-first experience.",
    "primaryLabel": "Start Scanning",
    "primaryHref": "/scan",
    "secondaryLabel": "View Collection",
    "secondaryHref": "/collection",
    "loginHeading": "Log in or create your ShadowFox vault",
    "loginText": "Sign in to manage your collection, unlock analytics, and keep your card vault synced and protected.",
    "feature1Icon": "📸",
    "feature1Title": "Scan Cards",
    "feature1Text": "Quickly capture card data and move cards into your vault faster.",
    "feature2Icon": "📊",
    "feature2Title": "Track Value",
    "feature2Text": "Monitor collection totals, card counts, and portfolio insights.",
    "feature3Icon": "🗂️",
    "feature3Title": "Organize Easily",
    "feature3Text": "Sort, filter, and manage your collection in one premium workspace."
  }'::jsonb
)
on conflict (key) do nothing;
