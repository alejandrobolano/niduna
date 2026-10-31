create index if not exists baby_medications_family_baby_fk_idx
  on public.baby_medications (family_id, baby_id);

create index if not exists medication_administrations_medication_family_baby_fk_idx
  on public.baby_medication_administrations (medication_id, family_id, baby_id);
