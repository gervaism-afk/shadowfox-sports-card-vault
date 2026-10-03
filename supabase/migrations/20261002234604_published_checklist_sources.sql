alter table public.set_checklists
 add column source_url text check (source_url is null or source_url ~ '^https://(upperdeck\.com/checklist/|baseballcardpedia\.com/index\.php/)'),
 add column source_name text check (source_name is null or length(source_name)<=150),
 add column source_checked_at timestamptz;
