drop function public.create_family(text);

create function private.update_family_identity(
  target_family_id uuid,
  target_relationship public.family_relationship,
  target_display_name text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  normalized_display_name text := nullif(trim(target_display_name), '');
begin
  if current_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if normalized_display_name is null
    or char_length(normalized_display_name) > 80
  then
    raise exception 'invalid_display_name' using errcode = '22023';
  end if;

  update public.family_members
  set relationship = target_relationship
  where family_id = target_family_id
    and user_id = current_user_id;

  if not found then
    raise exception 'family_membership_not_found' using errcode = 'P0002';
  end if;

  update public.profiles
  set display_name = normalized_display_name
  where id = current_user_id;
end;
$$;

revoke all on function private.update_family_identity(
  uuid,
  public.family_relationship,
  text
) from public;

grant execute on function private.update_family_identity(
  uuid,
  public.family_relationship,
  text
) to authenticated;

create function public.update_my_family_identity(
  target_family_id uuid,
  target_relationship public.family_relationship,
  target_display_name text
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.update_family_identity(
    target_family_id,
    target_relationship,
    target_display_name
  );
$$;

create function public.create_family(
  target_name text,
  target_relationship public.family_relationship,
  target_display_name text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  saved_family_id uuid := gen_random_uuid();
  normalized_name text := trim(target_name);
begin
  if (select auth.uid()) is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if normalized_name = '' or char_length(normalized_name) > 80 then
    raise exception 'invalid_family_name' using errcode = '22023';
  end if;

  insert into public.families (id, name)
  values (saved_family_id, normalized_name);

  perform private.update_family_identity(
    saved_family_id,
    target_relationship,
    target_display_name
  );

  return saved_family_id;
end;
$$;

revoke all on function public.update_my_family_identity(
  uuid,
  public.family_relationship,
  text
) from public, anon;

revoke all on function public.create_family(
  text,
  public.family_relationship,
  text
) from public, anon;

grant execute on function public.update_my_family_identity(
  uuid,
  public.family_relationship,
  text
) to authenticated;

grant execute on function public.create_family(
  text,
  public.family_relationship,
  text
) to authenticated;
