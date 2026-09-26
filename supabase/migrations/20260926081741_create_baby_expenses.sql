create type public.baby_expense_category as enum (
  'feeding',
  'diapers',
  'health',
  'clothing',
  'hygiene',
  'equipment',
  'childcare',
  'other'
);

alter table public.families
  add column expense_currency text not null default 'EUR'
  check (expense_currency ~ '^[A-Z]{3}$');

create table public.baby_expenses (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  baby_id uuid not null references public.babies (id) on delete cascade,
  concept text not null check (char_length(trim(concept)) between 1 and 120),
  amount_minor bigint not null check (amount_minor > 0 and amount_minor <= 999999999),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  category public.baby_expense_category not null,
  paid_by_user_id uuid not null references auth.users (id) on delete restrict,
  expense_date date not null,
  notes text check (notes is null or char_length(notes) <= 500),
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_by uuid not null references auth.users (id) on delete restrict,
  updated_at timestamptz not null default now(),
  retired_by uuid references auth.users (id) on delete set null,
  retired_at timestamptz,
  constraint baby_expenses_retirement_state check (
    (retired_at is null and retired_by is null)
    or (retired_at is not null and retired_by is not null)
  )
);

create index baby_expenses_active_baby_date_idx
  on public.baby_expenses (baby_id, expense_date desc, created_at desc)
  where retired_at is null;
create index baby_expenses_family_date_idx
  on public.baby_expenses (family_id, expense_date desc);
create index baby_expenses_paid_by_idx on public.baby_expenses (paid_by_user_id);
create index baby_expenses_created_by_idx on public.baby_expenses (created_by);
create index baby_expenses_updated_by_idx on public.baby_expenses (updated_by);
create index baby_expenses_retired_by_idx on public.baby_expenses (retired_by);

