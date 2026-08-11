drop policy baby_measurements_update_recorders on public.baby_measurements;

create policy baby_measurements_update_recorders
on public.baby_measurements for update
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
