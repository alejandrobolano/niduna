create unique index family_members_one_owner_per_family_idx
  on public.family_members (family_id)
  where role = 'owner';

create function private.transfer_family_ownership(target_member_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_membership public.family_members%rowtype;
  target_membership public.family_members%rowtype;
begin
  if current_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select *
  into target_membership
  from public.family_members
  where id = target_member_id;

  if target_membership.id is null then
    raise exception 'family_member_not_found' using errcode = 'P0002';
  end if;

  perform 1
  from public.family_members
  where family_id = target_membership.family_id
  order by id
  for update;

  select *
  into current_membership
  from public.family_members
  where family_id = target_membership.family_id
    and user_id = current_user_id;

  select *
  into target_membership
  from public.family_members
  where id = target_member_id;

  if current_membership.id is null
    or current_membership.role <> 'owner'
    or target_membership.id is null
    or target_membership.family_id <> current_membership.family_id
    or target_membership.user_id = current_user_id
  then
    raise exception 'family_ownership_transfer_not_allowed'
      using errcode = '42501';
  end if;

  update public.family_members
  set role = 'admin'
  where id = current_membership.id;

  update public.family_members
  set role = 'owner'
  where id = target_membership.id;
end;
$$;

create function public.transfer_family_ownership(target_member_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.transfer_family_ownership(target_member_id);
$$;

revoke all on function private.transfer_family_ownership(uuid) from public;
revoke all on function public.transfer_family_ownership(uuid)
  from public, anon;

grant execute on function private.transfer_family_ownership(uuid)
  to authenticated;
grant execute on function public.transfer_family_ownership(uuid)
  to authenticated;
