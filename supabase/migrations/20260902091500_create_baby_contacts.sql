create type public.baby_contact_category as enum (
  'health',
  'nutrition',
  'education',
  'activity',
  'emergency',
  'other'
);

create table public.baby_contacts (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  baby_id uuid not null references public.babies (id) on delete cascade,
  author_user_id uuid references auth.users (id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  category public.baby_contact_category not null,
  contact_person text check (contact_person is null or char_length(contact_person) <= 120),
  phone text check (phone is null or char_length(phone) <= 40),
  address text check (address is null or char_length(address) <= 300),
  website_url text check (website_url is null or char_length(website_url) <= 500),
  notes text check (notes is null or char_length(notes) <= 500),
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  retired_at timestamptz,
  retired_by uuid references auth.users (id) on delete set null,
  constraint baby_contacts_useful_data check (
    phone is not null or address is not null or website_url is not null or notes is not null
  ),
  constraint baby_contacts_retirement_state check (
    (retired_at is null and retired_by is null)
    or (retired_at is not null and retired_by is not null)
  )
);

create index baby_contacts_active_baby_category_name_idx
  on public.baby_contacts (baby_id, category, is_featured desc, name)
  where retired_at is null;
create index baby_contacts_family_idx on public.baby_contacts (family_id);
create index baby_contacts_author_idx on public.baby_contacts (author_user_id);
create index baby_contacts_retired_by_idx on public.baby_contacts (retired_by);
create index baby_contacts_retired_idx on public.baby_contacts (retired_at)
  where retired_at is not null;

create function private.can_manage_baby_contact(target_contact_id uuid)
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
      and private.is_family_member(contact.family_id)
      and (
        contact.author_user_id = (select auth.uid())
        or private.has_family_role(
          contact.family_id,
          array['owner', 'admin']::public.family_role[]
        )
      )
  );
$$;

create function private.validate_baby_contact(
  target_name text,
  target_contact_person text,
  target_phone text,
  target_address text,
  target_website_url text,
  target_notes text
)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(char_length(trim(target_name)), 0) not between 1 and 120
    or (target_contact_person is not null and char_length(trim(target_contact_person)) > 120)
    or (target_phone is not null and char_length(trim(target_phone)) > 40)
    or (target_address is not null and char_length(trim(target_address)) > 300)
    or (target_website_url is not null and char_length(trim(target_website_url)) > 500)
    or (target_notes is not null and char_length(trim(target_notes)) > 500)
    or nullif(trim(target_phone), '') is null
      and nullif(trim(target_address), '') is null
      and nullif(trim(target_website_url), '') is null
      and nullif(trim(target_notes), '') is null then
    raise exception 'baby_contact_invalid' using errcode = '22023';
  end if;
end;
$$;

