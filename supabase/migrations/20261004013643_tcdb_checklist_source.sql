alter table public.set_checklists
 drop constraint if exists set_checklists_source_url_check;
alter table public.set_checklists
 add constraint set_checklists_source_url_check check (
  source_url is null or
  source_url ~ '^https://(upperdeck\.com/checklist/|baseballcardpedia\.com/index\.php/)' or
  source_url ~ '^https://www\.tcdb\.com/Checklist\.cfm/sid/[0-9]+/[A-Za-z0-9%_.-]+$'
 );
