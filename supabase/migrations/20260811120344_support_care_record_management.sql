alter table public.care_events
  add column deleted_at timestamptz,
  add column deleted_by uuid references auth.users(id);

alter table public.baby_notes
  add column updated_by uuid references auth.users(id),
  add column deleted_at timestamptz,
  add column deleted_by uuid references auth.users(id);

update public.baby_notes
set updated_by = recorded_by
where updated_by is null;

alter table public.baby_notes
  alter column updated_by set not null,
  alter column updated_by set default auth.uid();

alter table public.baby_measurements
  add column updated_at timestamptz not null default now(),
  add column updated_by uuid references auth.users(id),
  add column deleted_at timestamptz,
  add column deleted_by uuid references auth.users(id);

update public.baby_measurements
set updated_by = recorded_by
where updated_by is null;

alter table public.baby_measurements
  alter column updated_by set not null,
  alter column updated_by set default auth.uid();

create or replace function private.set_care_record_audit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  new.updated_by = (select auth.uid());
  return new;
end;
$$;

revoke all on function private.set_care_record_audit() from public;

drop trigger care_events_set_audit on public.care_events;
create trigger care_events_set_audit
before update on public.care_events
for each row execute function private.set_care_record_audit();

drop trigger baby_notes_set_updated_at on public.baby_notes;
create trigger baby_notes_set_audit
before update on public.baby_notes
for each row execute function private.set_care_record_audit();

create trigger baby_measurements_set_audit
before update on public.baby_measurements
for each row execute function private.set_care_record_audit();

drop index care_events_baby_occurred_at_idx;
create index care_events_active_baby_occurred_at_idx
  on public.care_events (baby_id, occurred_at desc)
  where deleted_at is null;

drop index baby_notes_baby_occurred_at_idx;
create index baby_notes_active_baby_occurred_at_idx
  on public.baby_notes (baby_id, occurred_at desc)
  where deleted_at is null;

drop index baby_measurements_baby_measured_at_idx;
create index baby_measurements_active_baby_measured_at_idx
  on public.baby_measurements (baby_id, measured_at desc)
  where deleted_at is null;

create index care_events_retired_baby_deleted_at_idx
  on public.care_events (baby_id, deleted_at desc)
  where deleted_at is not null;

create index baby_notes_retired_baby_deleted_at_idx
  on public.baby_notes (baby_id, deleted_at desc)
  where deleted_at is not null;

create index baby_measurements_retired_baby_deleted_at_idx
  on public.baby_measurements (baby_id, deleted_at desc)
  where deleted_at is not null;

drop index care_events_one_open_sleep_per_baby_idx;
create unique index care_events_one_open_sleep_per_baby_idx
  on public.care_events (baby_id)
  where event_type = 'sleep' and ended_at is null and deleted_at is null;

drop policy care_events_select_family on public.care_events;
create policy care_events_select_family
on public.care_events for select
to authenticated
using (
  private.can_view_baby(baby_id)
  and (deleted_at is null or private.can_manage_baby(baby_id))
);

drop policy baby_notes_select_family on public.baby_notes;
create policy baby_notes_select_family
on public.baby_notes for select
to authenticated
using (
  private.can_view_baby(baby_id)
  and (deleted_at is null or private.can_manage_baby(baby_id))
);

drop policy baby_measurements_select_members on public.baby_measurements;
create policy baby_measurements_select_members
on public.baby_measurements for select
to authenticated
using (
  private.can_view_baby(baby_id)
  and (deleted_at is null or private.can_manage_baby(baby_id))
);

drop policy care_events_update_caregivers on public.care_events;
create policy care_events_update_recorders
on public.care_events for update
to authenticated
using (
  deleted_at is null
  and private.can_record_baby_care(baby_id)
  and (
    recorded_by = (select auth.uid())
    or private.can_manage_baby(baby_id)
  )
)
with check (
  private.can_record_baby_care(baby_id)
  and (
    recorded_by = (select auth.uid())
    or private.can_manage_baby(baby_id)
  )
);

drop policy baby_notes_update_recorders on public.baby_notes;
create policy baby_notes_update_recorders
on public.baby_notes for update
to authenticated
using (
  deleted_at is null
  and private.can_record_baby_care(baby_id)
  and (
    recorded_by = (select auth.uid())
    or private.can_manage_baby(baby_id)
  )
)
with check (
  private.can_record_baby_care(baby_id)
  and (
    recorded_by = (select auth.uid())
    or private.can_manage_baby(baby_id)
  )
);

