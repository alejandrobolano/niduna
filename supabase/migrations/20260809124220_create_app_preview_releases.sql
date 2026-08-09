create table public.app_releases (
  eas_build_id uuid primary key,
  platform text not null check (platform in ('android', 'ios')),
  build_profile text not null,
  distribution text not null,
  app_version text not null,
  app_build_version text not null,
  build_details_url text not null check (
    build_details_url ~ '^https://expo\.dev/accounts/'
  ),
  artifact_url text not null check (
    artifact_url ~ '^https://expo\.dev/artifacts/eas/'
  ),
  git_commit_hash text,
  completed_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index app_releases_latest_idx
  on public.app_releases (platform, build_profile, completed_at desc);

create table public.app_release_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  eas_build_id uuid not null
    references public.app_releases(eas_build_id) on delete cascade,
  push_device_id uuid not null
    references public.push_devices(id) on delete cascade,
  expo_receipt_id text,
  status text not null default 'pending' check (
    status in ('pending', 'sent', 'failed')
  ),
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (eas_build_id, push_device_id)
);

alter table public.app_releases enable row level security;
alter table public.app_release_notification_deliveries enable row level security;

create policy app_releases_select_authenticated
on public.app_releases for select
to authenticated
using (true);

create trigger app_release_notification_deliveries_set_updated_at
before update on public.app_release_notification_deliveries
for each row execute function private.set_notification_updated_at();

revoke all on table public.app_releases from public, anon;
revoke all on table public.app_release_notification_deliveries from public, anon;

grant select on table public.app_releases to authenticated;
grant select, insert, update on table public.app_releases to service_role;
grant select, insert, update on table public.app_release_notification_deliveries
to service_role;
