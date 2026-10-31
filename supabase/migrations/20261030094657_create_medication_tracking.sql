create type public.baby_medication_category as enum (
  'medication',
  'vaccine',
  'vitamin',
  'supplement',
  'other'
);

create type public.baby_medication_status as enum (
  'active',
  'inactive'
);

create table public.baby_medications (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  baby_id uuid not null,
  category public.baby_medication_category not null,
  name text not null check (char_length(trim(name)) between 1 and 120),
  presentation text not null check (char_length(trim(presentation)) between 1 and 160),
  indicated_dose_amount numeric(12, 3) not null check (
    indicated_dose_amount > 0 and indicated_dose_amount <= 999999999
  ),
  indicated_dose_unit text not null check (
    char_length(trim(indicated_dose_unit)) between 1 and 30
  ),
  administration_route text check (
    administration_route is null
    or char_length(trim(administration_route)) between 1 and 80
  ),
  instructions text check (instructions is null or char_length(instructions) <= 1000),
  indicated_by text check (indicated_by is null or char_length(trim(indicated_by)) <= 120),
  start_date date,
  end_date date,
  status public.baby_medication_status not null default 'active',
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_by uuid not null references auth.users (id) on delete restrict,
  updated_at timestamptz not null default now(),
  retired_by uuid references auth.users (id) on delete set null,
  retired_at timestamptz,
  constraint baby_medications_family_baby_fk
    foreign key (family_id, baby_id)
    references public.babies (family_id, id)
    on delete cascade,
  constraint baby_medications_family_identity unique (id, family_id, baby_id),
  constraint baby_medications_date_range check (
    end_date is null or start_date is null or end_date >= start_date
  ),
  constraint baby_medications_retirement_state check (
    (retired_at is null and retired_by is null)
    or (retired_at is not null and retired_by is not null)
  )
);

create table public.baby_medication_administrations (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid not null,
  family_id uuid not null references public.families (id) on delete cascade,
  baby_id uuid not null,
  medication_name text not null check (char_length(trim(medication_name)) between 1 and 120),
  medication_presentation text not null check (
    char_length(trim(medication_presentation)) between 1 and 160
  ),
  administered_at timestamptz not null,
  dose_amount numeric(12, 3) not null check (
    dose_amount > 0 and dose_amount <= 999999999
  ),
  dose_unit text not null check (char_length(trim(dose_unit)) between 1 and 30),
  notes text check (notes is null or char_length(notes) <= 500),
  recorded_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_by uuid not null references auth.users (id) on delete restrict,
  updated_at timestamptz not null default now(),
  retired_by uuid references auth.users (id) on delete set null,
  retired_at timestamptz,
  constraint medication_administrations_medication_fk
    foreign key (medication_id, family_id, baby_id)
    references public.baby_medications (id, family_id, baby_id)
    on delete cascade,
  constraint medication_administrations_retirement_state check (
    (retired_at is null and retired_by is null)
    or (retired_at is not null and retired_by is not null)
  )
);

create index baby_medications_active_baby_status_idx
  on public.baby_medications (baby_id, status, name)
  where retired_at is null;
create index baby_medications_family_idx
  on public.baby_medications (family_id, created_at desc);
create index baby_medications_family_baby_fk_idx
  on public.baby_medications (family_id, baby_id);
create index baby_medications_created_by_idx on public.baby_medications (created_by);
create index baby_medications_updated_by_idx on public.baby_medications (updated_by);
create index baby_medications_retired_by_idx
  on public.baby_medications (retired_by)
  where retired_by is not null;

create index medication_administrations_baby_date_idx
  on public.baby_medication_administrations (baby_id, administered_at desc, created_at desc)
  where retired_at is null;
create index medication_administrations_medication_date_idx
  on public.baby_medication_administrations (medication_id, administered_at desc)
  where retired_at is null;
create index medication_administrations_medication_family_baby_fk_idx
  on public.baby_medication_administrations (medication_id, family_id, baby_id);
