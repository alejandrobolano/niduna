create table private.data_retention_runs (
  id bigint generated always as identity primary key,
  executed_at timestamptz not null default now(),
  retired_cutoff_at timestamptz not null,
  audit_cutoff_at timestamptz not null,
  deleted_care_events integer not null,
  deleted_baby_notes integer not null,
  deleted_baby_measurements integer not null,
  deleted_family_audit_logs integer not null
);

revoke all on table private.data_retention_runs from public, anon, authenticated;
revoke all on sequence private.data_retention_runs_id_seq from public, anon, authenticated;

create or replace function private.restore_care_record(
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
  actor_id uuid := (select auth.uid());
  retired_at timestamptz;
begin
  if actor_id is null or not private.can_manage_baby(target_baby_id) then
    raise exception 'care_record_not_allowed' using errcode = '42501';
  end if;

  if target_source_type = 'care_event' then
    select deleted_at into retired_at
    from public.care_events
    where id = target_record_id and baby_id = target_baby_id
      and deleted_at is not null
    for update;
  elsif target_source_type = 'baby_note' then
    select deleted_at into retired_at
    from public.baby_notes
    where id = target_record_id and baby_id = target_baby_id
      and deleted_at is not null
    for update;
  elsif target_source_type = 'measurement' then
    select deleted_at into retired_at
    from public.baby_measurements
    where id = target_record_id and baby_id = target_baby_id
      and deleted_at is not null
    for update;
  else
    raise exception 'care_record_not_allowed' using errcode = '42501';
  end if;

  if not found or retired_at is null then
    raise exception 'care_record_not_allowed' using errcode = '42501';
  end if;

  if retired_at <= now() - interval '30 days' then
    raise exception 'care_record_recovery_expired' using errcode = 'P0001';
  end if;

  if target_source_type = 'care_event' then
    update public.care_events
    set deleted_at = null, deleted_by = null
    where id = target_record_id;
  elsif target_source_type = 'baby_note' then
    update public.baby_notes
    set deleted_at = null, deleted_by = null
    where id = target_record_id;
  else
    update public.baby_measurements
    set deleted_at = null, deleted_by = null
    where id = target_record_id;
  end if;
end;
$$;

drop trigger care_events_write_family_audit_log on public.care_events;
drop trigger baby_notes_write_family_audit_log on public.baby_notes;
drop trigger baby_measurements_write_family_audit_log on public.baby_measurements;

create trigger care_events_write_family_audit_log
after insert or update on public.care_events
for each row execute function private.write_care_record_audit_log();

create trigger care_events_delete_family_audit_log
after delete on public.care_events
for each row when (old.deleted_at is null)
execute function private.write_care_record_audit_log();

create trigger baby_notes_write_family_audit_log
after insert or update on public.baby_notes
for each row execute function private.write_care_record_audit_log();

create trigger baby_notes_delete_family_audit_log
after delete on public.baby_notes
for each row when (old.deleted_at is null)
execute function private.write_care_record_audit_log();

create trigger baby_measurements_write_family_audit_log
after insert or update on public.baby_measurements
for each row execute function private.write_care_record_audit_log();

create trigger baby_measurements_delete_family_audit_log
after delete on public.baby_measurements
for each row when (old.deleted_at is null)
execute function private.write_care_record_audit_log();

create function private.apply_data_retention(target_now timestamptz default now())
returns private.data_retention_runs
language plpgsql
security definer
set search_path = ''
as $$
declare
  retired_cutoff timestamptz := target_now - interval '30 days';
  audit_cutoff timestamptz := target_now - interval '180 days';
  deleted_events integer;
  deleted_notes integer;
  deleted_measurements integer;
  deleted_audit_logs integer;
  retention_run private.data_retention_runs%rowtype;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('niduna:data-retention', 0)
  );

  delete from public.care_events
  where deleted_at is not null and deleted_at < retired_cutoff;
  get diagnostics deleted_events = row_count;

  delete from public.baby_notes
  where deleted_at is not null and deleted_at < retired_cutoff;
  get diagnostics deleted_notes = row_count;

  delete from public.baby_measurements
  where deleted_at is not null and deleted_at < retired_cutoff;
  get diagnostics deleted_measurements = row_count;

  delete from public.family_audit_logs
  where created_at < audit_cutoff;
  get diagnostics deleted_audit_logs = row_count;

  delete from private.data_retention_runs
  where executed_at < audit_cutoff;

  insert into private.data_retention_runs (
    executed_at,
    retired_cutoff_at,
    audit_cutoff_at,
    deleted_care_events,
    deleted_baby_notes,
    deleted_baby_measurements,
    deleted_family_audit_logs
  ) values (
    target_now,
    retired_cutoff,
    audit_cutoff,
    deleted_events,
    deleted_notes,
    deleted_measurements,
    deleted_audit_logs
  )
  returning * into retention_run;

  return retention_run;
end;
$$;

revoke all on function private.apply_data_retention(timestamptz)
from public, anon, authenticated;

select cron.unschedule(jobid)
from cron.job
where jobname in (
  'purge-niduna-family-audit-logs',
  'apply-niduna-data-retention'
);

select cron.schedule(
  'apply-niduna-data-retention',
  '17 3 * * *',
  $cron$select private.apply_data_retention();$cron$
);
