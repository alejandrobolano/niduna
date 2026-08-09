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
  care_events.recorded_by
from public.care_events
union all
select
  baby_notes.id,
  baby_notes.baby_id,
  'note'::text as event_type,
  'baby_note'::text as source_type,
  baby_notes.occurred_at,
  null::timestamptz as ended_at,
  null::text as feeding_method,
  null::integer as amount_milliliters,
  null::text as breast_side,
  null::text as diaper_condition,
  baby_notes.content,
  null::text as notes,
  null::integer as weight_grams,
  null::integer as length_millimeters,
  null::integer as head_circumference_millimeters,
  null::text as measurement_source,
  baby_notes.recorded_by
from public.baby_notes
union all
select
  baby_measurements.id,
  baby_measurements.baby_id,
  'measurement'::text as event_type,
  'measurement'::text as source_type,
  baby_measurements.measured_at as occurred_at,
  null::timestamptz as ended_at,
  null::text as feeding_method,
  null::integer as amount_milliliters,
  null::text as breast_side,
  null::text as diaper_condition,
  null::text as content,
  baby_measurements.notes,
  baby_measurements.weight_grams,
  baby_measurements.length_millimeters,
  baby_measurements.head_circumference_millimeters,
  baby_measurements.source,
  baby_measurements.recorded_by
from public.baby_measurements;

grant select on public.care_timeline to authenticated;

create policy care_events_delete_recorders
on public.care_events for delete
to authenticated
using (
  recorded_by = (select auth.uid())
  or private.can_manage_baby(baby_id)
);

grant delete on public.care_events to authenticated;
