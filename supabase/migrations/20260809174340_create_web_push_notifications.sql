create table public.web_push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  firebase_installation_id text not null unique check (
    firebase_installation_id ~ '^[A-Za-z0-9_-]{10,255}$'
  ),
  is_active boolean not null default true,
  last_registered_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index web_push_devices_user_active_idx
  on public.web_push_devices (user_id, is_active);

create table public.web_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  care_event_id uuid not null references public.care_events(id) on delete cascade,
  web_push_device_id uuid not null references public.web_push_devices(id) on delete cascade,
  fcm_message_id text,
  status text not null default 'pending' check (
    status in ('pending', 'sent', 'failed')
  ),
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (care_event_id, web_push_device_id)
);

create index web_notification_deliveries_device_idx
  on public.web_notification_deliveries (web_push_device_id);

alter table public.web_push_devices enable row level security;
alter table public.web_notification_deliveries enable row level security;

create policy web_push_devices_select_self
on public.web_push_devices for select
to authenticated
using (user_id = (select auth.uid()));

create policy web_push_devices_delete_self
on public.web_push_devices for delete
to authenticated
using (user_id = (select auth.uid()));

create policy web_notification_deliveries_block_clients
on public.web_notification_deliveries
for all
to authenticated
using (false)
with check (false);

create trigger web_push_devices_set_updated_at
before update on public.web_push_devices
for each row execute function private.set_notification_updated_at();

create trigger web_notification_deliveries_set_updated_at
before update on public.web_notification_deliveries
for each row execute function private.set_notification_updated_at();

create function private.register_web_push_device(
  target_firebase_installation_id text
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

  if target_firebase_installation_id !~ '^[A-Za-z0-9_-]{10,255}$' then
    raise exception 'invalid_firebase_installation_id' using errcode = '22023';
  end if;

  insert into public.web_push_devices (
    user_id,
    firebase_installation_id,
    is_active,
    last_registered_at
  )
  values (
    current_user_id,
    target_firebase_installation_id,
    true,
    now()
  )
  on conflict (firebase_installation_id) do update
  set user_id = excluded.user_id,
      is_active = true,
      last_registered_at = now()
  returning id into registered_device_id;

  return registered_device_id;
end;
$$;

create function public.register_web_push_device(
  target_firebase_installation_id text
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.register_web_push_device(target_firebase_installation_id);
$$;

revoke all on table public.web_push_devices from public, anon;
revoke all on table public.web_notification_deliveries from public, anon, authenticated;
revoke all on function private.register_web_push_device(text) from public;
revoke all on function public.register_web_push_device(text) from public, anon;

grant select, delete on table public.web_push_devices to authenticated;
grant execute on function private.register_web_push_device(text) to authenticated;
grant execute on function public.register_web_push_device(text) to authenticated;
grant select, update on table public.web_push_devices to service_role;
grant select, insert, update on table public.web_notification_deliveries to service_role;
