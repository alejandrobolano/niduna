alter table public.babies
  add column archived_at timestamptz,
  add column archived_by uuid references auth.users(id);

alter table public.babies
  add constraint babies_family_id_id_key unique (family_id, id),
  add constraint babies_archive_complete check (
    (archived_at is null and archived_by is null)
    or (archived_at is not null and archived_by is not null)
  );

create index babies_family_active_idx
  on public.babies (family_id, created_at)
  where archived_at is null;

create index babies_archived_by_idx
  on public.babies (archived_by)
  where archived_by is not null;

create table public.baby_followers (
  family_id uuid not null,
  baby_id uuid not null,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (baby_id, user_id),
  foreign key (family_id, baby_id)
    references public.babies (family_id, id)
    on delete cascade,
  foreign key (family_id, user_id)
    references public.family_members (family_id, user_id)
    on delete cascade
);

create index baby_followers_user_family_idx
  on public.baby_followers (user_id, family_id, baby_id);

create table private.family_membership_removals (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  user_id uuid not null,
  former_role public.family_role not null,
  removed_by uuid not null,
  removed_at timestamptz not null default now()
);

create index family_membership_removals_family_idx
  on private.family_membership_removals (family_id, removed_at desc);

create table private.baby_archive_events (
  id uuid primary key default gen_random_uuid(),
  baby_id uuid not null,
  family_id uuid not null,
  action text not null check (action in ('archived', 'restored')),
  performed_by uuid not null,
  performed_at timestamptz not null default now()
);

create index baby_archive_events_baby_idx
  on private.baby_archive_events (baby_id, performed_at desc);

alter table private.family_membership_removals enable row level security;
alter table private.baby_archive_events enable row level security;
alter table public.baby_followers enable row level security;

create function private.follow_babies_for_new_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.baby_followers (family_id, baby_id, user_id)
  select new.family_id, baby.id, new.user_id
  from public.babies baby
  where baby.family_id = new.family_id
    and baby.archived_at is null
  on conflict do nothing;

  return new;
end;
$$;

create function private.add_followers_for_new_baby()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.baby_followers (family_id, baby_id, user_id)
  select new.family_id, new.id, member.user_id
  from public.family_members member
  where member.family_id = new.family_id
  on conflict do nothing;

  return new;
end;
$$;

create trigger family_members_follow_existing_babies
after insert on public.family_members
for each row execute function private.follow_babies_for_new_member();

create trigger babies_add_family_followers
after insert on public.babies
for each row execute function private.add_followers_for_new_baby();

insert into public.baby_followers (family_id, baby_id, user_id)
select baby.family_id, baby.id, member.user_id
from public.babies baby
join public.family_members member on member.family_id = baby.family_id
where baby.archived_at is null
on conflict do nothing;

