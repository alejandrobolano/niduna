create table public.baby_contractions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  baby_id uuid not null references public.babies (id) on delete cascade,
  recorded_by uuid not null references auth.users (id) on delete restrict,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint baby_contractions_valid_period check (
    ended_at is null or ended_at >= started_at
  )
);

create index baby_contractions_baby_started_idx
  on public.baby_contractions (baby_id, started_at desc);

create unique index baby_contractions_one_active_per_baby_idx
  on public.baby_contractions (baby_id)
  where ended_at is null;

alter table public.baby_contractions enable row level security;

create policy baby_contractions_select_members
on public.baby_contractions for select
to authenticated
using (private.is_family_member(family_id));

create function public.start_baby_contraction(target_baby_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  selected_family_id uuid;
  selected_contraction_id uuid;
begin
  select baby.family_id into selected_family_id
  from public.babies baby
  where baby.id = target_baby_id
    and baby.archived_at is null
    and baby.life_stage = 'expected';

  if actor_id is null
    or selected_family_id is null
    or not private.can_record_baby_care(target_baby_id) then
    raise exception 'baby_contraction_not_allowed' using errcode = '42501';
  end if;

  insert into public.baby_contractions (
    family_id,
    baby_id,
    recorded_by
  ) values (
    selected_family_id,
    target_baby_id,
    actor_id
  )
  returning id into selected_contraction_id;

  return selected_contraction_id;
exception
  when unique_violation then
    raise exception 'baby_contraction_already_active' using errcode = '23505';
end;
$$;

create function public.finish_baby_contraction(target_contraction_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_baby_id uuid;
begin
  select contraction.baby_id into selected_baby_id
  from public.baby_contractions contraction
  where contraction.id = target_contraction_id
    and contraction.ended_at is null
  for update;

  if selected_baby_id is null
    or not private.can_record_baby_care(selected_baby_id) then
    raise exception 'baby_contraction_not_allowed' using errcode = '42501';
  end if;

  update public.baby_contractions
  set ended_at = greatest(now(), started_at), updated_at = now()
  where id = target_contraction_id;
end;
$$;

create function public.delete_baby_contraction(target_contraction_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  selected_baby_id uuid;
  selected_recorded_by uuid;
begin
  select contraction.baby_id, contraction.recorded_by
  into selected_baby_id, selected_recorded_by
  from public.baby_contractions contraction
  where contraction.id = target_contraction_id;

  if actor_id is null
    or selected_baby_id is null
    or (
      selected_recorded_by <> actor_id
      and not private.can_manage_baby(selected_baby_id)
    ) then
    raise exception 'baby_contraction_not_allowed' using errcode = '42501';
  end if;

  delete from public.baby_contractions
  where id = target_contraction_id;
end;
$$;

revoke all on table public.baby_contractions from public, anon, authenticated;
revoke all on function public.start_baby_contraction(uuid) from public, anon;
revoke all on function public.finish_baby_contraction(uuid) from public, anon;
revoke all on function public.delete_baby_contraction(uuid) from public, anon;

grant select on table public.baby_contractions to authenticated;
grant select, insert, update, delete on table public.baby_contractions to service_role;
grant execute on function public.start_baby_contraction(uuid) to authenticated;
grant execute on function public.finish_baby_contraction(uuid) to authenticated;
grant execute on function public.delete_baby_contraction(uuid) to authenticated;

alter publication supabase_realtime add table public.baby_contractions;
