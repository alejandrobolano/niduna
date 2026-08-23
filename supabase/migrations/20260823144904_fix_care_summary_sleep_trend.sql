create or replace function public.get_care_summary_trend(
  target_baby_id uuid,
  target_range_start timestamptz,
  target_range_end timestamptz,
  target_bucket_minutes integer
)
returns table (
  bucket_start timestamptz,
  feeding_count bigint,
  feeding_amount_milliliters bigint,
  diaper_count bigint,
  sleep_minutes bigint,
  note_count bigint
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if target_range_start is null
    or target_range_end is null
    or target_range_end <= target_range_start
    or target_range_end - target_range_start > interval '31 days'
    or target_bucket_minutes not in (240, 1440)
  then
    raise exception 'invalid_care_summary_trend_range'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.babies as baby
    join public.family_members as member
      on member.family_id = baby.family_id
    where baby.id = target_baby_id
      and member.user_id = (select auth.uid())
  ) then
    raise exception 'care_summary_trend_not_allowed'
      using errcode = '42501';
  end if;

  return query
  with buckets as (
    select generated_bucket as starts_at
    from generate_series(
      target_range_start,
      target_range_end - interval '1 microsecond',
      make_interval(mins => target_bucket_minutes)
    ) as generated_bucket
  ),
  event_totals as (
    select
      buckets.starts_at,
      count(*) filter (
        where care_events.event_type = 'feeding'
      )::bigint as feeding_events,
      coalesce(sum(care_events.amount_milliliters) filter (
        where care_events.event_type = 'feeding'
      ), 0)::bigint as feeding_amount,
      count(*) filter (
        where care_events.event_type = 'diaper'
      )::bigint as diaper_events
    from buckets
    left join public.care_events
      on care_events.baby_id = target_baby_id
      and care_events.deleted_at is null
      and care_events.event_type in ('feeding', 'diaper')
      and care_events.occurred_at >= buckets.starts_at
      and care_events.occurred_at < least(
        buckets.starts_at + make_interval(mins => target_bucket_minutes),
        target_range_end,
        now()
      )
    group by buckets.starts_at
  ),
  sleep_totals as (
    select
      buckets.starts_at,
      coalesce(round(sum(
        extract(epoch from (
          least(
            coalesce(care_events.ended_at, now()),
            buckets.starts_at + make_interval(mins => target_bucket_minutes),
            target_range_end,
            now()
          ) - greatest(care_events.occurred_at, buckets.starts_at)
        )) / 60
      ) filter (
        where care_events.id is not null
      )), 0)::bigint as minutes
    from buckets
    left join public.care_events
      on care_events.baby_id = target_baby_id
      and care_events.deleted_at is null
      and care_events.event_type = 'sleep'
      and care_events.occurred_at < least(
        buckets.starts_at + make_interval(mins => target_bucket_minutes),
        target_range_end,
        now()
      )
      and coalesce(care_events.ended_at, now()) > buckets.starts_at
    group by buckets.starts_at
  ),
  note_totals as (
    select
      buckets.starts_at,
      count(baby_notes.id)::bigint as notes
    from buckets
    left join public.baby_notes
      on baby_notes.baby_id = target_baby_id
      and baby_notes.deleted_at is null
      and baby_notes.occurred_at >= buckets.starts_at
      and baby_notes.occurred_at < least(
        buckets.starts_at + make_interval(mins => target_bucket_minutes),
        target_range_end,
        now()
      )
    group by buckets.starts_at
  )
  select
    event_totals.starts_at,
    event_totals.feeding_events,
    event_totals.feeding_amount,
    event_totals.diaper_events,
    sleep_totals.minutes,
    note_totals.notes
  from event_totals
  join sleep_totals using (starts_at)
  join note_totals using (starts_at)
  order by event_totals.starts_at;
end;
$$;
