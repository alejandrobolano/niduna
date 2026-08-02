alter table public.push_devices
drop constraint push_devices_expo_push_token_check;

alter table public.push_devices
add constraint push_devices_expo_push_token_check check (
  expo_push_token ~ '^Expo(nent)?PushToken[[][A-Za-z0-9_-]+[]]$'
);

create or replace function private.register_push_device(
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

  if target_expo_push_token !~ '^Expo(nent)?PushToken[[][A-Za-z0-9_-]+[]]$' then
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
