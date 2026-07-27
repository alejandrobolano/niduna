create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions from public;

create type public.family_role as enum ('owner', 'admin', 'caregiver', 'viewer');
create type public.family_relationship as enum (
  'mother',
  'father',
  'parent',
  'guardian',
  'grandparent',
  'relative',
  'professional_caregiver',
  'other'
);
create type public.baby_life_stage as enum ('expected', 'born');
create type public.sex_at_birth as enum ('female', 'male', 'intersex', 'unknown');
create type public.blood_group as enum ('A', 'B', 'AB', 'O');
create type public.rhesus_factor as enum ('positive', 'negative');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) between 1 and 80),
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.family_role not null,
  relationship public.family_relationship not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (family_id, user_id)
);

create table public.babies (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  life_stage public.baby_life_stage not null,
  name text not null check (char_length(name) between 1 and 100),
  expected_due_date date,
  birth_date date,
  sex_at_birth public.sex_at_birth,
  photo_path text,
  blood_group public.blood_group,
  rhesus_factor public.rhesus_factor,
  gestational_weeks smallint check (gestational_weeks between 20 and 45),
  gestational_days smallint check (gestational_days between 0 and 6),
  notes text check (char_length(notes) <= 4000),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (life_stage = 'expected' and expected_due_date is not null and birth_date is null)
    or
    (life_stage = 'born' and birth_date is not null)
  )
);

create table public.baby_measurements (
  id uuid primary key default gen_random_uuid(),
  baby_id uuid not null references public.babies(id) on delete cascade,
  measured_at timestamptz not null,
  weight_grams integer check (weight_grams between 300 and 50000),
  length_millimeters integer check (length_millimeters between 200 and 1500),
  head_circumference_millimeters integer check (
    head_circumference_millimeters between 150 and 800
  ),
  source text check (char_length(source) <= 120),
  recorded_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  check (
    weight_grams is not null
    or length_millimeters is not null
    or head_circumference_millimeters is not null
  )
);

create index family_members_user_id_idx
  on public.family_members (user_id, family_id);
create index babies_family_id_idx on public.babies (family_id);
create index baby_measurements_baby_measured_at_idx
  on public.baby_measurements (baby_id, measured_at desc);

create function private.set_updated_at()
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

create function private.is_family_member(target_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.family_members
    where family_id = target_family_id
      and user_id = (select auth.uid())
  );
$$;

create function private.has_family_role(
  target_family_id uuid,
  allowed_roles public.family_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.family_members
    where family_id = target_family_id
      and user_id = (select auth.uid())
      and role = any (allowed_roles)
  );
$$;

create function private.can_manage_baby(target_baby_id uuid)
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
      and private.has_family_role(
        family_id,
        array['owner', 'admin']::public.family_role[]
      )
  );
$$;

create function private.can_record_baby_care(target_baby_id uuid)
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
      and private.has_family_role(
        family_id,
        array['owner', 'admin', 'caregiver']::public.family_role[]
      )
  );
$$;

create function private.add_family_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.created_by is distinct from (select auth.uid()) then
    raise exception 'Family creator must match the authenticated user';
  end if;

  insert into public.family_members (
    family_id,
    user_id,
    role,
    relationship,
    created_by
  )
  values (
    new.id,
    new.created_by,
    'owner',
    'parent',
    new.created_by
  );

  return new;
end;
$$;

create function private.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '')
  );
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public;
revoke all on function private.is_family_member(uuid) from public;
revoke all on function private.has_family_role(uuid, public.family_role[]) from public;
revoke all on function private.can_manage_baby(uuid) from public;
revoke all on function private.can_record_baby_care(uuid) from public;
revoke all on function private.add_family_owner() from public;
revoke all on function private.create_profile_for_new_user() from public;

grant execute on function private.is_family_member(uuid) to authenticated;
grant execute on function private.has_family_role(uuid, public.family_role[]) to authenticated;
grant execute on function private.can_manage_baby(uuid) to authenticated;
grant execute on function private.can_record_baby_care(uuid) to authenticated;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger families_set_updated_at
before update on public.families
for each row execute function private.set_updated_at();

create trigger family_members_set_updated_at
before update on public.family_members
for each row execute function private.set_updated_at();

create trigger babies_set_updated_at
before update on public.babies
for each row execute function private.set_updated_at();

create trigger families_add_owner
after insert on public.families
for each row execute function private.add_family_owner();

create trigger auth_users_create_profile
after insert on auth.users
for each row execute function private.create_profile_for_new_user();

alter table public.profiles enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.babies enable row level security;
alter table public.baby_measurements enable row level security;

create policy profiles_select_self
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy profiles_update_self
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy families_select_members
on public.families for select
to authenticated
using (private.is_family_member(id));

