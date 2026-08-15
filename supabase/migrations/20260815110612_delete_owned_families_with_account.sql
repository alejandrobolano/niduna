create or replace function public.delete_owned_families_and_personal_account_data(
  target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  owned_family_ids uuid[];
begin
  if target_user_id is null then
    raise exception 'account_user_required' using errcode = '22023';
  end if;

  select coalesce(array_agg(member.family_id), array[]::uuid[])
  into owned_family_ids
  from public.family_members member
  where member.user_id = target_user_id
    and member.role = 'owner';

  delete from private.baby_archive_events event
  where event.family_id = any(owned_family_ids);

  delete from private.family_membership_removals removal
  where removal.family_id = any(owned_family_ids);

  delete from public.families family
  where family.id = any(owned_family_ids);

  perform public.delete_personal_account_data(target_user_id);
end;
$$;

revoke all on function public.delete_owned_families_and_personal_account_data(uuid)
from public, anon, authenticated;

grant execute on function public.delete_owned_families_and_personal_account_data(uuid)
to service_role;
