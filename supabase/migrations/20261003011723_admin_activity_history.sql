create table public.admin_activity (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_label text not null check(length(actor_label)<=320),
  action text not null check(action in ('card.updated','card.deleted','user.role_changed','content.updated')),
  subject_type text not null check(subject_type in ('card','user','page')),
  subject_id text not null check(length(subject_id)<=150),
  summary text not null check(length(summary)<=500),
  details jsonb not null default '{}' check(jsonb_typeof(details)='object' and octet_length(details::text)<=12000)
);
alter table public.admin_activity enable row level security;
revoke all on public.admin_activity from public, anon, authenticated;
grant select,insert,update,delete on public.admin_activity to service_role;
create index admin_activity_created_idx on public.admin_activity(created_at desc,id desc);
create index admin_activity_action_created_idx on public.admin_activity(action,created_at desc,id desc);

-- Only the server's verified-admin service client attaches this context.
-- The trigger and mutation share a transaction: failed history insertion rolls back the change.
create function public.record_admin_activity() returns trigger
language plpgsql security invoker set search_path='' as $$
declare
  headers jsonb;
  actor uuid;
  actor_name text;
  actor_role text;
  before_row jsonb := '{}';
  after_row jsonb := '{}';
  verb text;
  kind text;
  target text;
  label text;
  metadata jsonb := '{}';
  changed jsonb;
begin
  if current_user <> 'service_role' then return null; end if;
  headers := coalesce(nullif(current_setting('request.headers',true),''),'{}')::jsonb;
  if nullif(headers->>'x-shadowfox-admin','') is null then return null; end if;
  actor := (headers->>'x-shadowfox-admin')::uuid;
  select role,coalesce(nullif(username,''),email,id::text) into actor_role,actor_name
    from public.profiles where id=actor;
  if actor_role is distinct from 'admin' then
    raise exception 'Admin activity requires a verified admin actor' using errcode='42501';
  end if;
  if tg_op <> 'INSERT' then before_row := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then after_row := to_jsonb(new); end if;

  if tg_table_name='cards' then
    kind := 'card'; target := coalesce(after_row->>'id',before_row->>'id');
    label := left(concat_ws(' ',coalesce(after_row->>'year',before_row->>'year'),coalesce(after_row->>'brand',before_row->>'brand'),coalesce(after_row->>'player',before_row->>'player')),500);
    if tg_op='DELETE' then verb := 'card.deleted';
    else
      select coalesce(jsonb_agg(key order by key),'[]') into changed
        from jsonb_each(after_row) where key not in ('id','user_id','created_at','updated_at','front_image_url','back_image_url')
        and value is distinct from before_row->key;
      if changed='[]'::jsonb then return null; end if;
      verb := 'card.updated'; metadata := jsonb_build_object('fields',changed);
    end if;
  elsif tg_table_name='profiles' then
    if before_row->'role' is not distinct from after_row->'role' then return null; end if;
    kind := 'user'; target := after_row->>'id'; verb := 'user.role_changed';
    label := left(coalesce(nullif(after_row->>'username',''),after_row->>'email',target),500);
    metadata := jsonb_build_object('from',before_row->>'role','to',after_row->>'role');
  elsif tg_table_name='site_content' then
    kind := 'page'; target := after_row->>'key'; verb := 'content.updated'; label := 'Site content: '||target;
    select coalesce(jsonb_agg(key order by key),'[]') into changed
      from (select jsonb_object_keys(coalesce(after_row->'value','{}')) key union select jsonb_object_keys(coalesce(before_row->'value','{}')) key) keys
      where (after_row->'value'->key) is distinct from (before_row->'value'->key);
    if changed='[]'::jsonb then return null; end if;
    metadata := jsonb_build_object('fields',changed);
  else return null;
  end if;
  insert into public.admin_activity(actor_id,actor_label,action,subject_type,subject_id,summary,details)
    values(actor,left(actor_name,320),verb,kind,target,label,metadata);
  return null;
end $$;
revoke all on function public.record_admin_activity() from public,anon,authenticated;
grant execute on function public.record_admin_activity() to service_role;
create trigger audit_admin_card_change after update or delete on public.cards for each row execute function public.record_admin_activity();
create trigger audit_admin_role_change after update of role on public.profiles for each row execute function public.record_admin_activity();
create trigger audit_admin_content_change after insert or update on public.site_content for each row execute function public.record_admin_activity();
