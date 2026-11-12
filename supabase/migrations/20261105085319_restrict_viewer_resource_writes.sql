create function private.reject_viewer_family_resource_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  target_family_id uuid;
begin
  target_family_id := case
    when tg_op = 'DELETE' then old.family_id
    else new.family_id
  end;

  if actor_id is not null and exists (
    select 1
    from public.family_members member
    where member.family_id = target_family_id
      and member.user_id = actor_id
      and member.role = 'viewer'
  ) then
    raise exception 'family_resource_read_only' using errcode = '42501';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create trigger baby_documents_reject_viewer_writes
before insert or update or delete on public.baby_documents
for each row execute function private.reject_viewer_family_resource_write();

create trigger baby_contacts_reject_viewer_writes
before insert or update or delete on public.baby_contacts
for each row execute function private.reject_viewer_family_resource_write();

create trigger baby_expenses_reject_viewer_writes
before insert or update or delete on public.baby_expenses
for each row execute function private.reject_viewer_family_resource_write();

create trigger baby_medications_reject_viewer_writes
before insert or update or delete on public.baby_medications
for each row execute function private.reject_viewer_family_resource_write();

create trigger medication_administrations_reject_viewer_writes
before insert or update or delete on public.baby_medication_administrations
for each row execute function private.reject_viewer_family_resource_write();

create or replace function private.can_manage_baby_document(target_document_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.baby_documents document
    where document.id = target_document_id
      and private.has_family_role(
        document.family_id,
        array['owner', 'admin', 'caregiver']::public.family_role[]
      )
      and (
        document.author_user_id = (select auth.uid())
        or private.has_family_role(
          document.family_id,
          array['owner', 'admin']::public.family_role[]
        )
      )
  );
$$;

create or replace function private.can_manage_baby_contact(target_contact_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.baby_contacts contact
    where contact.id = target_contact_id
      and private.has_family_role(
        contact.family_id,
        array['owner', 'admin', 'caregiver']::public.family_role[]
      )
      and (
        contact.author_user_id = (select auth.uid())
        or private.has_family_role(
          contact.family_id,
          array['owner', 'admin']::public.family_role[]
        )
      )
  );
$$;

create or replace function private.can_manage_baby_expense(target_expense_id uuid)
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
      and private.has_family_role(
        expense.family_id,
        array['owner', 'admin', 'caregiver']::public.family_role[]
      )
      and (
        expense.created_by = (select auth.uid())
        or private.has_family_role(
          expense.family_id,
          array['owner', 'admin']::public.family_role[]
        )
      )
  );
$$;

create or replace function private.can_manage_medication_administration(
  target_administration_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.baby_medication_administrations administration
    where administration.id = target_administration_id
      and private.has_family_role(
        administration.family_id,
        array['owner', 'admin', 'caregiver']::public.family_role[]
      )
      and (
        administration.recorded_by = (select auth.uid())
        or private.has_family_role(
          administration.family_id,
          array['owner', 'admin']::public.family_role[]
        )
      )
  );
$$;

revoke all on function private.reject_viewer_family_resource_write() from public;
revoke all on function private.reject_viewer_family_resource_write() from anon, authenticated;
