create index baby_contractions_family_idx
  on public.baby_contractions (family_id);

create index baby_contractions_recorded_by_idx
  on public.baby_contractions (recorded_by);
