create function public.get_care_range_summary(
  target_baby_id uuid,
  target_range_start timestamptz,
  target_range_end timestamptz
)
returns table (
  feeding_count bigint,
  feeding_amount_milliliters bigint,
  feeding_amount_count bigint,
  average_feeding_interval_minutes integer,
  diaper_wet_count bigint,
  diaper_dirty_count bigint,
  diaper_both_count bigint,
  sleep_minutes bigint,
  note_count bigint,
  latest_measurement_at timestamptz,
  latest_weight_grams integer,
  latest_length_millimeters integer,
  latest_head_circumference_millimeters integer,
  latest_measurement_source text
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
  then
    raise exception 'invalid_care_summary_range'
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
    raise exception 'care_summary_not_allowed'
      using errcode = '42501';
  end if;

  return query
  with range_events as (
    select
      care_events.event_type,
      care_events.occurred_at,
      care_events.amount_milliliters,
      care_events.diaper_condition
    from public.care_events
    where care_events.baby_id = target_baby_id
      and care_events.deleted_at is null
      and care_events.occurred_at >= target_range_start
      and care_events.occurred_at < target_range_end
      and care_events.occurred_at <= now()
      and care_events.event_type in ('feeding', 'diaper')
  ),
  ordered_feedings as (
    select
      range_events.occurred_at,
      range_events.amount_milliliters,
      lag(range_events.occurred_at) over (
        order by range_events.occurred_at
      ) as previous_occurred_at
    from range_events
    where range_events.event_type = 'feeding'
  ),
  feeding_summary as (
    select
      count(*)::bigint as event_count,
      coalesce(sum(ordered_feedings.amount_milliliters), 0)::bigint
        as amount_milliliters,
      count(ordered_feedings.amount_milliliters)::bigint as amount_count,
      round(
        avg(
          extract(epoch from (
            ordered_feedings.occurred_at
            - ordered_feedings.previous_occurred_at
          )) / 60
        ) filter (
          where ordered_feedings.previous_occurred_at is not null
        )
      )::integer as interval_minutes
    from ordered_feedings
  ),
  diaper_summary as (
    select
      count(*) filter (
        where range_events.diaper_condition = 'wet'
      )::bigint as wet_count,
      count(*) filter (
        where range_events.diaper_condition = 'dirty'
      )::bigint as dirty_count,
      count(*) filter (
        where range_events.diaper_condition = 'both'
      )::bigint as both_count
    from range_events
    where range_events.event_type = 'diaper'
  ),
  sleep_summary as (
    select coalesce(
      round(sum(
        extract(epoch from (
          least(
            coalesce(care_events.ended_at, now()),
            target_range_end,
            now()
          ) - greatest(care_events.occurred_at, target_range_start)
        )) / 60
      )),
      0
    )::bigint as minutes
    from public.care_events
    where care_events.baby_id = target_baby_id
      and care_events.deleted_at is null
      and care_events.event_type = 'sleep'
      and care_events.occurred_at < least(target_range_end, now())
      and coalesce(care_events.ended_at, now()) > target_range_start
  ),
  note_summary as (
    select count(*)::bigint as event_count
    from public.baby_notes
    where baby_notes.baby_id = target_baby_id
      and baby_notes.deleted_at is null
      and baby_notes.occurred_at >= target_range_start
      and baby_notes.occurred_at < target_range_end
      and baby_notes.occurred_at <= now()
  ),
  latest_measurement as (
    select
      baby_measurements.measured_at,
      baby_measurements.weight_grams,
      baby_measurements.length_millimeters,
      baby_measurements.head_circumference_millimeters,
      baby_measurements.source
    from public.baby_measurements
    where baby_measurements.baby_id = target_baby_id
      and baby_measurements.deleted_at is null
      and baby_measurements.measured_at <= now()
    order by baby_measurements.measured_at desc
    limit 1
  )
  select
    feeding_summary.event_count,
    feeding_summary.amount_milliliters,
    feeding_summary.amount_count,
    feeding_summary.interval_minutes,
    diaper_summary.wet_count,
    diaper_summary.dirty_count,
    diaper_summary.both_count,
    sleep_summary.minutes,
    note_summary.event_count,
    latest_measurement.measured_at,
    latest_measurement.weight_grams,
    latest_measurement.length_millimeters,
    latest_measurement.head_circumference_millimeters,
    latest_measurement.source
  from feeding_summary
  cross join diaper_summary
  cross join sleep_summary
  cross join note_summary
  left join latest_measurement on true;
end;
$$;

create function public.get_care_summary_trend(
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

create function public.get_measurement_evolution(target_baby_id uuid)
returns table (
  measured_at timestamptz,
  weight_grams integer,
  length_millimeters integer,
  head_circumference_millimeters integer,
  measurement_source text
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.babies as baby
    join public.family_members as member
      on member.family_id = baby.family_id
    where baby.id = target_baby_id
      and member.user_id = (select auth.uid())
  ) then
    raise exception 'measurement_evolution_not_allowed'
      using errcode = '42501';
  end if;

  return query
  select
    baby_measurements.measured_at,
    baby_measurements.weight_grams,
    baby_measurements.length_millimeters,
    baby_measurements.head_circumference_millimeters,
    baby_measurements.source
  from public.baby_measurements
  join public.babies as baby
    on baby.id = baby_measurements.baby_id
  where baby_measurements.baby_id = target_baby_id
    and baby_measurements.deleted_at is null
    and baby_measurements.measured_at >= baby.birth_date::timestamp at time zone 'UTC'
    and baby_measurements.measured_at <= now()
  order by baby_measurements.measured_at;
end;
$$;

revoke execute on function public.get_care_range_summary(
  uuid,
  timestamptz,
  timestamptz
) from public, anon;
revoke execute on function public.get_care_summary_trend(
  uuid,
  timestamptz,
  timestamptz,
  integer
) from public, anon;
revoke execute on function public.get_measurement_evolution(uuid)
  from public, anon;

grant execute on function public.get_care_range_summary(
  uuid,
  timestamptz,
  timestamptz
) to authenticated;
grant execute on function public.get_care_summary_trend(
  uuid,
  timestamptz,
  timestamptz,
  integer
) to authenticated;
grant execute on function public.get_measurement_evolution(uuid)
  to authenticated;
