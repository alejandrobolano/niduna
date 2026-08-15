create or replace function public.delete_personal_account_data(
  target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_user_id is null then
    raise exception 'account_user_required' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.family_members member
    where member.user_id = target_user_id
      and member.role = 'owner'
  ) then
    raise exception 'account_owns_family' using errcode = '23514';
  end if;

  delete from public.notification_preferences
  where user_id = target_user_id;

  delete from public.family_story_views
  where user_id = target_user_id;

  delete from public.push_devices
  where user_id = target_user_id;

  delete from public.web_push_devices
  where user_id = target_user_id;

  delete from public.family_members
  where user_id = target_user_id;

  delete from public.profiles
  where id = target_user_id;
end;
$$;

revoke all on function public.delete_personal_account_data(uuid)
from public, anon, authenticated;

grant execute on function public.delete_personal_account_data(uuid)
to service_role;
