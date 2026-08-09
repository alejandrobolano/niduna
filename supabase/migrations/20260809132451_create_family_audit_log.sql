create table public.family_audit_logs (
  id bigint generated always as identity primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('created', 'updated', 'deleted')),
  entity_type text not null check (
    entity_type in (
      'baby',
      'baby_note',
      'care_event',
      'family_member',
      'measurement'
    )
  ),
  entity_id uuid,
  baby_id uuid references public.babies(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index family_audit_logs_family_created_at_idx
  on public.family_audit_logs (family_id, created_at desc);

create index family_audit_logs_actor_user_idx
  on public.family_audit_logs (actor_user_id)
  where actor_user_id is not null;

alter table public.family_audit_logs enable row level security;

create policy family_audit_logs_select_managers
on public.family_audit_logs for select
to authenticated
using (
  private.has_family_role(
    family_id,
    array['owner', 'admin']::public.family_role[]
  )
);

grant select on public.family_audit_logs to authenticated;

create function private.write_family_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_data jsonb;
  previous_data jsonb;
  selected_action text;
  selected_actor uuid := (select auth.uid());
  selected_baby_id uuid;
  selected_details jsonb := '{}'::jsonb;
  selected_entity_id uuid;
  selected_entity_type text;
  selected_family_id uuid;
begin
  if tg_op = 'DELETE' then
    current_data := to_jsonb(old);
    previous_data := to_jsonb(old);
    selected_action := 'deleted';
  elsif tg_op = 'UPDATE' then
    current_data := to_jsonb(new);
    previous_data := to_jsonb(old);
    selected_action := 'updated';

    if (
      previous_data - 'updated_at' - 'updated_by'
      = current_data - 'updated_at' - 'updated_by'
    ) then
      return new;
    end if;
  else
    current_data := to_jsonb(new);
    selected_action := 'created';
  end if;

  selected_entity_id := (current_data ->> 'id')::uuid;

  if tg_table_name = 'babies' then
    selected_entity_type := 'baby';
    selected_baby_id := selected_entity_id;
    selected_family_id := (current_data ->> 'family_id')::uuid;
    selected_actor := coalesce(
      selected_actor,
      (current_data ->> 'archived_by')::uuid,
      (current_data ->> 'created_by')::uuid
    );
    selected_details := jsonb_strip_nulls(jsonb_build_object(
      'before', case when previous_data is null then null else jsonb_build_object(
        'birth_date', previous_data -> 'birth_date',
        'blood_group', previous_data -> 'blood_group',
        'expected_due_date', previous_data -> 'expected_due_date',
        'life_stage', previous_data -> 'life_stage',
        'name', previous_data -> 'name',
        'rhesus_factor', previous_data -> 'rhesus_factor',
        'sex_at_birth', previous_data -> 'sex_at_birth'
      ) end,
      'after', case when tg_op = 'DELETE' then null else jsonb_build_object(
        'birth_date', current_data -> 'birth_date',
        'blood_group', current_data -> 'blood_group',
        'expected_due_date', current_data -> 'expected_due_date',
        'life_stage', current_data -> 'life_stage',
        'name', current_data -> 'name',
        'rhesus_factor', current_data -> 'rhesus_factor',
        'sex_at_birth', current_data -> 'sex_at_birth'
      ) end,
      'notes_changed', case
        when previous_data is null then null
        else previous_data -> 'notes' is distinct from current_data -> 'notes'
      end,
      'photo_changed', case
        when previous_data is null then null
        else previous_data -> 'photo_path' is distinct from current_data -> 'photo_path'
      end
    ));
  elsif tg_table_name = 'family_members' then
    selected_entity_type := 'family_member';
    selected_family_id := (current_data ->> 'family_id')::uuid;
    selected_actor := coalesce(
      selected_actor,
      (current_data ->> 'created_by')::uuid
    );
    selected_details := jsonb_strip_nulls(jsonb_build_object(
      'before', case when previous_data is null then null else jsonb_build_object(
        'relationship', previous_data -> 'relationship',
        'role', previous_data -> 'role',
        'user_id', previous_data -> 'user_id'
      ) end,
      'after', case when tg_op = 'DELETE' then null else jsonb_build_object(
        'relationship', current_data -> 'relationship',
        'role', current_data -> 'role',
        'user_id', current_data -> 'user_id'
      ) end
    ));
  else
    selected_baby_id := (current_data ->> 'baby_id')::uuid;

    select family_id
    into selected_family_id
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
      selected_actor := coalesce(
        selected_actor,
        (current_data ->> 'updated_by')::uuid,
        (current_data ->> 'recorded_by')::uuid
      );
      selected_details := jsonb_build_object(
        'event_type', current_data -> 'event_type'
      );
    elsif tg_table_name = 'baby_notes' then
      selected_entity_type := 'baby_note';
      selected_actor := coalesce(
        selected_actor,
        (current_data ->> 'recorded_by')::uuid
      );
    elsif tg_table_name = 'baby_measurements' then
      selected_entity_type := 'measurement';
      selected_actor := coalesce(
        selected_actor,
        (current_data ->> 'recorded_by')::uuid
      );
      selected_details := jsonb_strip_nulls(jsonb_build_object(
        'before', case when previous_data is null then null else jsonb_build_object(
          'head_circumference_millimeters', previous_data -> 'head_circumference_millimeters',
          'length_millimeters', previous_data -> 'length_millimeters',
          'source', previous_data -> 'source',
          'weight_grams', previous_data -> 'weight_grams'
        ) end,
        'after', case when tg_op = 'DELETE' then null else jsonb_build_object(
          'head_circumference_millimeters', current_data -> 'head_circumference_millimeters',
          'length_millimeters', current_data -> 'length_millimeters',
          'source', current_data -> 'source',
          'weight_grams', current_data -> 'weight_grams'
        ) end
      ));
    end if;
  end if;

  if selected_entity_type is not null and selected_family_id is not null then
    insert into public.family_audit_logs (
      family_id,
      actor_user_id,
      action,
      entity_type,
      entity_id,
      baby_id,
      details
    )
    values (
      selected_family_id,
      selected_actor,
      selected_action,
      selected_entity_type,
      selected_entity_id,
      selected_baby_id,
      selected_details
    );
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

revoke all on function private.write_family_audit_log() from public;

create trigger babies_write_family_audit_log
after insert or update or delete on public.babies
for each row execute function private.write_family_audit_log();

create trigger baby_measurements_write_family_audit_log
after insert or update or delete on public.baby_measurements
for each row execute function private.write_family_audit_log();

create trigger baby_notes_write_family_audit_log
after insert or update or delete on public.baby_notes
for each row execute function private.write_family_audit_log();

create trigger care_events_write_family_audit_log
after insert or update or delete on public.care_events
for each row execute function private.write_family_audit_log();

create trigger family_members_write_family_audit_log
after insert or update or delete on public.family_members
for each row execute function private.write_family_audit_log();

create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

select cron.schedule(
  'purge-niduna-family-audit-logs',
  '17 3 * * *',
  $$delete from public.family_audit_logs
    where created_at < now() - interval '90 days'$$
);
