alter table public.notification_preferences
  add column note_enabled boolean not null default true,
  add column measurement_enabled boolean not null default true;

create table public.family_activity_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('note', 'measurement')),
  source_id uuid not null,
  channel text not null check (channel in ('native', 'web')),
  device_id uuid not null,
  provider_message_id text,
  status text not null default 'pending' check (
    status in ('pending', 'sent', 'delivered', 'failed')
  ),
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_type, source_id, channel, device_id)
);

create index family_activity_notification_deliveries_receipt_idx
  on public.family_activity_notification_deliveries (provider_message_id)
  where channel = 'native'
    and provider_message_id is not null
    and status = 'sent';

alter table public.family_activity_notification_deliveries
  enable row level security;

create policy family_activity_notification_deliveries_block_clients
on public.family_activity_notification_deliveries
for all
to authenticated
using (false)
with check (false);

create trigger family_activity_notification_deliveries_set_updated_at
before update on public.family_activity_notification_deliveries
for each row execute function private.set_notification_updated_at();

revoke all on table public.family_activity_notification_deliveries
from public, anon, authenticated;

grant select on table public.babies to service_role;
grant select on table public.baby_followers to service_role;
grant select on table public.notification_preferences to service_role;
grant select, update on table public.push_devices to service_role;
grant select, update on table public.web_push_devices to service_role;
grant select, insert, update
on table public.family_activity_notification_deliveries
to service_role;
