create index families_created_by_idx on public.families (created_by);
create index family_members_created_by_idx on public.family_members (created_by);
create index babies_created_by_idx on public.babies (created_by);
create index baby_measurements_recorded_by_idx
  on public.baby_measurements (recorded_by);