drop policy baby_measurements_update_recorders on public.baby_measurements;
create policy baby_measurements_update_recorders
on public.baby_measurements for update
to authenticated
using (
  deleted_at is null
  and source <> 'birth'
  and private.can_record_baby_care(baby_id)
  and (
    recorded_by = (select auth.uid())
    or private.can_manage_baby(baby_id)
  )
)
with check (
  source <> 'birth'
  and private.can_record_baby_care(baby_id)
  and (
    recorded_by = (select auth.uid())
    or private.can_manage_baby(baby_id)
  )
);

drop policy care_events_delete_recorders on public.care_events;
drop policy baby_notes_delete_recorders on public.baby_notes;
drop policy baby_measurements_delete_recorders on public.baby_measurements;

revoke delete on public.care_events from authenticated;
revoke delete on public.baby_notes from authenticated;
revoke delete on public.baby_measurements from authenticated;

drop view public.care_timeline;
create view public.care_timeline
with (security_invoker = true)
as
select
  care_events.id,
  care_events.baby_id,
  care_events.event_type::text as event_type,
  'care_event'::text as source_type,
  care_events.occurred_at,
  care_events.ended_at,
  care_events.feeding_method::text as feeding_method,
  care_events.amount_milliliters,
  care_events.breast_side::text as breast_side,
  care_events.diaper_condition::text as diaper_condition,
  null::text as content,
  care_events.notes,
  null::integer as weight_grams,
  null::integer as length_millimeters,
  null::integer as head_circumference_millimeters,
  null::text as measurement_source,
  care_events.recorded_by,
  care_events.updated_at,
  care_events.updated_by,
  care_events.deleted_at,
  care_events.deleted_by
from public.care_events
where care_events.deleted_at is null
union all
select
  baby_notes.id,
  baby_notes.baby_id,
  'note'::text,
  'baby_note'::text,
  baby_notes.occurred_at,
  null::timestamptz,
  null::text,
  null::integer,
  null::text,
  null::text,
  baby_notes.content,
  null::text,
  null::integer,
  null::integer,
  null::integer,
  null::text,
  baby_notes.recorded_by,
  baby_notes.updated_at,
  baby_notes.updated_by,
  baby_notes.deleted_at,
  baby_notes.deleted_by
from public.baby_notes
where baby_notes.deleted_at is null
union all
select
  baby_measurements.id,
  baby_measurements.baby_id,
  'measurement'::text,
  'measurement'::text,
  baby_measurements.measured_at,
  null::timestamptz,
  null::text,
  null::integer,
  null::text,
  null::text,
  null::text,
  baby_measurements.notes,
  baby_measurements.weight_grams,
  baby_measurements.length_millimeters,
  baby_measurements.head_circumference_millimeters,
  baby_measurements.source,
  baby_measurements.recorded_by,
  baby_measurements.updated_at,
  baby_measurements.updated_by,
  baby_measurements.deleted_at,
  baby_measurements.deleted_by
from public.baby_measurements
where baby_measurements.deleted_at is null;

create view public.retired_care_timeline
with (security_invoker = true)
as
select * from (
  select
    care_events.id,
    care_events.baby_id,
    care_events.event_type::text as event_type,
    'care_event'::text as source_type,
    care_events.occurred_at,
    care_events.ended_at,
    care_events.feeding_method::text as feeding_method,
    care_events.amount_milliliters,
    care_events.breast_side::text as breast_side,
    care_events.diaper_condition::text as diaper_condition,
    null::text as content,
    care_events.notes,
    null::integer as weight_grams,
    null::integer as length_millimeters,
    null::integer as head_circumference_millimeters,
    null::text as measurement_source,
    care_events.recorded_by,
    care_events.updated_at,
    care_events.updated_by,
    care_events.deleted_at,
    care_events.deleted_by
  from public.care_events
  where care_events.deleted_at is not null
  union all
  select
    baby_notes.id, baby_notes.baby_id, 'note'::text, 'baby_note'::text,
    baby_notes.occurred_at, null::timestamptz, null::text, null::integer,
    null::text, null::text, baby_notes.content, null::text, null::integer,
    null::integer, null::integer, null::text, baby_notes.recorded_by,
    baby_notes.updated_at, baby_notes.updated_by, baby_notes.deleted_at,
    baby_notes.deleted_by
  from public.baby_notes
  where baby_notes.deleted_at is not null
  union all
  select
    baby_measurements.id, baby_measurements.baby_id, 'measurement'::text,
    'measurement'::text, baby_measurements.measured_at, null::timestamptz,
    null::text, null::integer, null::text, null::text, null::text,
    baby_measurements.notes, baby_measurements.weight_grams,
    baby_measurements.length_millimeters,
    baby_measurements.head_circumference_millimeters,
    baby_measurements.source, baby_measurements.recorded_by,
    baby_measurements.updated_at, baby_measurements.updated_by,
    baby_measurements.deleted_at, baby_measurements.deleted_by
  from public.baby_measurements
  where baby_measurements.deleted_at is not null
) retired_records;

