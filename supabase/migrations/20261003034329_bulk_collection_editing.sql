create function public.bulk_update_cards(card_ids uuid[], changes jsonb, target_binder_id uuid default null)
returns integer language plpgsql security invoker set search_path='' as $$
declare
 owner_id uuid:=auth.uid(); selected_count integer; locked_count integer; field_name text; field_value jsonb;
begin
 if owner_id is null then raise exception 'Sign in to update cards.'; end if;
 if card_ids is null or cardinality(card_ids)<1 or cardinality(card_ids)>500 then raise exception 'Select between 1 and 500 cards.'; end if;
 select count(distinct id) into selected_count from unnest(card_ids) id;
 if selected_count<>cardinality(card_ids) then raise exception 'Card selection contains duplicates or empty IDs.'; end if;
 if changes is null or jsonb_typeof(changes)<>'object' then raise exception 'Invalid bulk changes.'; end if;
 for field_name,field_value in select key,value from jsonb_each(changes) loop
  if field_name not in ('player','year','brand','set_name','subset','parallel','team','card_number') then raise exception 'Unsupported bulk field.'; end if;
  if jsonb_typeof(field_value)<>'string' or length(field_value#>>'{}')>250 then raise exception 'Use text of at most 250 characters.'; end if;
  if field_name='player' and length(btrim(field_value#>>'{}'))=0 then raise exception 'Player name cannot be empty.'; end if;
 end loop;
 if changes='{}'::jsonb and target_binder_id is null then raise exception 'Choose a field to change or a binder.'; end if;
 -- Lock and validate the whole selection before making any change. RLS remains active.
 perform id from public.cards where id=any(card_ids) and user_id=owner_id order by id for update;
 get diagnostics locked_count=row_count;
 if locked_count<>selected_count then raise exception 'Some selected cards are missing or unavailable. Refresh your collection.'; end if;
 if target_binder_id is not null then
  perform id from public.binders where id=target_binder_id and user_id=owner_id for key share;
  if not found then raise exception 'This binder is unavailable.'; end if;
 end if;
 if changes<>'{}'::jsonb then
  update public.cards c set
   player=case when changes?'player' then btrim(changes->>'player') else c.player end,
   year=case when changes?'year' then btrim(changes->>'year') else c.year end,
   brand=case when changes?'brand' then btrim(changes->>'brand') else c.brand end,
   set_name=case when changes?'set_name' then btrim(changes->>'set_name') else c.set_name end,
   subset=case when changes?'subset' then btrim(changes->>'subset') else c.subset end,
   parallel=case when changes?'parallel' then btrim(changes->>'parallel') else c.parallel end,
   team=case when changes?'team' then btrim(changes->>'team') else c.team end,
   card_number=case when changes?'card_number' then btrim(changes->>'card_number') else c.card_number end,
   price_evidence=case when exists(select 1 from jsonb_each_text(changes) f where btrim(f.value) is distinct from to_jsonb(c)->>f.key) then null else c.price_evidence end,
   updated_at=now()
  where c.id=any(card_ids) and c.user_id=owner_id;
 end if;
 if target_binder_id is not null then
  insert into public.binder_cards(user_id,binder_id,card_id)
   select owner_id,target_binder_id,id from unnest(card_ids) id
   on conflict(binder_id,card_id) do nothing;
 end if;
 return selected_count;
end;
$$;
revoke all on function public.bulk_update_cards(uuid[],jsonb,uuid) from public,anon,authenticated;
grant execute on function public.bulk_update_cards(uuid[],jsonb,uuid) to authenticated;
