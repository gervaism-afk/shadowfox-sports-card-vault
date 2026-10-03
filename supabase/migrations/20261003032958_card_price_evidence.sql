alter table public.cards add column price_evidence jsonb;
alter table public.cards add constraint card_price_evidence_shape check (
 price_evidence is null or (
  jsonb_typeof(price_evidence)='object' and octet_length(price_evidence::text)<=60000
  and price_evidence ?& array['checkedAt','method','sourceLabel','sourceUrl','estimateCad','sales']
  and price_evidence->>'method' in ('manual','reviewed-sales')
  and jsonb_typeof(price_evidence->'checkedAt')='string'
  and jsonb_typeof(price_evidence->'sourceLabel')='string'
  and jsonb_typeof(price_evidence->'sourceUrl')='string'
  and jsonb_typeof(price_evidence->'estimateCad')='number'
  and (price_evidence->>'estimateCad')::numeric=estimated_value_cad
  and jsonb_typeof(price_evidence->'sales')='array'
  and jsonb_array_length(price_evidence->'sales')<=100
  and length(price_evidence->>'sourceLabel')<=150 and length(price_evidence->>'sourceUrl')<=1000
 )
);
-- Existing integrations that change only the amount cannot leave evidence supporting an old value.
create function public.clear_stale_price_evidence() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if new.estimated_value_cad is distinct from old.estimated_value_cad and new.price_evidence is not distinct from old.price_evidence then new.price_evidence:=null; end if;
 return new;
end;
$$;
revoke all on function public.clear_stale_price_evidence() from public,anon,authenticated;
create trigger clear_stale_price_evidence before update of estimated_value_cad on public.cards for each row execute function public.clear_stale_price_evidence();
