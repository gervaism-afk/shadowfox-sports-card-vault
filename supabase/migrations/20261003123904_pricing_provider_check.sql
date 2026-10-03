-- A persistent reservation prevents concurrent diagnostic requests from starting paid runs twice.
create table public.pricing_provider_checks (
 id text primary key check(id='apify-suzuki-v1'),
 run_id text check(run_id is null or run_id ~ '^[A-Za-z0-9]{1,40}$'),
 state text not null default 'starting',
 result jsonb,
 created_at timestamptz not null default now()
);
alter table public.pricing_provider_checks enable row level security;
revoke all on public.pricing_provider_checks from public,anon,authenticated;
grant select,insert,update,delete on public.pricing_provider_checks to service_role;
