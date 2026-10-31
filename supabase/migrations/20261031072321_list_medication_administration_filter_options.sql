create function public.list_medication_administration_filter_options(
  target_baby_id uuid,
  target_start_at timestamptz default null,
  target_end_at timestamptz default null,
  target_retired boolean default false
)
returns table (
  medication_id uuid,
  medication_name text,
  medication_presentation text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select distinct
    administration.medication_id,
    administration.medication_name,
    administration.medication_presentation
  from public.baby_medication_administrations administration
  where administration.baby_id = target_baby_id
    and (
      (target_retired and administration.retired_at is not null)
      or (not target_retired and administration.retired_at is null)
    )
    and (target_start_at is null or administration.administered_at >= target_start_at)
    and (target_end_at is null or administration.administered_at <= target_end_at)
  order by administration.medication_name, administration.medication_id;
$$;

revoke all on function public.list_medication_administration_filter_options(
  uuid, timestamptz, timestamptz, boolean
) from public, anon;

grant execute on function public.list_medication_administration_filter_options(
  uuid, timestamptz, timestamptz, boolean
) to authenticated;
