create index baby_expenses_retired_idx
on public.baby_expenses (retired_at)
where retired_at is not null;

create or replace function public.set_baby_expense_retired(
  target_expense_id uuid,
  should_retire boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_retired_at timestamptz;
begin
  if not private.can_manage_baby_expense(target_expense_id) then
    raise exception 'baby_expense_not_allowed' using errcode = '42501';
  end if;

  select retired_at into selected_retired_at
  from public.baby_expenses
  where id = target_expense_id
  for update;

  if not should_retire
    and selected_retired_at <= now() - interval '30 days' then
    raise exception 'baby_expense_recovery_expired' using errcode = 'P0001';
  end if;

  update public.baby_expenses
  set retired_at = case when should_retire then coalesce(retired_at, now()) else null end,
      retired_by = case when should_retire then coalesce(retired_by, (select auth.uid())) else null end,
      updated_by = (select auth.uid()),
      updated_at = now()
  where id = target_expense_id;
end;
$$;

create function private.purge_retired_baby_expenses(target_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('niduna:baby-expense-retention', 0)
  );

  delete from public.baby_expenses
  where retired_at is not null
    and retired_at < target_now - interval '30 days';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

select cron.schedule(
  'purge-retired-baby-expenses',
  '23 3 * * *',
  $cron$select private.purge_retired_baby_expenses();$cron$
);

revoke all on function private.purge_retired_baby_expenses(timestamptz)
from public, anon, authenticated;

revoke all on function public.set_baby_expense_retired(uuid, boolean)
from public, anon;

grant execute on function public.set_baby_expense_retired(uuid, boolean)
to authenticated;
