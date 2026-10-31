alter table public.baby_medications
  alter column presentation drop not null,
  alter column indicated_dose_amount drop not null,
  alter column indicated_dose_unit drop not null;

alter table public.baby_medications
  drop constraint if exists baby_medications_presentation_check,
  drop constraint if exists baby_medications_indicated_dose_amount_check,
  drop constraint if exists baby_medications_indicated_dose_unit_check;

alter table public.baby_medications
  add constraint baby_medications_presentation_check check (
    presentation is null
    or char_length(trim(presentation)) between 1 and 160
  ),
  add constraint baby_medications_indicated_dose_amount_check check (
    indicated_dose_amount is null
    or indicated_dose_amount > 0 and indicated_dose_amount <= 999999999
  ),
  add constraint baby_medications_indicated_dose_unit_check check (
    indicated_dose_unit is null
    or char_length(trim(indicated_dose_unit)) between 1 and 30
  );

alter table public.baby_medication_administrations
  alter column medication_presentation drop not null;

alter table public.baby_medication_administrations
  drop constraint if exists baby_medication_administrations_medication_presentation_check;

alter table public.baby_medication_administrations
  add constraint baby_medication_administrations_medication_presentation_check check (
    medication_presentation is null
    or char_length(trim(medication_presentation)) between 1 and 160
  );

create or replace function private.save_baby_medication(
  target_medication_id uuid,
  target_baby_id uuid,
  target_category public.baby_medication_category,
  target_name text,
  target_presentation text,
  target_indicated_dose_amount numeric,
  target_indicated_dose_unit text,
  target_administration_route text,
  target_instructions text,
  target_indicated_by text,
  target_start_date date,
  target_end_date date,
  target_status public.baby_medication_status
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  selected_family_id uuid;
  selected_medication_id uuid := coalesce(target_medication_id, gen_random_uuid());
begin
  select baby.family_id
  into selected_family_id
  from public.babies baby
  where baby.id = target_baby_id
    and baby.archived_at is null;

  if actor_id is null
    or selected_family_id is null
    or not private.can_manage_baby_medications(target_baby_id)
  then
    raise exception 'baby_medication_not_allowed' using errcode = '42501';
  end if;

  if target_category is null
    or coalesce(char_length(trim(target_name)), 0) not between 1 and 120
    or target_presentation is not null
      and char_length(trim(target_presentation)) not between 1 and 160
    or target_indicated_dose_amount is not null
      and (target_indicated_dose_amount <= 0 or target_indicated_dose_amount > 999999999)
    or target_indicated_dose_unit is not null
      and char_length(trim(target_indicated_dose_unit)) not between 1 and 30
    or target_administration_route is not null
      and char_length(trim(target_administration_route)) not between 1 and 80
    or target_instructions is not null and char_length(target_instructions) > 1000
    or target_indicated_by is not null and char_length(trim(target_indicated_by)) > 120
    or target_end_date is not null
      and target_start_date is not null
      and target_end_date < target_start_date
    or target_status is null
  then
    raise exception 'baby_medication_invalid' using errcode = '22023';
  end if;

  if target_medication_id is null then
    insert into public.baby_medications (
      id, family_id, baby_id, category, name, presentation,
      indicated_dose_amount, indicated_dose_unit, administration_route,
      instructions, indicated_by, start_date, end_date, status,
      created_by, updated_by
    ) values (
      selected_medication_id, selected_family_id, target_baby_id, target_category,
      trim(target_name), nullif(trim(target_presentation), ''), target_indicated_dose_amount,
      nullif(trim(target_indicated_dose_unit), ''), nullif(trim(target_administration_route), ''),
      nullif(trim(target_instructions), ''), nullif(trim(target_indicated_by), ''),
      target_start_date, target_end_date, target_status, actor_id, actor_id
    );
  else
    update public.baby_medications
    set category = target_category,
        name = trim(target_name),
        presentation = nullif(trim(target_presentation), ''),
        indicated_dose_amount = target_indicated_dose_amount,
        indicated_dose_unit = nullif(trim(target_indicated_dose_unit), ''),
        administration_route = nullif(trim(target_administration_route), ''),
        instructions = nullif(trim(target_instructions), ''),
        indicated_by = nullif(trim(target_indicated_by), ''),
        start_date = target_start_date,
        end_date = target_end_date,
        status = target_status,
        updated_by = actor_id,
        updated_at = now()
    where id = target_medication_id
      and baby_id = target_baby_id
      and retired_at is null;

    if not found then
      raise exception 'baby_medication_not_found' using errcode = 'P0002';
    end if;
  end if;

  return selected_medication_id;
end;
$$;
