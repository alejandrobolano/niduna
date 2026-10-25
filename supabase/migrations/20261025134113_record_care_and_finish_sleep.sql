create function private.record_care_and_finish_sleep(
  target_baby_id uuid,
  target_event_type public.care_event_type,
  target_occurred_at timestamptz,
  target_notes text,
  target_feeding_method public.feeding_method,
  target_amount_milliliters integer,
  target_breast_side public.breast_side,
  target_diaper_condition public.diaper_condition
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  active_sleep public.care_events%rowtype;
  recorded_event_id uuid;
begin
  if actor_id is null or not private.can_record_baby_care(target_baby_id) then
    raise exception 'care_record_not_allowed' using errcode = '42501';
  end if;

  if target_event_type not in ('feeding', 'diaper') then
    raise exception 'care_record_invalid_type' using errcode = '22023';
  end if;

  if target_occurred_at > now()
    or target_occurred_at < now() - interval '121 minutes' then
    raise exception 'care_record_invalid_occurrence' using errcode = '22023';
  end if;

  select * into active_sleep
  from public.care_events
  where baby_id = target_baby_id
    and event_type = 'sleep'
    and ended_at is null
    and deleted_at is null
  for update;

  if not found then
    raise exception 'care_sleep_not_active' using errcode = 'P0002';
  end if;

  if target_occurred_at <= active_sleep.occurred_at then
    raise exception 'care_sleep_invalid_end' using errcode = '22023';
  end if;

  insert into public.care_events (
    baby_id,
    event_type,
    occurred_at,
    feeding_method,
    amount_milliliters,
    breast_side,
    diaper_condition,
    notes
  ) values (
    target_baby_id,
    target_event_type,
    target_occurred_at,
    target_feeding_method,
    target_amount_milliliters,
    target_breast_side,
    target_diaper_condition,
    nullif(trim(target_notes), '')
  )
  returning id into recorded_event_id;

  update public.care_events
  set ended_at = target_occurred_at
  where id = active_sleep.id;

  return recorded_event_id;
end;
$$;

create function public.record_care_and_finish_sleep(
  target_baby_id uuid,
  target_event_type public.care_event_type,
  target_occurred_at timestamptz,
  target_notes text default null,
  target_feeding_method public.feeding_method default null,
  target_amount_milliliters integer default null,
  target_breast_side public.breast_side default null,
  target_diaper_condition public.diaper_condition default null
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.record_care_and_finish_sleep(
    target_baby_id,
    target_event_type,
    target_occurred_at,
    target_notes,
    target_feeding_method,
    target_amount_milliliters,
    target_breast_side,
    target_diaper_condition
  );
$$;

revoke all on function private.record_care_and_finish_sleep(
  uuid,
  public.care_event_type,
  timestamptz,
  text,
  public.feeding_method,
  integer,
  public.breast_side,
  public.diaper_condition
) from public, anon, authenticated;

revoke all on function public.record_care_and_finish_sleep(
  uuid,
  public.care_event_type,
  timestamptz,
  text,
  public.feeding_method,
  integer,
  public.breast_side,
  public.diaper_condition
) from public, anon;

grant execute on function public.record_care_and_finish_sleep(
  uuid,
  public.care_event_type,
  timestamptz,
  text,
  public.feeding_method,
  integer,
  public.breast_side,
  public.diaper_condition
) to authenticated;
