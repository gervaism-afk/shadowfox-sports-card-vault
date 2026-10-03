create table public.sold_price_cache (
 query_key text primary key check(length(query_key)=64),
 state text not null default 'starting',run_id text,
 result jsonb,updated_at timestamptz not null default now()
);
create table public.sold_price_budget (
 month date primary key,lookups integer not null default 0 check(lookups between 0 and 50)
);
alter table public.sold_price_cache enable row level security;
alter table public.sold_price_budget enable row level security;
revoke all on public.sold_price_cache,public.sold_price_budget from public,anon,authenticated;
grant all on public.sold_price_cache,public.sold_price_budget to service_role;
create function public.reserve_sold_price_lookup(cache_key text) returns text
language plpgsql security invoker set search_path='' as $$
declare cached public.sold_price_cache; current_month date:=date_trunc('month',now() at time zone 'UTC')::date; used integer;
begin
 if cache_key is null or cache_key!~'^[a-f0-9]{64}$' then raise exception 'Invalid cache key'; end if;
 perform pg_advisory_xact_lock(hashtextextended(cache_key,0));
 select * into cached from public.sold_price_cache where query_key=cache_key;
 if found then
  if cached.state='SUCCEEDED' and cached.updated_at>now()-interval '24 hours' then return 'cached'; end if;
  if cached.state in ('starting','READY','RUNNING') and cached.updated_at>now()-interval '3 minutes' then return 'pending'; end if;
  if cached.state='failed' and cached.updated_at>now()-interval '6 hours' then return 'failed'; end if;
 end if;
 insert into public.sold_price_budget(month) values(current_month) on conflict do nothing;
 select lookups into used from public.sold_price_budget where month=current_month for update;
 if used>=50 then return 'budget'; end if;
 update public.sold_price_budget set lookups=lookups+1 where month=current_month;
 insert into public.sold_price_cache(query_key,state) values(cache_key,'starting')
 on conflict(query_key) do update set state='starting',run_id=null,result=null,updated_at=now();
 return 'start';
end;
$$;
revoke all on function public.reserve_sold_price_lookup(text) from public,anon,authenticated;
grant execute on function public.reserve_sold_price_lookup(text) to service_role;