create function public.save_baby_contact(
  target_contact_id uuid,
  target_baby_id uuid,
  target_name text,
  target_category public.baby_contact_category,
  target_contact_person text,
  target_phone text,
  target_address text,
  target_website_url text,
  target_notes text,
  target_is_featured boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  selected_contact_id uuid := coalesce(target_contact_id, gen_random_uuid());
  selected_family_id uuid;
begin
  perform private.validate_baby_contact(
    target_name, target_contact_person, target_phone,
    target_address, target_website_url, target_notes
  );

  select baby.family_id into selected_family_id
  from public.babies baby
  where baby.id = target_baby_id and baby.archived_at is null;

  if actor_id is null or selected_family_id is null
    or not private.is_family_member(selected_family_id) then
    raise exception 'baby_contact_not_allowed' using errcode = '42501';
  end if;

  if target_contact_id is null then
    insert into public.baby_contacts (
      id, family_id, baby_id, author_user_id, name, category,
      contact_person, phone, address, website_url, notes, is_featured
    ) values (
      selected_contact_id, selected_family_id, target_baby_id, actor_id,
      trim(target_name), target_category,
      nullif(trim(target_contact_person), ''), nullif(trim(target_phone), ''),
      nullif(trim(target_address), ''), nullif(trim(target_website_url), ''),
      nullif(trim(target_notes), ''), target_is_featured
    );
  else
    if not private.can_manage_baby_contact(target_contact_id) then
      raise exception 'baby_contact_not_allowed' using errcode = '42501';
    end if;

    update public.baby_contacts
    set
      name = trim(target_name),
      category = target_category,
      contact_person = nullif(trim(target_contact_person), ''),
      phone = nullif(trim(target_phone), ''),
      address = nullif(trim(target_address), ''),
      website_url = nullif(trim(target_website_url), ''),
      notes = nullif(trim(target_notes), ''),
      is_featured = target_is_featured,
      updated_at = now()
    where id = target_contact_id
      and baby_id = target_baby_id
      and retired_at is null;

    if not found then
      raise exception 'baby_contact_not_found' using errcode = 'P0002';
    end if;
  end if;

  return selected_contact_id;
end;
$$;

create function public.set_baby_contact_retired(
  target_contact_id uuid,
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
  if not private.can_manage_baby_contact(target_contact_id) then
    raise exception 'baby_contact_not_allowed' using errcode = '42501';
  end if;

  select retired_at into selected_retired_at
  from public.baby_contacts
  where id = target_contact_id
  for update;

  if not should_retire
    and selected_retired_at <= now() - interval '30 days' then
    raise exception 'baby_contact_recovery_expired' using errcode = 'P0001';
  end if;

  update public.baby_contacts
  set
    retired_at = case when should_retire then coalesce(retired_at, now()) else null end,
    retired_by = case when should_retire then coalesce(retired_by, (select auth.uid())) else null end,
    updated_at = now()
  where id = target_contact_id;
end;
$$;

alter table public.baby_contacts enable row level security;

create policy baby_contacts_select_members
on public.baby_contacts for select
to authenticated
using (
  private.is_family_member(family_id)
  and (
    retired_at is null
    or private.can_manage_baby_contact(id)
  )
);

alter table public.family_audit_logs
  drop constraint if exists family_audit_logs_entity_type_check;

alter table public.family_audit_logs
  add constraint family_audit_logs_entity_type_check check (
    entity_type in (
      'baby', 'baby_contact', 'baby_document', 'baby_note',
      'care_event', 'family_member', 'measurement'
    )
  );

create function private.write_baby_contact_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_action text;
  selected_change text;
  selected_data public.baby_contacts%rowtype;
begin
  selected_data := case when tg_op = 'DELETE' then old else new end;

  if tg_op = 'INSERT' then
    selected_action := 'created';
    selected_change := 'created';
  elsif tg_op = 'DELETE' then
    selected_action := 'deleted';
    selected_change := 'deleted';
  elsif old.retired_at is null and new.retired_at is not null then
    selected_action := 'updated';
    selected_change := 'retired';
  elsif old.retired_at is not null and new.retired_at is null then
    selected_action := 'updated';
    selected_change := 'restored';
  elsif row(old.name, old.category, old.contact_person, old.phone, old.address,
    old.website_url, old.notes, old.is_featured)
    is distinct from
    row(new.name, new.category, new.contact_person, new.phone, new.address,
    new.website_url, new.notes, new.is_featured) then
    selected_action := 'updated';
    selected_change := 'updated';
  else
    return new;
  end if;

  insert into public.family_audit_logs (
    family_id, actor_user_id, action, entity_type, entity_id, baby_id, details
  ) values (
    selected_data.family_id,
    coalesce((select auth.uid()), selected_data.author_user_id, selected_data.retired_by),
    selected_action,
    'baby_contact',
    selected_data.id,
    selected_data.baby_id,
    jsonb_build_object(
      'category', selected_data.category,
      'change_kind', selected_change,
      'is_featured', selected_data.is_featured
    )
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger baby_contacts_write_family_audit_log
after insert or update or delete on public.baby_contacts
for each row
when (pg_catalog.current_setting('app.suppress_family_audit', true) is distinct from 'on')
execute function private.write_baby_contact_audit_log();

create function private.purge_retired_baby_contacts(target_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('niduna:baby-contact-retention', 0)
  );

  delete from public.baby_contacts
  where retired_at is not null
    and retired_at < target_now - interval '30 days';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

select cron.schedule(
  'purge-retired-baby-contacts',
  '19 3 * * *',
  $cron$select private.purge_retired_baby_contacts();$cron$
);

revoke all on table public.baby_contacts from public, anon;
revoke all on function private.can_manage_baby_contact(uuid) from public;
revoke all on function private.validate_baby_contact(text, text, text, text, text, text) from public;
revoke all on function private.write_baby_contact_audit_log() from public;
revoke all on function private.purge_retired_baby_contacts(timestamptz) from public, anon, authenticated;
revoke all on function public.save_baby_contact(uuid, uuid, text, public.baby_contact_category, text, text, text, text, text, boolean) from public, anon;
revoke all on function public.set_baby_contact_retired(uuid, boolean) from public, anon;

grant select on table public.baby_contacts to authenticated;
grant select, insert, update, delete on table public.baby_contacts to service_role;
grant execute on function private.can_manage_baby_contact(uuid) to authenticated;
grant execute on function public.save_baby_contact(uuid, uuid, text, public.baby_contact_category, text, text, text, text, text, boolean) to authenticated;
grant execute on function public.set_baby_contact_retired(uuid, boolean) to authenticated;