create policy families_insert_creator
on public.families for insert
to authenticated
with check ((select auth.uid()) = created_by);

create policy families_update_admins
on public.families for update
to authenticated
using (
  private.has_family_role(
    id,
    array['owner', 'admin']::public.family_role[]
  )
)
with check (
  private.has_family_role(
    id,
    array['owner', 'admin']::public.family_role[]
  )
);

create policy families_delete_owners
on public.families for delete
to authenticated
using (
  private.has_family_role(
    id,
    array['owner']::public.family_role[]
  )
);

create policy family_members_select_members
on public.family_members for select
to authenticated
using (private.is_family_member(family_id));

create policy family_members_insert_owners
on public.family_members for insert
to authenticated
with check (
  private.has_family_role(
    family_id,
    array['owner']::public.family_role[]
  )
  and created_by = (select auth.uid())
);

create policy family_members_update_owners
on public.family_members for update
to authenticated
using (
  private.has_family_role(
    family_id,
    array['owner']::public.family_role[]
  )
)
with check (
  private.has_family_role(
    family_id,
    array['owner']::public.family_role[]
  )
);

create policy family_members_delete_owners
on public.family_members for delete
to authenticated
using (
  private.has_family_role(
    family_id,
    array['owner']::public.family_role[]
  )
  and not (
    user_id = (select auth.uid())
    and role = 'owner'
  )
);

create policy babies_select_members
on public.babies for select
to authenticated
using (private.is_family_member(family_id));

create policy babies_insert_admins
on public.babies for insert
to authenticated
with check (
  private.has_family_role(
    family_id,
    array['owner', 'admin']::public.family_role[]
  )
  and created_by = (select auth.uid())
);

create policy babies_update_admins
on public.babies for update
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

create policy babies_delete_owners
on public.babies for delete
to authenticated
using (
  private.has_family_role(
    family_id,
    array['owner']::public.family_role[]
  )
);

create policy baby_measurements_select_members
on public.baby_measurements for select
to authenticated
using (private.can_record_baby_care(baby_id));

create policy baby_measurements_insert_caregivers
on public.baby_measurements for insert
to authenticated
with check (
  private.can_record_baby_care(baby_id)
  and recorded_by = (select auth.uid())
);

create policy baby_measurements_update_recorders
on public.baby_measurements for update
to authenticated
using (
  recorded_by = (select auth.uid())
  or private.can_manage_baby(baby_id)
)
with check (
  recorded_by = (select auth.uid())
  or private.can_manage_baby(baby_id)
);

create policy baby_measurements_delete_recorders
on public.baby_measurements for delete
to authenticated
using (
  recorded_by = (select auth.uid())
  or private.can_manage_baby(baby_id)
);

grant usage on schema public to authenticated;
grant select, update (display_name, avatar_path) on public.profiles to authenticated;
grant select, insert (name), update (name), delete on public.families to authenticated;
grant select, insert (
  family_id,
  user_id,
  role,
  relationship,
  created_by
), update (
  role,
  relationship
), delete on public.family_members to authenticated;
grant select, insert (
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
  notes
), update (
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
  notes
), delete on public.babies to authenticated;
grant select, insert (
  baby_id,
  measured_at,
  weight_grams,
  length_millimeters,
  head_circumference_millimeters,
  source
), update (
  measured_at,
  weight_grams,
  length_millimeters,
  head_circumference_millimeters,
  source
), delete on public.baby_measurements to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'baby-photos',
  'baby-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy baby_photos_select_members
on storage.objects for select
to authenticated
using (
  bucket_id = 'baby-photos'
  and private.is_family_member(((storage.foldername(name))[1])::uuid)
);

create policy baby_photos_insert_caregivers
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'baby-photos'
  and private.has_family_role(
    ((storage.foldername(name))[1])::uuid,
    array['owner', 'admin', 'caregiver']::public.family_role[]
  )
);

create policy baby_photos_update_caregivers
on storage.objects for update
to authenticated
using (
  bucket_id = 'baby-photos'
  and private.has_family_role(
    ((storage.foldername(name))[1])::uuid,
    array['owner', 'admin', 'caregiver']::public.family_role[]
  )
)
with check (
  bucket_id = 'baby-photos'
  and private.has_family_role(
    ((storage.foldername(name))[1])::uuid,
    array['owner', 'admin', 'caregiver']::public.family_role[]
  )
);

create policy baby_photos_delete_admins
on storage.objects for delete
to authenticated
using (
  bucket_id = 'baby-photos'
  and private.has_family_role(
    ((storage.foldername(name))[1])::uuid,
    array['owner', 'admin']::public.family_role[]
  )
);
