-- Price evidence belongs to one specific card identity and amount.
create or replace function public.clear_stale_price_evidence() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if new.price_evidence is not distinct from old.price_evidence and (
  new.estimated_value_cad is distinct from old.estimated_value_cad or
  row(new.sport,new.player,new.year,new.brand,new.set_name,new.subset,new.card_number,new.team,new.rookie,new.autograph,new.relic_patch,new.serial_number,new.parallel,new.grading_company,new.grade) is distinct from row(old.sport,old.player,old.year,old.brand,old.set_name,old.subset,old.card_number,old.team,old.rookie,old.autograph,old.relic_patch,old.serial_number,old.parallel,old.grading_company,old.grade)
 ) then new.price_evidence:=null; end if;
 return new;
end;
$$;
revoke all on function public.clear_stale_price_evidence() from public,anon,authenticated;
drop trigger clear_stale_price_evidence on public.cards;
create trigger clear_stale_price_evidence before update of estimated_value_cad,sport,player,year,brand,set_name,subset,card_number,team,rookie,autograph,relic_patch,serial_number,parallel,grading_company,grade on public.cards for each row execute function public.clear_stale_price_evidence();
