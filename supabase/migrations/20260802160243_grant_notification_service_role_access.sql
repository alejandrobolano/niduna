grant select on table public.babies to service_role;
grant select on table public.baby_followers to service_role;
grant select on table public.notification_preferences to service_role;
grant select, update on table public.push_devices to service_role;
grant select, insert, update on table public.notification_deliveries
to service_role;
