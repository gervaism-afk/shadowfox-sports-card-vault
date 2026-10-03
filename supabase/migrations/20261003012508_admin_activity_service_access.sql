-- Explicitly service-only: browser roles have neither grants nor policies.
create policy admin_activity_service_only on public.admin_activity
  for all to service_role using (true) with check (true);
create index admin_activity_actor_idx on public.admin_activity(actor_id) where actor_id is not null;