create function private.can_write_baby_expense(target_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_family_role(
    target_family_id,
    array['owner', 'admin', 'caregiver']::public.family_role[]
  );
$$;

create function private.can_manage_baby_expense(target_expense_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.baby_expenses expense
    where expense.id = target_expense_id
      and private.is_family_member(expense.family_id)
      and (
        expense.created_by = (select auth.uid())
        or private.has_family_role(
          expense.family_id,
          array['owner', 'admin']::public.family_role[]
        )
      )
  );
$$;

create function public.set_family_expense_currency(
  target_family_id uuid,
  target_currency text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_currency text := upper(trim(target_currency));
  selected_family_id uuid;
begin
  if normalized_currency !~ '^[A-Z]{3}$'
    or not private.has_family_role(
      target_family_id,
      array['owner', 'admin']::public.family_role[]
    ) then
    raise exception 'expense_currency_not_allowed' using errcode = '42501';
  end if;

  select family.id into selected_family_id
  from public.families family
  where family.id = target_family_id
  for update;

  if selected_family_id is null then
    raise exception 'expense_family_not_found' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.baby_expenses where family_id = target_family_id
  ) then
    raise exception 'expense_currency_locked' using errcode = 'P0001';
  end if;

  update public.families
  set expense_currency = normalized_currency, updated_at = now()
  where id = target_family_id;
end;
$$;

create function public.save_baby_expense(
  target_expense_id uuid,
  target_baby_id uuid,
  target_concept text,
  target_amount_minor bigint,
  target_category public.baby_expense_category,
  target_paid_by_user_id uuid,
  target_expense_date date,
  target_timezone_offset_minutes integer,
  target_notes text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  selected_expense_id uuid := coalesce(target_expense_id, gen_random_uuid());
  selected_family_id uuid;
  selected_currency text;
begin
  select baby.family_id, family.expense_currency
  into selected_family_id, selected_currency
  from public.babies baby
  join public.families family on family.id = baby.family_id
  where baby.id = target_baby_id and baby.archived_at is null
  for update of family;

  if actor_id is null
    or selected_family_id is null
    or not private.can_write_baby_expense(selected_family_id)
    or coalesce(char_length(trim(target_concept)), 0) not between 1 and 120
    or target_amount_minor is null or target_amount_minor <= 0
    or target_amount_minor > 999999999
    or target_timezone_offset_minutes is null
    or target_timezone_offset_minutes not between -840 and 840
    or target_expense_date is null
    or target_expense_date > (
      now() - pg_catalog.make_interval(mins => target_timezone_offset_minutes)
    )::date
    or target_notes is not null and char_length(target_notes) > 500
    or not exists (
      select 1 from public.family_members member
      where member.family_id = selected_family_id
        and member.user_id = target_paid_by_user_id
    ) then
    raise exception 'baby_expense_invalid' using errcode = '22023';
  end if;

  if target_expense_id is null then
    insert into public.baby_expenses (
      id, family_id, baby_id, concept, amount_minor, currency, category,
      paid_by_user_id, expense_date, notes, created_by, updated_by
    ) values (
      selected_expense_id, selected_family_id, target_baby_id, trim(target_concept),
      target_amount_minor, selected_currency, target_category, target_paid_by_user_id,
      target_expense_date, nullif(trim(target_notes), ''), actor_id, actor_id
    );
  else
    if not private.can_manage_baby_expense(target_expense_id) then
      raise exception 'baby_expense_not_allowed' using errcode = '42501';
    end if;

    update public.baby_expenses
    set concept = trim(target_concept),
        amount_minor = target_amount_minor,
        category = target_category,
        paid_by_user_id = target_paid_by_user_id,
        expense_date = target_expense_date,
        notes = nullif(trim(target_notes), ''),
        updated_by = actor_id,
        updated_at = now()
    where id = target_expense_id
      and baby_id = target_baby_id
      and retired_at is null;

    if not found then
      raise exception 'baby_expense_not_found' using errcode = 'P0002';
    end if;
  end if;

  return selected_expense_id;
end;
$$;

create function public.set_baby_expense_retired(
  target_expense_id uuid,
  should_retire boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.can_manage_baby_expense(target_expense_id) then
    raise exception 'baby_expense_not_allowed' using errcode = '42501';
  end if;

  update public.baby_expenses
  set retired_at = case when should_retire then coalesce(retired_at, now()) else null end,
      retired_by = case when should_retire then coalesce(retired_by, (select auth.uid())) else null end,
      updated_by = (select auth.uid()),
      updated_at = now()
  where id = target_expense_id;
end;
$$;

create function public.get_baby_expense_total(
  target_baby_id uuid,
  target_start_date date,
  target_end_date date,
  target_category public.baby_expense_category default null,
  target_paid_by_user_id uuid default null,
  target_retired boolean default false
)
returns bigint
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(sum(expense.amount_minor), 0)::bigint
  from public.baby_expenses expense
  where expense.baby_id = target_baby_id
    and expense.expense_date between target_start_date and target_end_date
    and (target_category is null or expense.category = target_category)
    and (target_paid_by_user_id is null or expense.paid_by_user_id = target_paid_by_user_id)
    and (
      (target_retired and expense.retired_at is not null)
      or (not target_retired and expense.retired_at is null)
    );
$$;

alter table public.baby_expenses enable row level security;

create policy baby_expenses_select_members
on public.baby_expenses for select
to authenticated
using (
  private.is_family_member(family_id)
  and (retired_at is null or private.can_manage_baby_expense(id))
);

alter table public.family_audit_logs
  drop constraint if exists family_audit_logs_entity_type_check;

alter table public.family_audit_logs
  add constraint family_audit_logs_entity_type_check check (
    entity_type in (
      'baby', 'baby_contact', 'baby_document', 'baby_expense', 'baby_note',
      'care_event', 'family_member', 'measurement'
    )
  );

create function private.write_baby_expense_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_data public.baby_expenses%rowtype;
  selected_change text;
begin
  selected_data := case when tg_op = 'DELETE' then old else new end;
  selected_change := case
    when tg_op = 'INSERT' then 'created'
    when tg_op = 'DELETE' then 'deleted'
    when old.retired_at is null and new.retired_at is not null then 'retired'
    when old.retired_at is not null and new.retired_at is null then 'restored'
    else 'updated'
  end;

  if tg_op = 'UPDATE' and row(
    old.concept, old.amount_minor, old.category, old.paid_by_user_id,
    old.expense_date, old.notes, old.retired_at
  ) is not distinct from row(
    new.concept, new.amount_minor, new.category, new.paid_by_user_id,
    new.expense_date, new.notes, new.retired_at
  ) then
    return new;
  end if;

  insert into public.family_audit_logs (
    family_id, actor_user_id, action, entity_type, entity_id, baby_id, details
  ) values (
    selected_data.family_id,
    coalesce((select auth.uid()), selected_data.updated_by),
    case when selected_change in ('created', 'deleted') then selected_change else 'updated' end,
    'baby_expense', selected_data.id, selected_data.baby_id,
    jsonb_build_object(
      'category', selected_data.category,
      'change_kind', selected_change,
      'currency', selected_data.currency
    )
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger baby_expenses_write_family_audit_log
after insert or update or delete on public.baby_expenses
for each row
when (pg_catalog.current_setting('app.suppress_family_audit', true) is distinct from 'on')
execute function private.write_baby_expense_audit_log();

revoke all on table public.baby_expenses from public, anon;
revoke all on function private.can_write_baby_expense(uuid) from public;
revoke all on function private.can_manage_baby_expense(uuid) from public;
revoke all on function private.write_baby_expense_audit_log() from public;
revoke all on function public.set_family_expense_currency(uuid, text) from public, anon;
revoke all on function public.save_baby_expense(uuid, uuid, text, bigint, public.baby_expense_category, uuid, date, integer, text) from public, anon;
revoke all on function public.set_baby_expense_retired(uuid, boolean) from public, anon;
revoke all on function public.get_baby_expense_total(uuid, date, date, public.baby_expense_category, uuid, boolean) from public, anon;

grant select on table public.baby_expenses to authenticated;
grant select, insert, update, delete on table public.baby_expenses to service_role;
grant execute on function private.can_write_baby_expense(uuid) to authenticated;
grant execute on function private.can_manage_baby_expense(uuid) to authenticated;
grant execute on function public.set_family_expense_currency(uuid, text) to authenticated;
grant execute on function public.save_baby_expense(uuid, uuid, text, bigint, public.baby_expense_category, uuid, date, integer, text) to authenticated;
grant execute on function public.set_baby_expense_retired(uuid, boolean) to authenticated;
grant execute on function public.get_baby_expense_total(uuid, date, date, public.baby_expense_category, uuid, boolean) to authenticated;
