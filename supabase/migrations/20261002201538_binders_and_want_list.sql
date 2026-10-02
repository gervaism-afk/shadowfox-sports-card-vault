create table public.binders (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 name text not null check (length(trim(name)) between 1 and 80),
 created_at timestamptz not null default now(),
 unique (id,user_id), unique (user_id,name)
);
create unique index cards_id_owner_key on public.cards(id,user_id);
create table public.binder_cards (
 user_id uuid not null default auth.uid(),
 binder_id uuid not null,
 card_id uuid not null,
 created_at timestamptz not null default now(),
 primary key (binder_id,card_id),
 foreign key (binder_id,user_id) references public.binders(id,user_id) on delete cascade,
 foreign key (card_id,user_id) references public.cards(id,user_id) on delete cascade
);
create index binder_cards_owner on public.binder_cards(user_id,binder_id);
create index binder_cards_card_owner on public.binder_cards(card_id,user_id);
create table public.want_list (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 card_data jsonb not null check (jsonb_typeof(card_data) = 'object' and card_data ?& array['player','sport','quantity'] and jsonb_typeof(card_data->'player') = 'string' and jsonb_typeof(card_data->'sport') = 'string' and jsonb_typeof(card_data->'quantity') = 'number' and length(card_data::text) <= 12000 and length(trim(card_data->>'player')) between 1 and 250 and card_data->>'sport' in ('Hockey','Baseball') and (card_data->>'quantity')::numeric between 1 and 100000 and (card_data->>'quantity')::numeric = trunc((card_data->>'quantity')::numeric)),
 created_at timestamptz not null default now()
);
create index want_list_owner_created on public.want_list(user_id,created_at,id);
alter table public.binders enable row level security;
alter table public.binder_cards enable row level security;
alter table public.want_list enable row level security;
create policy "owner binders" on public.binders for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "owner binder cards" on public.binder_cards for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "owner wants" on public.want_list for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
revoke all on public.binders, public.binder_cards, public.want_list from public,anon,authenticated;
grant select,insert,delete on public.binders, public.binder_cards, public.want_list to authenticated;
grant update(name) on public.binders to authenticated;
grant update(card_data) on public.want_list to authenticated;
grant all on public.binders, public.binder_cards, public.want_list to service_role;

-- The caller's RLS applies to every row. Locking the wanted entry prevents double moves.
create function public.acquire_wanted_card(want_id uuid, existing_card_id uuid default null)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare wanted jsonb; new_id uuid; qty integer;
begin
 select card_data into wanted from public.want_list where id=want_id and user_id=auth.uid() for update;
 if not found then raise exception 'This wanted card was already moved or is unavailable.'; end if;
 qty := (wanted->>'quantity')::integer;
 if existing_card_id is not null then
  update public.cards set quantity=quantity+qty,updated_at=now() where id=existing_card_id and user_id=auth.uid() returning id into new_id;
  if not found then raise exception 'The matching owned card is unavailable.'; end if;
 else
  insert into public.cards(user_id,sport,player,year,brand,set_name,subset,card_number,team,rookie,autograph,relic_patch,serial_number,parallel,grading_company,grade,quantity,estimated_value_cad,notes,front_image_url,back_image_url)
  values(auth.uid(),wanted->>'sport',wanted->>'player',coalesce(wanted->>'year',''),coalesce(wanted->>'brand',''),coalesce(wanted->>'set',''),coalesce(wanted->>'subset',''),coalesce(wanted->>'cardNumber',''),coalesce(wanted->>'team',''),coalesce((wanted->>'rookie')::boolean,false),coalesce((wanted->>'autograph')::boolean,false),coalesce((wanted->>'relicPatch')::boolean,false),coalesce(wanted->>'serialNumber',''),coalesce(wanted->>'parallel',''),coalesce(wanted->>'gradingCompany',''),coalesce(wanted->>'grade',''),qty,0,coalesce(wanted->>'notes',''),'','') returning id into new_id;
 end if;
 delete from public.want_list where id=want_id and user_id=auth.uid();
 return new_id;
end;
$$;
revoke all on function public.acquire_wanted_card(uuid,uuid) from public,anon;
grant execute on function public.acquire_wanted_card(uuid,uuid) to authenticated,service_role;