grant select on public.care_timeline to authenticated;
grant select on public.retired_care_timeline to authenticated;

create function private.update_care_record(
  target_baby_id uuid,
  target_record_id uuid,
  target_source_type text,
  target_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  current_care public.care_events%rowtype;
  current_note public.baby_notes%rowtype;
  current_measurement public.baby_measurements%rowtype;
begin
  if actor_id is null or not private.can_record_baby_care(target_baby_id) then
    raise exception 'care_record_not_allowed' using errcode = '42501';
  end if;

  if target_source_type = 'care_event' then
    select * into current_care
    from public.care_events
    where id = target_record_id and baby_id = target_baby_id and deleted_at is null
    for update;

    if not found or (current_care.recorded_by <> actor_id and not private.can_manage_baby(target_baby_id)) then
      raise exception 'care_record_not_allowed' using errcode = '42501';
    end if;

    if current_care.event_type = 'feeding' then
      update public.care_events set
        occurred_at = (target_payload ->> 'occurredAt')::timestamptz,
        feeding_method = (target_payload ->> 'method')::public.feeding_method,
        amount_milliliters = (target_payload ->> 'amountMilliliters')::integer,
        breast_side = (target_payload ->> 'breastSide')::public.breast_side,
        notes = nullif(trim(target_payload ->> 'notes'), '')
      where id = target_record_id;
    elsif current_care.event_type = 'diaper' then
      update public.care_events set
        occurred_at = (target_payload ->> 'occurredAt')::timestamptz,
        diaper_condition = (target_payload ->> 'condition')::public.diaper_condition,
        notes = nullif(trim(target_payload ->> 'notes'), '')
      where id = target_record_id;
    else
      update public.care_events set
        occurred_at = (target_payload ->> 'occurredAt')::timestamptz,
        ended_at = (target_payload ->> 'endedAt')::timestamptz,
        notes = nullif(trim(target_payload ->> 'notes'), '')
      where id = target_record_id;
    end if;
  elsif target_source_type = 'baby_note' then
    select * into current_note
    from public.baby_notes
    where id = target_record_id and baby_id = target_baby_id and deleted_at is null
    for update;

    if not found or (current_note.recorded_by <> actor_id and not private.can_manage_baby(target_baby_id)) then
      raise exception 'care_record_not_allowed' using errcode = '42501';
    end if;

    update public.baby_notes set
      occurred_at = (target_payload ->> 'occurredAt')::timestamptz,
      content = trim(target_payload ->> 'content')
    where id = target_record_id;
  elsif target_source_type = 'measurement' then
    select * into current_measurement
    from public.baby_measurements
    where id = target_record_id and baby_id = target_baby_id
      and deleted_at is null and source <> 'birth'
    for update;

    if not found or (current_measurement.recorded_by <> actor_id and not private.can_manage_baby(target_baby_id)) then
      raise exception 'care_record_not_allowed' using errcode = '42501';
    end if;

    update public.baby_measurements set
      measured_at = (target_payload ->> 'occurredAt')::timestamptz,
      source = target_payload ->> 'source',
      weight_grams = (target_payload ->> 'weightGrams')::integer,
      length_millimeters = (target_payload ->> 'lengthMillimeters')::integer,
      head_circumference_millimeters = (target_payload ->> 'headCircumferenceMillimeters')::integer,
      notes = nullif(trim(target_payload ->> 'notes'), '')
    where id = target_record_id;
  else
    raise exception 'care_record_invalid_source';
  end if;
end;
$$;

create function private.retire_care_records(
  target_baby_id uuid,
  target_records jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  record_item record;
  retired_count integer := 0;
  affected integer;
begin
  if actor_id is null or jsonb_typeof(target_records) <> 'array'
    or jsonb_array_length(target_records) not between 1 and 100 then
    raise exception 'care_record_invalid_selection';
  end if;

  if (select count(*) from jsonb_to_recordset(target_records) as item(id uuid, "sourceType" text))
    <> (select count(*) from (select distinct id, "sourceType" from jsonb_to_recordset(target_records) as item(id uuid, "sourceType" text)) unique_items) then
    raise exception 'care_record_invalid_selection';
  end if;

  for record_item in
    select id, "sourceType" as source_type
    from jsonb_to_recordset(target_records) as item(id uuid, "sourceType" text)
    order by "sourceType", id
  loop
    affected := 0;
    if record_item.source_type = 'care_event' then
      update public.care_events set deleted_at = now(), deleted_by = actor_id
      where id = record_item.id and baby_id = target_baby_id and deleted_at is null
        and private.can_record_baby_care(baby_id)
        and (recorded_by = actor_id or private.can_manage_baby(baby_id));
      get diagnostics affected = row_count;
    elsif record_item.source_type = 'baby_note' then
      update public.baby_notes set deleted_at = now(), deleted_by = actor_id
      where id = record_item.id and baby_id = target_baby_id and deleted_at is null
        and private.can_record_baby_care(baby_id)
        and (recorded_by = actor_id or private.can_manage_baby(baby_id));
      get diagnostics affected = row_count;
    elsif record_item.source_type = 'measurement' then
      update public.baby_measurements set deleted_at = now(), deleted_by = actor_id
      where id = record_item.id and baby_id = target_baby_id and deleted_at is null
        and source <> 'birth' and private.can_record_baby_care(baby_id)
        and (recorded_by = actor_id or private.can_manage_baby(baby_id));
      get diagnostics affected = row_count;
    end if;

    if affected <> 1 then
      raise exception 'care_record_not_allowed' using errcode = '42501';
    end if;
    retired_count := retired_count + 1;
  end loop;

  return retired_count;
end;
$$;

create function private.restore_care_record(
  target_baby_id uuid,
  target_record_id uuid,
  target_source_type text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer := 0;
begin
  if (select auth.uid()) is null or not private.can_manage_baby(target_baby_id) then
    raise exception 'care_record_not_allowed' using errcode = '42501';
  end if;

  if target_source_type = 'care_event' then
    update public.care_events set deleted_at = null, deleted_by = null
    where id = target_record_id and baby_id = target_baby_id and deleted_at is not null;
    get diagnostics affected = row_count;
  elsif target_source_type = 'baby_note' then
    update public.baby_notes set deleted_at = null, deleted_by = null
    where id = target_record_id and baby_id = target_baby_id and deleted_at is not null;
    get diagnostics affected = row_count;
  elsif target_source_type = 'measurement' then
    update public.baby_measurements set deleted_at = null, deleted_by = null
    where id = target_record_id and baby_id = target_baby_id and deleted_at is not null;
    get diagnostics affected = row_count;
  end if;

  if affected <> 1 then
    raise exception 'care_record_not_allowed' using errcode = '42501';
  end if;
end;
$$;

create function public.update_care_record(
  target_baby_id uuid,
  target_record_id uuid,
  target_source_type text,
  target_payload jsonb
)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.update_care_record(target_baby_id, target_record_id, target_source_type, target_payload); $$;

create function public.retire_care_records(target_baby_id uuid, target_records jsonb)
returns integer
language sql
security invoker
set search_path = ''
as $$ select private.retire_care_records(target_baby_id, target_records); $$;

create function public.restore_care_record(target_baby_id uuid, target_record_id uuid, target_source_type text)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.restore_care_record(target_baby_id, target_record_id, target_source_type); $$;

revoke all on function private.update_care_record(uuid, uuid, text, jsonb) from public;
revoke all on function private.retire_care_records(uuid, jsonb) from public;
revoke all on function private.restore_care_record(uuid, uuid, text) from public;
grant execute on function private.update_care_record(uuid, uuid, text, jsonb) to authenticated;
grant execute on function private.retire_care_records(uuid, jsonb) to authenticated;
grant execute on function private.restore_care_record(uuid, uuid, text) to authenticated;

revoke all on function public.update_care_record(uuid, uuid, text, jsonb) from public, anon;
revoke all on function public.retire_care_records(uuid, jsonb) from public, anon;
revoke all on function public.restore_care_record(uuid, uuid, text) from public, anon;
grant execute on function public.update_care_record(uuid, uuid, text, jsonb) to authenticated;
grant execute on function public.retire_care_records(uuid, jsonb) to authenticated;
grant execute on function public.restore_care_record(uuid, uuid, text) to authenticated;

create function private.write_care_record_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_data jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  previous_data jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else null end;
  selected_action text := case when tg_op = 'INSERT' then 'created' when tg_op = 'DELETE' then 'deleted' else 'updated' end;
  selected_actor uuid := coalesce(
    (select auth.uid()),
    (current_data ->> 'updated_by')::uuid,
    (current_data ->> 'deleted_by')::uuid,
    (current_data ->> 'recorded_by')::uuid
  );
  selected_baby_id uuid := (current_data ->> 'baby_id')::uuid;
  selected_change_kind text;
  selected_details jsonb;
  selected_entity_type text;
  selected_family_id uuid;
begin
  if tg_op = 'UPDATE' then
    if previous_data ->> 'deleted_at' is null and current_data ->> 'deleted_at' is not null then
      selected_change_kind := 'retired';
    elsif previous_data ->> 'deleted_at' is not null and current_data ->> 'deleted_at' is null then
      selected_change_kind := 'restored';
    else
      selected_change_kind := 'edited';
    end if;
  end if;

  select family_id into selected_family_id
  from public.babies
  where id = selected_baby_id;

  if selected_family_id is null then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_table_name = 'care_events' then
    selected_entity_type := 'care_event';
    selected_details := jsonb_strip_nulls(jsonb_build_object(
      'change_kind', selected_change_kind,
      'event_type', current_data -> 'event_type',
      'before', case when previous_data is null then null else jsonb_build_object(
        'occurred_at', previous_data -> 'occurred_at',
        'ended_at', previous_data -> 'ended_at',
        'notes', previous_data -> 'notes'
      ) end,
      'after', case when tg_op = 'DELETE' then null else jsonb_build_object(
        'occurred_at', current_data -> 'occurred_at',
        'ended_at', current_data -> 'ended_at',
        'notes', current_data -> 'notes'
      ) end
    ));
  elsif tg_table_name = 'baby_notes' then
    selected_entity_type := 'baby_note';
    selected_details := jsonb_strip_nulls(jsonb_build_object(
      'change_kind', selected_change_kind,
      'before', case when previous_data is null then null else jsonb_build_object(
        'occurred_at', previous_data -> 'occurred_at',
        'content', previous_data -> 'content'
      ) end,
      'after', case when tg_op = 'DELETE' then null else jsonb_build_object(
        'occurred_at', current_data -> 'occurred_at',
        'content', current_data -> 'content'
      ) end
    ));
  else
    selected_entity_type := 'measurement';
    selected_details := jsonb_strip_nulls(jsonb_build_object(
      'change_kind', selected_change_kind,
      'before', case when previous_data is null then null else jsonb_build_object(
        'measured_at', previous_data -> 'measured_at',
        'source', previous_data -> 'source',
        'weight_grams', previous_data -> 'weight_grams',
        'length_millimeters', previous_data -> 'length_millimeters',
        'head_circumference_millimeters', previous_data -> 'head_circumference_millimeters'
      ) end,
      'after', case when tg_op = 'DELETE' then null else jsonb_build_object(
        'measured_at', current_data -> 'measured_at',
        'source', current_data -> 'source',
        'weight_grams', current_data -> 'weight_grams',
        'length_millimeters', current_data -> 'length_millimeters',
        'head_circumference_millimeters', current_data -> 'head_circumference_millimeters'
      ) end
    ));
  end if;

  insert into public.family_audit_logs (
    family_id, actor_user_id, action, entity_type, entity_id, baby_id, details
  ) values (
    selected_family_id, selected_actor, selected_action, selected_entity_type,
    (current_data ->> 'id')::uuid, selected_baby_id, selected_details
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.write_care_record_audit_log() from public;

drop trigger care_events_write_family_audit_log on public.care_events;
drop trigger baby_notes_write_family_audit_log on public.baby_notes;
drop trigger baby_measurements_write_family_audit_log on public.baby_measurements;

create trigger care_events_write_family_audit_log
after insert or update or delete on public.care_events
for each row execute function private.write_care_record_audit_log();

create trigger baby_notes_write_family_audit_log
after insert or update or delete on public.baby_notes
for each row execute function private.write_care_record_audit_log();

create trigger baby_measurements_write_family_audit_log
after insert or update or delete on public.baby_measurements
for each row execute function private.write_care_record_audit_log();
