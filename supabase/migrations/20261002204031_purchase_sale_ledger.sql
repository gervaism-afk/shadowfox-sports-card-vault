-- Monetary amounts are total CAD cents for the entire transaction, never per-card estimates.
create table public.card_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  card_id uuid,
  card_label text not null check (length(btrim(card_label)) between 1 and 1000),
  kind text not null check (kind in ('purchase','sale')),
  occurred_on date not null,
  quantity integer not null check (quantity between 1 and 100000),
  amount_cents integer not null check (amount_cents between 0 and 100000000),
  fees_cents integer not null default 0 check (fees_cents between 0 and 100000000),
  cost_cents integer check (cost_cents between 0 and 100000000),
  notes text not null default '' check (length(notes) <= 4000),
  created_at timestamptz not null default now(),
  constraint purchase_has_no_sale_cost check (kind = 'sale' or cost_cents is null),
  constraint transaction_card_owner foreign key (card_id,user_id)
    references public.cards(id,user_id) on delete set null (card_id)
);
create index card_transactions_owner_date_idx on public.card_transactions(user_id,occurred_on desc,id);
create index card_transactions_card_owner_idx on public.card_transactions(card_id,user_id) where card_id is not null;
alter table public.card_transactions enable row level security;
create policy own_transactions on public.card_transactions for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.card_transactions from public,anon,authenticated;
grant select,insert,delete on public.card_transactions to authenticated;
grant update(card_id,card_label,kind,occurred_on,quantity,amount_cents,fees_cents,cost_cents,notes) on public.card_transactions to authenticated;
grant all on public.card_transactions to service_role;
