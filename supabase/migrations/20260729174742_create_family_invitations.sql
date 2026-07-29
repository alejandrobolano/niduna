create table public.family_invitations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  code_hash bytea not null unique,
  role public.family_role not null check (role <> 'owner'),
  created_by uuid not null default auth.uid() references auth.users(id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint family_invitations_acceptance_complete check (
    (accepted_at is null and accepted_by is null)
    or (accepted_at is not null and accepted_by is not null)
  ),
  constraint family_invitations_single_outcome check (
    accepted_at is null or revoked_at is null
  ),
  constraint family_invitations_future_expiry check (
    expires_at > created_at
  )
);

create index family_invitations_family_active_idx
  on public.family_invitations (family_id, expires_at)
  where accepted_at is null and revoked_at is null;

alter table public.family_invitations enable row level security;

create policy family_invitations_select_admins
on public.family_invitations for select
to authenticated
using (
  private.has_family_role(
    family_id,
    array['owner', 'admin']::public.family_role[]
  )
);

create policy family_invitations_insert_admins
on public.family_invitations for insert
to authenticated
with check (
  private.has_family_role(
    family_id,
    array['owner', 'admin']::public.family_role[]
  )
  and created_by = (select auth.uid())
  and role <> 'owner'
);

create policy family_invitations_update_admins
on public.family_invitations for update
to authenticated
using (
  private.has_family_role(
    family_id,
    array['owner', 'admin']::public.family_role[]
  )
)
with check (
  private.has_family_role(
    family_id,
    array['owner', 'admin']::public.family_role[]
  )
);

grant select (
  id,
  family_id,
  role,
  created_by,
  expires_at,
  accepted_at,
  accepted_by,
  revoked_at,
  created_at
) on public.family_invitations to authenticated;

grant insert (
  family_id,
  code_hash,
  role,
  created_by,
  expires_at
) on public.family_invitations to authenticated;

grant update (revoked_at) on public.family_invitations to authenticated;

create function private.shares_family_with(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    target_user_id = (select auth.uid())
    or exists (
      select 1
      from public.family_members current_member
      join public.family_members target_member
        on target_member.family_id = current_member.family_id
      where current_member.user_id = (select auth.uid())
        and target_member.user_id = target_user_id
    );
$$;

revoke all on function private.shares_family_with(uuid) from public;
grant execute on function private.shares_family_with(uuid) to authenticated;

create policy profiles_select_shared_family
on public.profiles for select
to authenticated
using (private.shares_family_with(id));

create function public.create_family(target_name text)
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

  return saved_family_id;
end;
$$;

create function public.create_family_invitation(
  target_family_id uuid,
  target_role public.family_role,
  validity_hours integer default 48
)
returns table (
  invitation_id uuid,
  invitation_code text,
  invitation_expires_at timestamptz
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  generated_code text;
  saved_invitation_id uuid;
  saved_expires_at timestamptz;
begin
  if (select auth.uid()) is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if target_role = 'owner' then
    raise exception 'owner_invitations_are_not_allowed' using errcode = '22023';
  end if;

  if validity_hours < 1 or validity_hours > 168 then
    raise exception 'invalid_invitation_validity' using errcode = '22023';
  end if;

  loop
    generated_code := upper(encode(extensions.gen_random_bytes(8), 'hex'));
    saved_expires_at := now() + make_interval(hours => validity_hours);

    begin
      insert into public.family_invitations (
        family_id,
        code_hash,
        role,
        expires_at
      )
      values (
        target_family_id,
        extensions.digest(generated_code, 'sha256'),
        target_role,
        saved_expires_at
      )
      returning id into saved_invitation_id;

      exit;
    exception
      when unique_violation then
        continue;
    end;
  end loop;

  return query
  select saved_invitation_id, generated_code, saved_expires_at;
end;
$$;

create function public.revoke_family_invitation(target_invitation_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  update public.family_invitations
  set revoked_at = now()
  where id = target_invitation_id
    and accepted_at is null
    and revoked_at is null;

  if not found then
    raise exception 'invitation_not_found' using errcode = 'P0002';
  end if;
end;
$$;

create function private.accept_family_invitation(
  target_code text,
  target_relationship public.family_relationship,
  target_display_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  normalized_code text;
  normalized_display_name text := nullif(trim(target_display_name), '');
  selected_invitation public.family_invitations%rowtype;
begin
  if current_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  normalized_code := regexp_replace(
    upper(trim(target_code)),
    '[[:space:]-]',
    '',
    'g'
  );

  if normalized_code !~ '^[0-9A-F]{16}$' then
    raise exception 'invalid_invitation_code' using errcode = '22023';
  end if;

  if normalized_display_name is null
    or char_length(normalized_display_name) > 80
  then
    raise exception 'invalid_display_name' using errcode = '22023';
  end if;

  select *
  into selected_invitation
  from public.family_invitations
  where code_hash = extensions.digest(normalized_code, 'sha256')
  for update;

  if selected_invitation.id is null
    or selected_invitation.accepted_at is not null
    or selected_invitation.revoked_at is not null
    or selected_invitation.expires_at <= now()
  then
    raise exception 'invitation_unavailable' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.family_members
    where family_id = selected_invitation.family_id
      and user_id = current_user_id
  )
  then
    raise exception 'already_family_member' using errcode = '23505';
  end if;

  insert into public.family_members (
    family_id,
    user_id,
    role,
    relationship,
    created_by
  )
  values (
    selected_invitation.family_id,
    current_user_id,
    selected_invitation.role,
    target_relationship,
    selected_invitation.created_by
  );

  update public.family_invitations
  set
    accepted_at = now(),
    accepted_by = current_user_id
  where id = selected_invitation.id;

  update public.profiles
  set display_name = normalized_display_name
  where id = current_user_id;

  return selected_invitation.family_id;
end;
$$;

revoke all on function private.accept_family_invitation(
  text,
  public.family_relationship,
  text
) from public;

grant execute on function private.accept_family_invitation(
  text,
  public.family_relationship,
  text
) to authenticated;

create function public.accept_family_invitation(
  target_code text,
  target_relationship public.family_relationship,
  target_display_name text
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.accept_family_invitation(
    target_code,
    target_relationship,
    target_display_name
  );
$$;

revoke all on function public.create_family(text) from public, anon;
revoke all on function public.create_family_invitation(
  uuid,
  public.family_role,
  integer
) from public, anon;
revoke all on function public.revoke_family_invitation(uuid) from public, anon;
revoke all on function public.accept_family_invitation(
  text,
  public.family_relationship,
  text
) from public, anon;

grant execute on function public.create_family(text) to authenticated;
grant execute on function public.create_family_invitation(
  uuid,
  public.family_role,
  integer
) to authenticated;
grant execute on function public.revoke_family_invitation(uuid) to authenticated;
grant execute on function public.accept_family_invitation(
  text,
  public.family_relationship,
  text
) to authenticated;
