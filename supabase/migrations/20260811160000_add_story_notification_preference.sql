alter table public.notification_preferences
  add column story_enabled boolean not null default true;

alter table public.family_activity_notification_deliveries
  drop constraint if exists family_activity_notification_deliveries_source_type_check;

alter table public.family_activity_notification_deliveries
  add constraint family_activity_notification_deliveries_source_type_check
  check (source_type in ('note', 'measurement', 'story'));
