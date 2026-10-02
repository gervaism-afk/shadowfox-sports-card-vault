begin;

create index if not exists cards_owner_created_idx on public.cards(user_id, created_at desc, id);

-- SQL UPDATE adds under the row lock, so concurrent additions cannot overwrite one another.
create or replace function public.increment_card_quantity(card_id uuid, amount integer)
returns public.cards language plpgsql security invoker set search_path = '' as $$
declare result public.cards;
begin
  if auth.uid() is null then raise exception 'Please log in'; end if;
  if amount is null or amount < 1 then raise exception 'Quantity must be positive'; end if;
  update public.cards set quantity = quantity + amount, updated_at = now()
  where id = card_id and user_id = auth.uid() returning * into result;
  if not found then raise exception 'Card not found'; end if;
  return result;
end;
$$;
revoke all on function public.increment_card_quantity(uuid, integer) from public, anon;
grant execute on function public.increment_card_quantity(uuid, integer) to authenticated;

-- Retain cleanup work after row deletion, image replacement, or a network failure.
create table if not exists public.card_image_cleanup (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  image_url text not null,
  created_at timestamptz not null default now(),
  unique (user_id, image_url)
);
alter table public.card_image_cleanup enable row level security;
revoke all on public.card_image_cleanup from public, anon, authenticated;
grant select, delete on public.card_image_cleanup to authenticated;
grant select, insert, update, delete on public.card_image_cleanup to service_role;
drop policy if exists "users read own image cleanup" on public.card_image_cleanup;
create policy "users read own image cleanup" on public.card_image_cleanup for select to authenticated
using ((select auth.uid()) = user_id);
drop policy if exists "users complete own image cleanup" on public.card_image_cleanup;
create policy "users complete own image cleanup" on public.card_image_cleanup for delete to authenticated
using ((select auth.uid()) = user_id);
create index if not exists card_image_cleanup_owner_idx on public.card_image_cleanup(user_id, created_at, id);

create or replace function private.queue_removed_card_images()
returns trigger language plpgsql security definer set search_path = '' as $$
declare image text; retained text[];
begin
  if tg_op = 'UPDATE' then retained := array[new.front_image_url, new.back_image_url];
  else retained := array[]::text[]; end if;
  foreach image in array array[old.front_image_url, old.back_image_url] loop
    if image <> '' and not (image = any(retained))
      and split_part(image, '/storage/v1/object/public/card-images/', 2) like old.user_id::text || '/%'
    then
      insert into public.card_image_cleanup(user_id, image_url) values(old.user_id, image)
      on conflict (user_id, image_url) do nothing;
    end if;
  end loop;
  return null;
end;
$$;
revoke all on function private.queue_removed_card_images() from public, anon, authenticated;
drop trigger if exists shadowfox_queue_removed_images on public.cards;
create trigger shadowfox_queue_removed_images after update of front_image_url, back_image_url or delete on public.cards
for each row execute function private.queue_removed_card_images();

commit;