create index medication_administrations_family_idx
  on public.baby_medication_administrations (family_id, administered_at desc);
create index medication_administrations_recorded_by_idx
  on public.baby_medication_administrations (recorded_by);
create index medication_administrations_updated_by_idx
  on public.baby_medication_administrations (updated_by);
create index medication_administrations_retired_by_idx
  on public.baby_medication_administrations (retired_by)
  where retired_by is not null;

alter table public.baby_medications enable row level security;
alter table public.baby_medication_administrations enable row level security;

create function private.can_manage_baby_medications(target_baby_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.can_manage_baby(target_baby_id);
$$;

create function private.can_manage_medication_administration(
  target_administration_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.baby_medication_administrations administration
    where administration.id = target_administration_id
      and private.is_family_member(administration.family_id)
      and (
        administration.recorded_by = (select auth.uid())
        or private.has_family_role(
          administration.family_id,
          array['owner', 'admin']::public.family_role[]
        )
      )
  );
$$;

create policy baby_medications_select_members
on public.baby_medications for select
to authenticated
using (
  private.can_view_baby(baby_id)
  and (
    retired_at is null
    or private.can_manage_baby_medications(baby_id)
  )
);

create policy medication_administrations_select_members
on public.baby_medication_administrations for select
to authenticated
using (
  private.can_view_baby(baby_id)
  and (
    retired_at is null
    or private.can_manage_medication_administration(id)
  )
);

create function private.save_baby_medication(
  target_medication_id uuid,
  target_baby_id uuid,
  target_category public.baby_medication_category,
  target_name text,
  target_presentation text,
  target_indicated_dose_amount numeric,
  target_indicated_dose_unit text,
  target_administration_route text,
  target_instructions text,
  target_indicated_by text,
  target_start_date date,
  target_end_date date,
  target_status public.baby_medication_status
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  selected_family_id uuid;
  selected_medication_id uuid := coalesce(target_medication_id, gen_random_uuid());
begin
  select baby.family_id
  into selected_family_id
  from public.babies baby
  where baby.id = target_baby_id
    and baby.archived_at is null;

  if actor_id is null
    or selected_family_id is null
    or not private.can_manage_baby_medications(target_baby_id)
  then
    raise exception 'baby_medication_not_allowed' using errcode = '42501';
  end if;

  if target_category is null
    or coalesce(char_length(trim(target_name)), 0) not between 1 and 120
    or coalesce(char_length(trim(target_presentation)), 0) not between 1 and 160
    or target_indicated_dose_amount is null
    or target_indicated_dose_amount <= 0
    or target_indicated_dose_amount > 999999999
    or coalesce(char_length(trim(target_indicated_dose_unit)), 0) not between 1 and 30
    or target_administration_route is not null
      and char_length(trim(target_administration_route)) not between 1 and 80
    or target_instructions is not null and char_length(target_instructions) > 1000
    or target_indicated_by is not null and char_length(trim(target_indicated_by)) > 120
    or target_end_date is not null
      and target_start_date is not null
      and target_end_date < target_start_date
    or target_status is null
  then
    raise exception 'baby_medication_invalid' using errcode = '22023';
  end if;

  if target_medication_id is null then
    insert into public.baby_medications (
      id, family_id, baby_id, category, name, presentation,
      indicated_dose_amount, indicated_dose_unit, administration_route,
      instructions, indicated_by, start_date, end_date, status,
      created_by, updated_by
    ) values (
      selected_medication_id, selected_family_id, target_baby_id, target_category,
      trim(target_name), trim(target_presentation), target_indicated_dose_amount,
      trim(target_indicated_dose_unit), nullif(trim(target_administration_route), ''),
      nullif(trim(target_instructions), ''), nullif(trim(target_indicated_by), ''),
      target_start_date, target_end_date, target_status, actor_id, actor_id
    );
  else
    update public.baby_medications
    set category = target_category,
        name = trim(target_name),
        presentation = trim(target_presentation),
        indicated_dose_amount = target_indicated_dose_amount,
        indicated_dose_unit = trim(target_indicated_dose_unit),
        administration_route = nullif(trim(target_administration_route), ''),
        instructions = nullif(trim(target_instructions), ''),
        indicated_by = nullif(trim(target_indicated_by), ''),
        start_date = target_start_date,
        end_date = target_end_date,
        status = target_status,
        updated_by = actor_id,
        updated_at = now()
    where id = target_medication_id
      and baby_id = target_baby_id
      and retired_at is null;

    if not found then
      raise exception 'baby_medication_not_found' using errcode = 'P0002';
    end if;
  end if;

  return selected_medication_id;
end;
$$;

create function public.save_baby_medication(
  target_medication_id uuid,
  target_baby_id uuid,
  target_category public.baby_medication_category,
  target_name text,
  target_presentation text,
  target_indicated_dose_amount numeric,
  target_indicated_dose_unit text,
  target_administration_route text,
  target_instructions text,
  target_indicated_by text,
  target_start_date date,
  target_end_date date,
  target_status public.baby_medication_status
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.save_baby_medication(
    target_medication_id, target_baby_id, target_category, target_name,
    target_presentation, target_indicated_dose_amount,
    target_indicated_dose_unit, target_administration_route,
    target_instructions, target_indicated_by, target_start_date,
    target_end_date, target_status
  );
$$;

create function private.set_baby_medication_retired(
  target_medication_id uuid,
  should_retire boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_baby_id uuid;
begin
  select medication.baby_id into selected_baby_id
  from public.baby_medications medication
  where medication.id = target_medication_id
  for update;

  if selected_baby_id is null
    or not private.can_manage_baby_medications(selected_baby_id)
  then
    raise exception 'baby_medication_not_allowed' using errcode = '42501';
  end if;

  update public.baby_medications
  set retired_at = case when should_retire then coalesce(retired_at, now()) else null end,
      retired_by = case
        when should_retire then coalesce(retired_by, (select auth.uid()))
        else null
      end,
      updated_by = (select auth.uid()),
      updated_at = now()
  where id = target_medication_id;
end;
$$;

create function public.set_baby_medication_retired(
  target_medication_id uuid,
  should_retire boolean
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.set_baby_medication_retired(target_medication_id, should_retire);
$$;

create function private.save_medication_administration(
  target_administration_id uuid,
  target_medication_id uuid,
  target_administered_at timestamptz,
  target_dose_amount numeric,
  target_dose_unit text,
  target_notes text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  selected_administration_id uuid := coalesce(target_administration_id, gen_random_uuid());
  selected_medication public.baby_medications%rowtype;
begin
  select * into selected_medication
  from public.baby_medications medication
  where medication.id = target_medication_id
    and medication.retired_at is null;

  if actor_id is null
    or selected_medication.id is null
    or not private.can_record_baby_care(selected_medication.baby_id)
  then
    raise exception 'medication_administration_not_allowed' using errcode = '42501';
  end if;

  if target_administered_at is null
    or target_administered_at > now() + interval '5 minutes'
    or target_dose_amount is null
    or target_dose_amount <= 0
    or target_dose_amount > 999999999
    or coalesce(char_length(trim(target_dose_unit)), 0) not between 1 and 30
    or target_notes is not null and char_length(target_notes) > 500
  then
    raise exception 'medication_administration_invalid' using errcode = '22023';
  end if;

  if target_administration_id is null then
    insert into public.baby_medication_administrations (
      id, medication_id, family_id, baby_id, medication_name,
      medication_presentation, administered_at,
      dose_amount, dose_unit, notes, recorded_by, updated_by
    ) values (
      selected_administration_id, selected_medication.id,
      selected_medication.family_id, selected_medication.baby_id,
      selected_medication.name, selected_medication.presentation,
      target_administered_at, target_dose_amount, trim(target_dose_unit),
      nullif(trim(target_notes), ''), actor_id, actor_id
    );
  else
    if not private.can_manage_medication_administration(target_administration_id) then
      raise exception 'medication_administration_not_allowed' using errcode = '42501';
    end if;

    update public.baby_medication_administrations
    set administered_at = target_administered_at,
        dose_amount = target_dose_amount,
        dose_unit = trim(target_dose_unit),
        notes = nullif(trim(target_notes), ''),
        updated_by = actor_id,
        updated_at = now()
    where id = target_administration_id
      and medication_id = target_medication_id
      and retired_at is null;

    if not found then
      raise exception 'medication_administration_not_found' using errcode = 'P0002';
    end if;
  end if;

  return selected_administration_id;
end;
$$;

create function public.save_medication_administration(
  target_administration_id uuid,
  target_medication_id uuid,
  target_administered_at timestamptz,
  target_dose_amount numeric,
  target_dose_unit text,
  target_notes text
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.save_medication_administration(
    target_administration_id, target_medication_id, target_administered_at,
    target_dose_amount, target_dose_unit, target_notes
  );
$$;

create function private.set_medication_administration_retired(
  target_administration_id uuid,
  should_retire boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.can_manage_medication_administration(target_administration_id) then
    raise exception 'medication_administration_not_allowed' using errcode = '42501';
  end if;

  update public.baby_medication_administrations
  set retired_at = case when should_retire then coalesce(retired_at, now()) else null end,
      retired_by = case
        when should_retire then coalesce(retired_by, (select auth.uid()))
        else null
      end,
      updated_by = (select auth.uid()),
      updated_at = now()
  where id = target_administration_id;
end;
$$;

create function public.set_medication_administration_retired(
  target_administration_id uuid,
  should_retire boolean
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.set_medication_administration_retired(
    target_administration_id, should_retire
  );
$$;

alter table public.family_audit_logs
  drop constraint if exists family_audit_logs_entity_type_check;

alter table public.family_audit_logs
  add constraint family_audit_logs_entity_type_check check (
    entity_type in (
      'baby', 'baby_contact', 'baby_document', 'baby_expense',
      'baby_medication', 'baby_note', 'care_event', 'family_member',
      'measurement', 'medication_administration'
    )
  );

create function private.write_baby_medication_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_data public.baby_medications%rowtype;
  selected_change text;
begin
  selected_data := case when tg_op = 'DELETE' then old else new end;
  selected_change := case
    when tg_op = 'INSERT' then 'created'
    when tg_op = 'DELETE' then 'deleted'
    when old.retired_at is null and new.retired_at is not null then 'retired'
    when old.retired_at is not null and new.retired_at is null then 'restored'
    else 'updated'
  end;

  if tg_op = 'UPDATE' and row(
    old.category, old.name, old.presentation, old.indicated_dose_amount,
    old.indicated_dose_unit, old.administration_route, old.instructions,
    old.indicated_by, old.start_date, old.end_date, old.status, old.retired_at
  ) is not distinct from row(
    new.category, new.name, new.presentation, new.indicated_dose_amount,
    new.indicated_dose_unit, new.administration_route, new.instructions,
    new.indicated_by, new.start_date, new.end_date, new.status, new.retired_at
  ) then
    return new;
  end if;

  insert into public.family_audit_logs (
    family_id, actor_user_id, action, entity_type, entity_id, baby_id, details
  ) values (
    selected_data.family_id,
    coalesce((select auth.uid()), selected_data.updated_by),
    case when selected_change in ('created', 'deleted') then selected_change else 'updated' end,
    'baby_medication', selected_data.id, selected_data.baby_id,
    jsonb_build_object(
      'category', selected_data.category,
      'change_kind', selected_change,
      'status', selected_data.status
    )
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create function private.write_medication_administration_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_data public.baby_medication_administrations%rowtype;
  selected_change text;
begin
  selected_data := case when tg_op = 'DELETE' then old else new end;
  selected_change := case
    when tg_op = 'INSERT' then 'created'
    when tg_op = 'DELETE' then 'deleted'
    when old.retired_at is null and new.retired_at is not null then 'retired'
    when old.retired_at is not null and new.retired_at is null then 'restored'
    else 'updated'
  end;

  if tg_op = 'UPDATE' and row(
    old.administered_at, old.dose_amount, old.dose_unit, old.notes, old.retired_at
  ) is not distinct from row(
    new.administered_at, new.dose_amount, new.dose_unit, new.notes, new.retired_at
  ) then
    return new;
  end if;

  insert into public.family_audit_logs (
    family_id, actor_user_id, action, entity_type, entity_id, baby_id, details
  ) values (
    selected_data.family_id,
    coalesce((select auth.uid()), selected_data.updated_by),
    case when selected_change in ('created', 'deleted') then selected_change else 'updated' end,
    'medication_administration', selected_data.id, selected_data.baby_id,
    jsonb_build_object('change_kind', selected_change)
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger baby_medications_write_family_audit_log
after insert or update or delete on public.baby_medications
for each row
when (pg_catalog.current_setting('app.suppress_family_audit', true) is distinct from 'on')
execute function private.write_baby_medication_audit_log();

create trigger medication_administrations_write_family_audit_log
after insert or update or delete on public.baby_medication_administrations
for each row
when (pg_catalog.current_setting('app.suppress_family_audit', true) is distinct from 'on')
execute function private.write_medication_administration_audit_log();

revoke all on table public.baby_medications from public, anon;
revoke all on table public.baby_medication_administrations from public, anon;
revoke all on function private.can_manage_baby_medications(uuid) from public;
revoke all on function private.can_manage_medication_administration(uuid) from public;
revoke all on function private.save_baby_medication(
  uuid, uuid, public.baby_medication_category, text, text, numeric, text,
  text, text, text, date, date, public.baby_medication_status
) from public;
revoke all on function private.set_baby_medication_retired(uuid, boolean) from public;
revoke all on function private.save_medication_administration(
  uuid, uuid, timestamptz, numeric, text, text
) from public;
revoke all on function private.set_medication_administration_retired(uuid, boolean) from public;
revoke all on function private.write_baby_medication_audit_log() from public;
revoke all on function private.write_medication_administration_audit_log() from public;
revoke all on function public.save_baby_medication(
  uuid, uuid, public.baby_medication_category, text, text, numeric, text,
  text, text, text, date, date, public.baby_medication_status
) from public, anon;
revoke all on function public.set_baby_medication_retired(uuid, boolean) from public, anon;
revoke all on function public.save_medication_administration(
  uuid, uuid, timestamptz, numeric, text, text
) from public, anon;
revoke all on function public.set_medication_administration_retired(uuid, boolean) from public, anon;

grant select on table public.baby_medications to authenticated;
grant select on table public.baby_medication_administrations to authenticated;
grant select, insert, update, delete on table public.baby_medications to service_role;
grant select, insert, update, delete on table public.baby_medication_administrations to service_role;
grant execute on function private.can_manage_baby_medications(uuid) to authenticated;
grant execute on function private.can_manage_medication_administration(uuid) to authenticated;
grant execute on function private.save_baby_medication(
  uuid, uuid, public.baby_medication_category, text, text, numeric, text,
  text, text, text, date, date, public.baby_medication_status
) to authenticated;
grant execute on function private.set_baby_medication_retired(uuid, boolean) to authenticated;
grant execute on function private.save_medication_administration(
  uuid, uuid, timestamptz, numeric, text, text
) to authenticated;
grant execute on function private.set_medication_administration_retired(uuid, boolean) to authenticated;
grant execute on function public.save_baby_medication(
  uuid, uuid, public.baby_medication_category, text, text, numeric, text,
  text, text, text, date, date, public.baby_medication_status
) to authenticated;
grant execute on function public.set_baby_medication_retired(uuid, boolean) to authenticated;
grant execute on function public.save_medication_administration(
  uuid, uuid, timestamptz, numeric, text, text
) to authenticated;
grant execute on function public.set_medication_administration_retired(uuid, boolean) to authenticated;
