create index notification_deliveries_push_device_idx
  on public.notification_deliveries (push_device_id);

create policy notification_deliveries_block_clients
on public.notification_deliveries
for all
to authenticated
using (false)
with check (false);

create function private.register_push_device(
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

create or replace function public.register_push_device(
  target_expo_push_token text,
  target_platform text
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.register_push_device(
    target_expo_push_token,
    target_platform
  );
$$;

revoke all on function private.register_push_device(text, text) from public;
revoke all on function public.register_push_device(text, text) from public, anon;
grant execute on function private.register_push_device(text, text) to authenticated;
grant execute on function public.register_push_device(text, text) to authenticated;
