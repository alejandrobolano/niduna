create table public.baby_notes (
  id uuid primary key default gen_random_uuid(),
  baby_id uuid not null references public.babies(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  content text not null check (
    char_length(trim(content)) between 1 and 1000
  ),
  recorded_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index baby_notes_baby_occurred_at_idx
  on public.baby_notes (baby_id, occurred_at desc);

create index baby_notes_recorded_by_idx
  on public.baby_notes (recorded_by);

alter table public.baby_measurements
add column notes text check (char_length(notes) <= 1000);

drop policy baby_measurements_select_members on public.baby_measurements;

create policy baby_measurements_select_members
on public.baby_measurements for select
to authenticated
using (private.can_view_baby(baby_id));

alter table public.baby_notes enable row level security;

create policy baby_notes_select_family
on public.baby_notes for select
to authenticated
using (private.can_view_baby(baby_id));

create policy baby_notes_insert_caregivers
on public.baby_notes for insert
to authenticated
with check (
  private.can_record_baby_care(baby_id)
  and recorded_by = (select auth.uid())
);

create policy baby_notes_update_recorders
on public.baby_notes for update
to authenticated
using (
  recorded_by = (select auth.uid())
  or private.can_manage_baby(baby_id)
)
with check (
  recorded_by = (select auth.uid())
  or private.can_manage_baby(baby_id)
);

create policy baby_notes_delete_recorders
on public.baby_notes for delete
to authenticated
using (
  recorded_by = (select auth.uid())
  or private.can_manage_baby(baby_id)
);

create trigger baby_notes_set_updated_at
before update on public.baby_notes
for each row execute function private.set_updated_at();

grant select, insert (
  baby_id,
  occurred_at,
  content
), update (
  occurred_at,
  content
), delete on public.baby_notes to authenticated;

grant insert (notes), update (notes)
on public.baby_measurements to authenticated;

alter publication supabase_realtime add table public.baby_notes;
alter publication supabase_realtime add table public.baby_measurements;
