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

  perform pg_catalog.set_config('app.suppress_family_audit', 'on', true);

  delete from public.families family
  where family.id = any(owned_family_ids);

  perform pg_catalog.set_config('app.suppress_family_audit', 'off', true);
  perform public.delete_personal_account_data(target_user_id);
end;
$$;

revoke all on function public.delete_owned_families_and_personal_account_data(uuid)
from public, anon, authenticated;

grant execute on function public.delete_owned_families_and_personal_account_data(uuid)
to service_role;

drop trigger babies_write_family_audit_log on public.babies;
create trigger babies_write_family_audit_log
after insert or update or delete on public.babies
for each row
when (pg_catalog.current_setting('app.suppress_family_audit', true) is distinct from 'on')
execute function private.write_family_audit_log();

drop trigger family_members_write_family_audit_log on public.family_members;
create trigger family_members_write_family_audit_log
after insert or update or delete on public.family_members
for each row
when (pg_catalog.current_setting('app.suppress_family_audit', true) is distinct from 'on')
execute function private.write_family_audit_log();

drop trigger care_events_write_family_audit_log on public.care_events;
create trigger care_events_write_family_audit_log
after insert or update on public.care_events
for each row
when (pg_catalog.current_setting('app.suppress_family_audit', true) is distinct from 'on')
execute function private.write_care_record_audit_log();

drop trigger care_events_delete_family_audit_log on public.care_events;
create trigger care_events_delete_family_audit_log
after delete on public.care_events
for each row
when (
  old.deleted_at is null
  and pg_catalog.current_setting('app.suppress_family_audit', true) is distinct from 'on'
)
execute function private.write_care_record_audit_log();

drop trigger baby_notes_write_family_audit_log on public.baby_notes;
create trigger baby_notes_write_family_audit_log
after insert or update on public.baby_notes
for each row
when (pg_catalog.current_setting('app.suppress_family_audit', true) is distinct from 'on')
execute function private.write_care_record_audit_log();

drop trigger baby_notes_delete_family_audit_log on public.baby_notes;
create trigger baby_notes_delete_family_audit_log
after delete on public.baby_notes
for each row
when (
  old.deleted_at is null
  and pg_catalog.current_setting('app.suppress_family_audit', true) is distinct from 'on'
)
execute function private.write_care_record_audit_log();

drop trigger baby_measurements_write_family_audit_log on public.baby_measurements;
create trigger baby_measurements_write_family_audit_log
after insert or update on public.baby_measurements
for each row
when (pg_catalog.current_setting('app.suppress_family_audit', true) is distinct from 'on')
execute function private.write_care_record_audit_log();

drop trigger baby_measurements_delete_family_audit_log on public.baby_measurements;
create trigger baby_measurements_delete_family_audit_log
after delete on public.baby_measurements
for each row
when (
  old.deleted_at is null
  and pg_catalog.current_setting('app.suppress_family_audit', true) is distinct from 'on'
)
execute function private.write_care_record_audit_log();