create function private.can_follow_baby(
  target_family_id uuid,
  target_baby_id uuid,
  target_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    target_user_id = (select auth.uid())
    and exists (
      select 1
      from public.family_members member
      join public.babies baby on baby.family_id = member.family_id
      where member.family_id = target_family_id
        and member.user_id = target_user_id
        and baby.id = target_baby_id
        and baby.archived_at is null
    );
$$;

create policy baby_followers_select_self
on public.baby_followers for select
to authenticated
using (user_id = (select auth.uid()));

create policy baby_followers_insert_self
on public.baby_followers for insert
to authenticated
with check (
  private.can_follow_baby(family_id, baby_id, user_id)
);

create policy baby_followers_delete_self
on public.baby_followers for delete
to authenticated
using (user_id = (select auth.uid()));

create or replace function private.can_manage_baby(target_baby_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.babies
    where id = target_baby_id
      and archived_at is null
      and private.has_family_role(
        family_id,
        array['owner', 'admin']::public.family_role[]
      )
  );
$$;

create or replace function private.can_record_baby_care(target_baby_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.babies
    where id = target_baby_id
      and archived_at is null
      and private.has_family_role(
        family_id,
        array['owner', 'admin', 'caregiver']::public.family_role[]
      )
  );
$$;

create or replace function private.can_view_baby(target_baby_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.babies
    where id = target_baby_id
      and archived_at is null
      and private.is_family_member(family_id)
  );
$$;

drop policy babies_select_members on public.babies;
create policy babies_select_active_members
on public.babies for select
to authenticated
using (
  archived_at is null
  and private.is_family_member(family_id)
);

drop policy babies_update_admins on public.babies;
create policy babies_update_active_admins
on public.babies for update
to authenticated
using (
  archived_at is null
  and private.has_family_role(
    family_id,
    array['owner', 'admin']::public.family_role[]
  )
)
with check (
  archived_at is null
  and archived_by is null
  and private.has_family_role(
    family_id,
    array['owner', 'admin']::public.family_role[]
  )
);

drop policy babies_delete_owners on public.babies;
revoke delete on public.babies from authenticated;

drop policy family_members_delete_owners on public.family_members;
revoke delete on public.family_members from authenticated;

create function public.set_baby_following(
  target_baby_id uuid,
  should_follow boolean
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  selected_family_id uuid;
begin
  if current_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select baby.family_id
  into selected_family_id
  from public.babies baby
  where baby.id = target_baby_id
    and baby.archived_at is null;

  if selected_family_id is null then
    raise exception 'baby_not_found' using errcode = 'P0002';
  end if;

  if should_follow then
    insert into public.baby_followers (family_id, baby_id, user_id)
    values (selected_family_id, target_baby_id, current_user_id)
    on conflict do nothing;
  else
    delete from public.baby_followers
    where baby_id = target_baby_id
      and user_id = current_user_id;
  end if;
end;
$$;

create function private.remove_family_member(target_member_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  actor_role public.family_role;
  selected_member public.family_members%rowtype;
begin
  if current_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select *
  into selected_member
  from public.family_members
  where id = target_member_id
  for update;

  if selected_member.id is null then
    raise exception 'family_member_not_found' using errcode = 'P0002';
  end if;

  select role
  into actor_role
  from public.family_members
  where family_id = selected_member.family_id
    and user_id = current_user_id;

  if selected_member.user_id = current_user_id
    or selected_member.role = 'owner'
    or not (
      actor_role = 'owner'
      or (
        actor_role = 'admin'
        and selected_member.role in ('caregiver', 'viewer')
      )
    )
  then
    raise exception 'family_member_removal_not_allowed' using errcode = '42501';
  end if;

  insert into private.family_membership_removals (
    family_id,
    user_id,
    former_role,
    removed_by
  )
  values (
    selected_member.family_id,
    selected_member.user_id,
    selected_member.role,
    current_user_id
  );

  delete from public.family_members where id = selected_member.id;
end;
$$;

create function public.remove_family_member(target_member_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.remove_family_member(target_member_id);
$$;

create function private.set_baby_archived(
  target_baby_id uuid,
  should_archive boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  selected_baby public.babies%rowtype;
begin
  if current_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select *
  into selected_baby
  from public.babies
  where id = target_baby_id
  for update;

  if selected_baby.id is null then
    raise exception 'baby_not_found' using errcode = 'P0002';
  end if;

  if not private.has_family_role(
    selected_baby.family_id,
    array['owner', 'admin']::public.family_role[]
  ) then
    raise exception 'baby_archive_not_allowed' using errcode = '42501';
  end if;

  if should_archive and selected_baby.archived_at is null then
    update public.babies
    set archived_at = now(), archived_by = current_user_id
    where id = selected_baby.id;

    delete from public.baby_followers where baby_id = selected_baby.id;

    insert into private.baby_archive_events (
      baby_id,
      family_id,
      action,
      performed_by
    )
    values (
      selected_baby.id,
      selected_baby.family_id,
      'archived',
      current_user_id
    );
  elsif not should_archive and selected_baby.archived_at is not null then
    update public.babies
    set archived_at = null, archived_by = null
    where id = selected_baby.id;

    insert into public.baby_followers (family_id, baby_id, user_id)
    values (selected_baby.family_id, selected_baby.id, current_user_id)
    on conflict do nothing;

    insert into private.baby_archive_events (
      baby_id,
      family_id,
      action,
      performed_by
    )
    values (
      selected_baby.id,
      selected_baby.family_id,
      'restored',
      current_user_id
    );
  end if;
end;
$$;

create function public.set_baby_archived(
  target_baby_id uuid,
  should_archive boolean
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.set_baby_archived(target_baby_id, should_archive);
$$;

create function private.list_archived_babies()
returns table (
  family_id uuid,
  baby_id uuid,
  baby_name text,
  archived_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select baby.family_id, baby.id, baby.name, baby.archived_at
  from public.babies baby
  where baby.archived_at is not null
    and private.has_family_role(
      baby.family_id,
      array['owner', 'admin']::public.family_role[]
    )
  order by baby.archived_at desc;
$$;

create function public.list_archived_babies()
returns table (
  family_id uuid,
  baby_id uuid,
  baby_name text,
  archived_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.list_archived_babies();
$$;

revoke all on function private.follow_babies_for_new_member() from public;
revoke all on function private.add_followers_for_new_baby() from public;
revoke all on function private.can_follow_baby(uuid, uuid, uuid) from public;
revoke all on function private.remove_family_member(uuid) from public;
revoke all on function private.set_baby_archived(uuid, boolean) from public;
revoke all on function private.list_archived_babies() from public;
revoke all on function public.set_baby_following(uuid, boolean) from public, anon;
revoke all on function public.remove_family_member(uuid) from public, anon;
revoke all on function public.set_baby_archived(uuid, boolean) from public, anon;
revoke all on function public.list_archived_babies() from public, anon;

grant execute on function private.remove_family_member(uuid) to authenticated;
grant execute on function private.set_baby_archived(uuid, boolean) to authenticated;
grant execute on function private.list_archived_babies() to authenticated;
grant execute on function public.set_baby_following(uuid, boolean) to authenticated;
grant execute on function public.remove_family_member(uuid) to authenticated;
grant execute on function public.set_baby_archived(uuid, boolean) to authenticated;
grant execute on function public.list_archived_babies() to authenticated;

grant select, insert (family_id, baby_id, user_id), delete
  on public.baby_followers to authenticated;

grant select (
  id,
  family_id,
  life_stage,
  name,
  expected_due_date,
  birth_date,
  sex_at_birth,
  photo_path,
  blood_group,
  rhesus_factor,
  gestational_weeks,
  gestational_days,
  notes,
  created_by,
  created_at,
  updated_at
) on public.babies to authenticated;
