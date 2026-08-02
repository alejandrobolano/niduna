create table public.push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null unique check (
    expo_push_token ~ '^Expo(nent)?PushToken\\[[A-Za-z0-9_-]+\\]$'
  ),
  platform text not null check (platform in ('android', 'ios')),
  is_active boolean not null default true,
  last_registered_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index push_devices_user_active_idx
  on public.push_devices (user_id, is_active);

create table public.notification_preferences (
  family_id uuid not null,
  user_id uuid not null,
  feeding_enabled boolean not null default true,
  diaper_enabled boolean not null default true,
  sleep_enabled boolean not null default true,
  paused_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (family_id, user_id),
  foreign key (family_id, user_id)
    references public.family_members (family_id, user_id)
    on delete cascade
);

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  care_event_id uuid not null references public.care_events(id) on delete cascade,
  push_device_id uuid not null references public.push_devices(id) on delete cascade,
  expo_receipt_id text,
  status text not null default 'pending' check (
    status in ('pending', 'sent', 'delivered', 'failed')
  ),
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (care_event_id, push_device_id)
);

create index notification_deliveries_receipt_idx
  on public.notification_deliveries (expo_receipt_id)
  where expo_receipt_id is not null and status = 'sent';

alter table public.push_devices enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_deliveries enable row level security;

create policy push_devices_select_self
on public.push_devices for select
to authenticated
using (user_id = (select auth.uid()));

create policy push_devices_delete_self
on public.push_devices for delete
to authenticated
using (user_id = (select auth.uid()));

create policy notification_preferences_select_self
on public.notification_preferences for select
to authenticated
using (user_id = (select auth.uid()));

create policy notification_preferences_insert_self
on public.notification_preferences for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy notification_preferences_update_self
on public.notification_preferences for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create function private.set_notification_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger push_devices_set_updated_at
before update on public.push_devices
for each row execute function private.set_notification_updated_at();

create trigger notification_preferences_set_updated_at
before update on public.notification_preferences
for each row execute function private.set_notification_updated_at();

create function public.register_push_device(
  target_expo_push_token text,
  target_platform text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  registered_device_id uuid;
begin
  if current_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if target_platform not in ('android', 'ios') then
    raise exception 'invalid_push_platform' using errcode = '22023';
  end if;

  if target_expo_push_token !~ '^Expo(nent)?PushToken\\[[A-Za-z0-9_-]+\\]$' then
    raise exception 'invalid_expo_push_token' using errcode = '22023';
  end if;

  insert into public.push_devices (
    user_id,
    expo_push_token,
    platform,
    is_active,
    last_registered_at
  )
  values (
    current_user_id,
    target_expo_push_token,
    target_platform,
    true,
    now()
  )
  on conflict (expo_push_token) do update
  set user_id = excluded.user_id,
      platform = excluded.platform,
      is_active = true,
      last_registered_at = now()
  returning id into registered_device_id;

  return registered_device_id;
end;
$$;

revoke all on function private.set_notification_updated_at() from public;
revoke all on function public.register_push_device(text, text) from public, anon;
grant execute on function public.register_push_device(text, text) to authenticated;

grant select, delete on public.push_devices to authenticated;
grant select, insert, update on public.notification_preferences to authenticated;
