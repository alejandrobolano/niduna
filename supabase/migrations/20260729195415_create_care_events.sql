create type public.care_event_type as enum ('feeding', 'diaper', 'sleep');
create type public.feeding_method as enum (
  'breast',
  'expressed_milk',
  'formula',
  'mixed'
);
create type public.breast_side as enum ('left', 'right', 'both');
create type public.diaper_condition as enum ('wet', 'dirty', 'both');

create table public.care_events (
  id uuid primary key default gen_random_uuid(),
  baby_id uuid not null references public.babies(id) on delete cascade,
  event_type public.care_event_type not null,
  occurred_at timestamptz not null default now(),
  ended_at timestamptz,
  feeding_method public.feeding_method,
  amount_milliliters integer check (
    amount_milliliters between 1 and 2000
  ),
  breast_side public.breast_side,
  diaper_condition public.diaper_condition,
  notes text check (char_length(notes) <= 1000),
  recorded_by uuid not null default auth.uid() references auth.users(id),
  updated_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint care_events_shape check (
    (
      event_type = 'feeding'
      and feeding_method is not null
      and diaper_condition is null
      and ended_at is null
    )
    or (
      event_type = 'diaper'
      and diaper_condition is not null
      and feeding_method is null
      and amount_milliliters is null
      and breast_side is null
      and ended_at is null
    )
    or (
      event_type = 'sleep'
      and feeding_method is null
      and amount_milliliters is null
      and breast_side is null
      and diaper_condition is null
      and (ended_at is null or ended_at > occurred_at)
    )
  ),
  constraint care_events_breast_details check (
    event_type <> 'feeding'
    or feeding_method in ('breast', 'mixed')
    or breast_side is null
  )
);

create index care_events_baby_occurred_at_idx
  on public.care_events (baby_id, occurred_at desc);

create index care_events_recorded_by_idx
  on public.care_events (recorded_by);

create unique index care_events_one_open_sleep_per_baby_idx
  on public.care_events (baby_id)
  where event_type = 'sleep' and ended_at is null;

create function private.can_view_baby(target_baby_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.babies
    where id = target_baby_id
      and private.is_family_member(family_id)
  );
$$;

create function private.set_care_event_audit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  new.updated_by = (select auth.uid());
  return new;
end;
$$;

revoke all on function private.can_view_baby(uuid) from public;
revoke all on function private.set_care_event_audit() from public;
grant execute on function private.can_view_baby(uuid) to authenticated;

create trigger care_events_set_audit
before update on public.care_events
for each row execute function private.set_care_event_audit();

alter table public.care_events enable row level security;

create policy care_events_select_family
on public.care_events for select
to authenticated
using (private.can_view_baby(baby_id));

create policy care_events_insert_caregivers
on public.care_events for insert
to authenticated
with check (
  private.can_record_baby_care(baby_id)
  and recorded_by = (select auth.uid())
  and updated_by = (select auth.uid())
);

create policy care_events_update_caregivers
on public.care_events for update
to authenticated
using (private.can_record_baby_care(baby_id))
with check (
  private.can_record_baby_care(baby_id)
);

grant select on public.care_events to authenticated;
grant insert (
  baby_id,
  event_type,
  occurred_at,
  ended_at,
  feeding_method,
  amount_milliliters,
  breast_side,
  diaper_condition,
  notes
) on public.care_events to authenticated;
grant update (ended_at) on public.care_events to authenticated;

alter publication supabase_realtime add table public.care_events;
