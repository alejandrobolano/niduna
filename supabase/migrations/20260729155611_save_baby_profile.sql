create unique index baby_measurements_one_birth_record_idx
  on public.baby_measurements (baby_id)
  where source = 'birth';

create function public.save_baby_profile(
  target_baby_id uuid,
  target_life_stage public.baby_life_stage,
  target_name text,
  target_expected_due_date date,
  target_birth_date date,
  target_sex_at_birth public.sex_at_birth,
  target_blood_group public.blood_group,
  target_rhesus_factor public.rhesus_factor,
  target_gestational_weeks smallint,
  target_gestational_days smallint,
  target_notes text,
  target_weight_grams integer,
  target_length_millimeters integer,
  target_head_circumference_millimeters integer
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  saved_baby_id uuid;
  selected_family_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;

  if target_baby_id is null then
    select family_id
    into selected_family_id
    from public.family_members
    where user_id = current_user_id
      and role in ('owner', 'admin')
    order by created_at
    limit 1;

    if selected_family_id is null then
      insert into public.families (name)
      values (left('Familia de ' || trim(target_name), 80))
      returning id into selected_family_id;
    end if;

    insert into public.babies (
      family_id,
      life_stage,
      name,
      expected_due_date,
      birth_date,
      sex_at_birth,
      blood_group,
      rhesus_factor,
      gestational_weeks,
      gestational_days,
      notes
    )
    values (
      selected_family_id,
      target_life_stage,
      trim(target_name),
      target_expected_due_date,
      target_birth_date,
      target_sex_at_birth,
      target_blood_group,
      target_rhesus_factor,
      target_gestational_weeks,
      target_gestational_days,
      nullif(trim(target_notes), '')
    )
    returning id into saved_baby_id;
  else
    update public.babies
    set
      life_stage = target_life_stage,
      name = trim(target_name),
      expected_due_date = target_expected_due_date,
      birth_date = target_birth_date,
      sex_at_birth = target_sex_at_birth,
      blood_group = target_blood_group,
      rhesus_factor = target_rhesus_factor,
      gestational_weeks = target_gestational_weeks,
      gestational_days = target_gestational_days,
      notes = nullif(trim(target_notes), '')
    where id = target_baby_id
    returning id, family_id into saved_baby_id, selected_family_id;

    if saved_baby_id is null then
      raise exception 'Baby profile was not found or cannot be managed'
        using errcode = '42501';
    end if;
  end if;

  if
    target_life_stage = 'born'
    and (
      target_weight_grams is not null
      or target_length_millimeters is not null
      or target_head_circumference_millimeters is not null
    )
  then
    insert into public.baby_measurements (
      baby_id,
      measured_at,
      weight_grams,
      length_millimeters,
      head_circumference_millimeters,
      source
    )
    values (
      saved_baby_id,
      target_birth_date::timestamp at time zone 'UTC',
      target_weight_grams,
      target_length_millimeters,
      target_head_circumference_millimeters,
      'birth'
    )
    on conflict (baby_id) where source = 'birth'
    do update set
      measured_at = excluded.measured_at,
      weight_grams = excluded.weight_grams,
      length_millimeters = excluded.length_millimeters,
      head_circumference_millimeters = excluded.head_circumference_millimeters,
      recorded_by = current_user_id;
  else
    delete from public.baby_measurements
    where baby_id = saved_baby_id
      and source = 'birth';
  end if;

  return saved_baby_id;
end;
$$;

revoke all on function public.save_baby_profile(
  uuid,
  public.baby_life_stage,
  text,
  date,
  date,
  public.sex_at_birth,
  public.blood_group,
  public.rhesus_factor,
  smallint,
  smallint,
  text,
  integer,
  integer,
  integer
) from public, anon;

grant execute on function public.save_baby_profile(
  uuid,
  public.baby_life_stage,
  text,
  date,
  date,
  public.sex_at_birth,
  public.blood_group,
  public.rhesus_factor,
  smallint,
  smallint,
  text,
  integer,
  integer,
  integer
) to authenticated;
