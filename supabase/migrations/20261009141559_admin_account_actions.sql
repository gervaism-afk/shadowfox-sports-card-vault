alter table public.admin_activity drop constraint admin_activity_action_check;
alter table public.admin_activity add constraint admin_activity_action_check check (action in ('card.updated','card.deleted','user.role_changed','content.updated','user.reset_email','user.recovery_link','user.delete','user.reactivate'));
