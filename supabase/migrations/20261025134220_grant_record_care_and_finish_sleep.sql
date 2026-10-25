grant execute on function private.record_care_and_finish_sleep(
  uuid,
  public.care_event_type,
  timestamptz,
  text,
  public.feeding_method,
  integer,
  public.breast_side,
  public.diaper_condition
) to authenticated;
