create type public.baby_document_category as enum (
  'report',
  'authorization',
  'card',
  'other'
);

create table public.baby_documents (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  baby_id uuid not null references public.babies (id) on delete cascade,
  author_user_id uuid references auth.users (id) on delete set null,
  display_name text not null check (char_length(display_name) between 1 and 160),
  description text check (description is null or char_length(description) <= 500),
  category public.baby_document_category not null,
  document_date date,
  original_file_name text not null check (char_length(original_file_name) between 1 and 180),
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png')),
  file_size_bytes integer not null check (file_size_bytes between 1 and 10485760),
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  retired_at timestamptz,
  retired_by uuid references auth.users (id) on delete set null,
  constraint baby_documents_publish_state check (
    (status = 'draft' and published_at is null)
    or (status = 'published' and published_at is not null)
  ),
  constraint baby_documents_retirement_state check (
    (retired_at is null and retired_by is null)
    or (retired_at is not null and retired_by is not null)
  )
);

create table public.baby_document_replacements (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.baby_documents (id) on delete cascade,
  actor_user_id uuid not null references auth.users (id) on delete cascade,
  original_file_name text not null check (char_length(original_file_name) between 1 and 180),
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png')),
  file_size_bytes integer not null check (file_size_bytes between 1 and 10485760),
  created_at timestamptz not null default now(),
  published_at timestamptz
);

create table public.baby_document_storage_cleanup (
  id bigint generated always as identity primary key,
  storage_path text not null unique,
  status text not null default 'pending' check (status in ('pending', 'processing', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  claimed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

create index baby_documents_baby_created_idx
  on public.baby_documents (baby_id, created_at desc)
  where status = 'published' and retired_at is null;

create index baby_documents_family_idx on public.baby_documents (family_id);
create index baby_documents_author_idx on public.baby_documents (author_user_id);
create index baby_document_replacements_document_idx
  on public.baby_document_replacements (document_id, created_at desc);
create index baby_document_cleanup_claim_idx
  on public.baby_document_storage_cleanup (status, created_at)
  where status in ('pending', 'failed', 'processing');

create function private.validate_baby_document_file(
  target_original_file_name text,
  target_mime_type text,
  target_file_size_bytes integer
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  normalized_name text := trim(target_original_file_name);
  selected_extension text;
begin
  if char_length(normalized_name) < 1 or char_length(normalized_name) > 180 then
    raise exception 'baby_document_invalid_name' using errcode = '22023';
  end if;

  if target_mime_type not in ('application/pdf', 'image/jpeg', 'image/png') then
    raise exception 'baby_document_invalid_mime' using errcode = '22023';
  end if;

  if target_file_size_bytes < 1 or target_file_size_bytes > 10485760 then
    raise exception 'baby_document_invalid_size' using errcode = '22023';
  end if;

  selected_extension := lower(split_part(normalized_name, '.', -1));
  if not (
    (target_mime_type = 'application/pdf' and selected_extension = 'pdf')
    or (target_mime_type = 'image/jpeg' and selected_extension in ('jpg', 'jpeg'))
    or (target_mime_type = 'image/png' and selected_extension = 'png')
  ) then
    raise exception 'baby_document_invalid_extension' using errcode = '22023';
  end if;

  return case target_mime_type
    when 'application/pdf' then 'pdf'
    when 'image/png' then 'png'
    else 'jpg'
  end;
end;
$$;

create function private.can_manage_baby_document(target_document_id uuid)
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
      and private.is_family_member(document.family_id)
      and (
        document.author_user_id = (select auth.uid())
        or private.has_family_role(
          document.family_id,
          array['owner', 'admin']::public.family_role[]
        )
      )
  );
$$;

create function private.can_view_baby_document(target_document_id uuid)
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
      and document.status = 'published'
      and private.is_family_member(document.family_id)
      and (
        document.retired_at is null
        or private.can_manage_baby_document(document.id)
      )
  );
$$;

create function private.can_access_baby_document_object(target_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.baby_documents document
    where document.storage_path = target_path
      and private.can_view_baby_document(document.id)
  );
$$;

create function private.can_upload_baby_document_object(target_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.baby_documents document
    where document.storage_path = target_path
      and document.status = 'draft'
      and document.author_user_id = (select auth.uid())
      and private.is_family_member(document.family_id)
  ) or exists (
    select 1
    from public.baby_document_replacements replacement
    where replacement.storage_path = target_path
      and replacement.actor_user_id = (select auth.uid())
      and replacement.published_at is null
      and private.can_manage_baby_document(replacement.document_id)
  );
$$;

create function public.prepare_baby_document(
  target_baby_id uuid,
  target_display_name text,
  target_description text,
  target_category public.baby_document_category,
  target_document_date date,
  target_original_file_name text,
  target_mime_type text,
  target_file_size_bytes integer
)
returns table (id uuid, storage_path text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  selected_document_id uuid := gen_random_uuid();
  selected_extension text;
  selected_family_id uuid;
  selected_path text;
begin
  select baby.family_id
  into selected_family_id
  from public.babies baby
  where baby.id = target_baby_id and baby.archived_at is null;

  if actor_id is null
    or selected_family_id is null
    or not private.is_family_member(selected_family_id) then
    raise exception 'baby_document_not_allowed' using errcode = '42501';
  end if;

  if char_length(trim(target_display_name)) < 1
    or char_length(trim(target_display_name)) > 160
    or (target_description is not null and char_length(trim(target_description)) > 500) then
    raise exception 'baby_document_invalid_metadata' using errcode = '22023';
  end if;

  selected_extension := private.validate_baby_document_file(
    target_original_file_name,
    target_mime_type,
    target_file_size_bytes
  );
  selected_path := concat(
    selected_family_id, '/', target_baby_id, '/', selected_document_id, '.', selected_extension
  );

  insert into public.baby_documents (
    id, family_id, baby_id, author_user_id, display_name, description,
    category, document_date, original_file_name, storage_path, mime_type,
    file_size_bytes
  ) values (
    selected_document_id, selected_family_id, target_baby_id, actor_id,
    trim(target_display_name), nullif(trim(target_description), ''), target_category,
    target_document_date, trim(target_original_file_name), selected_path,
    target_mime_type, target_file_size_bytes
  );

  return query select selected_document_id, selected_path;
end;
$$;

create function public.publish_baby_document(target_document_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_document public.baby_documents%rowtype;
begin
  select * into selected_document
  from public.baby_documents
  where id = target_document_id
    and author_user_id = (select auth.uid())
    and status = 'draft';

  if selected_document.id is null then
    raise exception 'baby_document_not_found' using errcode = 'P0002';
  end if;

  if not exists (
    select 1
    from storage.objects object
    where object.bucket_id = 'baby-documents'
      and object.name = selected_document.storage_path
      and object.metadata ->> 'mimetype' = selected_document.mime_type
      and (object.metadata ->> 'size')::integer = selected_document.file_size_bytes
  ) then
    raise exception 'baby_document_object_invalid' using errcode = '22023';
  end if;

  update public.baby_documents
  set status = 'published', published_at = now(), updated_at = now()
  where id = selected_document.id;
end;
$$;

create function public.update_baby_document_metadata(
  target_document_id uuid,
  target_display_name text,
  target_description text,
  target_category public.baby_document_category,
  target_document_date date
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.can_manage_baby_document(target_document_id) then
    raise exception 'baby_document_not_allowed' using errcode = '42501';
  end if;

  if char_length(trim(target_display_name)) < 1
    or char_length(trim(target_display_name)) > 160
    or (target_description is not null and char_length(trim(target_description)) > 500) then
    raise exception 'baby_document_invalid_metadata' using errcode = '22023';
  end if;

  update public.baby_documents
  set
    display_name = trim(target_display_name),
    description = nullif(trim(target_description), ''),
    category = target_category,
    document_date = target_document_date,
    updated_at = now()
  where id = target_document_id and status = 'published';
end;
$$;

create function public.prepare_baby_document_replacement(
  target_document_id uuid,
  target_original_file_name text,
  target_mime_type text,
  target_file_size_bytes integer
)
returns table (id uuid, storage_path text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  selected_document public.baby_documents%rowtype;
  selected_extension text;
  selected_replacement_id uuid := gen_random_uuid();
  selected_path text;
begin
  if actor_id is null or not private.can_manage_baby_document(target_document_id) then
    raise exception 'baby_document_not_allowed' using errcode = '42501';
  end if;

  select * into selected_document
  from public.baby_documents
  where id = target_document_id and status = 'published';

  if selected_document.id is null then
    raise exception 'baby_document_not_found' using errcode = 'P0002';
  end if;

  selected_extension := private.validate_baby_document_file(
    target_original_file_name,
    target_mime_type,
    target_file_size_bytes
  );
  selected_path := concat(
    selected_document.family_id, '/', selected_document.baby_id, '/',
    target_document_id, '/replacements/', selected_replacement_id, '.', selected_extension
  );

  insert into public.baby_document_replacements (
    id, document_id, actor_user_id, original_file_name, storage_path,
    mime_type, file_size_bytes
  ) values (
    selected_replacement_id, target_document_id, actor_id,
    trim(target_original_file_name), selected_path, target_mime_type,
    target_file_size_bytes
  );

  return query select selected_replacement_id, selected_path;
end;
$$;

create function public.publish_baby_document_replacement(target_replacement_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_document public.baby_documents%rowtype;
  selected_replacement public.baby_document_replacements%rowtype;
begin
  select * into selected_replacement
  from public.baby_document_replacements
  where id = target_replacement_id
    and actor_user_id = (select auth.uid())
    and published_at is null;

  if selected_replacement.id is null
    or not private.can_manage_baby_document(selected_replacement.document_id) then
    raise exception 'baby_document_not_allowed' using errcode = '42501';
  end if;

  select * into selected_document
  from public.baby_documents
  where id = selected_replacement.document_id and status = 'published';

  if selected_document.id is null then
    raise exception 'baby_document_not_found' using errcode = 'P0002';
  end if;

  if not exists (
    select 1
    from storage.objects object
    where object.bucket_id = 'baby-documents'
      and object.name = selected_replacement.storage_path
      and object.metadata ->> 'mimetype' = selected_replacement.mime_type
      and (object.metadata ->> 'size')::integer = selected_replacement.file_size_bytes
  ) then
    raise exception 'baby_document_object_invalid' using errcode = '22023';
  end if;

  insert into public.baby_document_storage_cleanup (storage_path)
  values (selected_document.storage_path)
  on conflict (storage_path) do nothing;

  update public.baby_documents
  set
    original_file_name = selected_replacement.original_file_name,
    storage_path = selected_replacement.storage_path,
    mime_type = selected_replacement.mime_type,
    file_size_bytes = selected_replacement.file_size_bytes,
    updated_at = now()
  where id = selected_document.id;

  delete from public.baby_document_replacements
  where id = selected_replacement.id;
end;
$$;

create function public.set_baby_document_retired(
  target_document_id uuid,
  should_retire boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.can_manage_baby_document(target_document_id) then
    raise exception 'baby_document_not_allowed' using errcode = '42501';
  end if;

  update public.baby_documents
  set
    retired_at = case when should_retire then coalesce(retired_at, now()) else null end,
    retired_by = case when should_retire then coalesce(retired_by, (select auth.uid())) else null end,
    updated_at = now()
  where id = target_document_id and status = 'published';
end;
$$;

create function private.enqueue_baby_document_storage_cleanup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.baby_document_storage_cleanup (storage_path)
  values (old.storage_path)
  on conflict (storage_path) do nothing;
  return old;
end;
$$;

create trigger baby_documents_enqueue_storage_cleanup
before delete on public.baby_documents
for each row execute function private.enqueue_baby_document_storage_cleanup();

create function public.claim_baby_document_storage_cleanup(batch_size integer default 100)
returns table (id bigint, storage_path text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.baby_document_storage_cleanup (storage_path)
  select replacement.storage_path
  from public.baby_document_replacements replacement
  where replacement.published_at is null
    and replacement.created_at <= now() - interval '1 hour'
  on conflict (storage_path) do nothing;

  delete from public.baby_document_replacements replacement
  where replacement.published_at is null
    and replacement.created_at <= now() - interval '1 hour';

  delete from public.baby_documents document
  where document.status = 'draft'
    and document.created_at <= now() - interval '1 hour';

  return query
  with candidates as (
    select cleanup.id
    from public.baby_document_storage_cleanup cleanup
    where cleanup.status in ('pending', 'failed')
      or (
        cleanup.status = 'processing'
        and cleanup.claimed_at <= now() - interval '15 minutes'
      )
    order by cleanup.created_at
    for update skip locked
    limit greatest(1, least(batch_size, 500))
  ), claimed as (
    update public.baby_document_storage_cleanup cleanup
    set
      status = 'processing',
      claimed_at = now(),
      attempts = cleanup.attempts + 1,
      last_error = null
    from candidates
    where cleanup.id = candidates.id
    returning cleanup.id, cleanup.storage_path
  )
  select claimed.id, claimed.storage_path from claimed;
end;
$$;

alter table public.baby_documents enable row level security;
alter table public.baby_document_replacements enable row level security;
alter table public.baby_document_storage_cleanup enable row level security;

create policy baby_documents_select_members
on public.baby_documents for select
to authenticated
using (private.can_view_baby_document(id));

create policy baby_document_replacements_block_clients
on public.baby_document_replacements for all
to authenticated
using (false)
with check (false);

create policy baby_document_cleanup_block_clients
on public.baby_document_storage_cleanup for all
to authenticated
using (false)
with check (false);

insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
values (
  'baby-documents', 'baby-documents', false, 10485760,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy baby_documents_objects_select_members
on storage.objects for select
to authenticated
using (
  bucket_id = 'baby-documents'
  and private.can_access_baby_document_object(name)
);

create policy baby_documents_objects_insert_authors
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'baby-documents'
  and private.can_upload_baby_document_object(name)
);

alter table public.family_audit_logs
  drop constraint if exists family_audit_logs_entity_type_check;

alter table public.family_audit_logs
  add constraint family_audit_logs_entity_type_check check (
    entity_type in (
      'baby', 'baby_document', 'baby_note', 'care_event', 'family_member', 'measurement'
    )
  );

create function private.write_baby_document_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_action text;
  selected_actor uuid := (select auth.uid());
  selected_change text;
  selected_data public.baby_documents%rowtype;
begin
  if tg_op = 'DELETE' then
    selected_data := old;
  else
    selected_data := new;
  end if;

  if tg_op = 'INSERT' or (tg_op = 'UPDATE' and old.status = 'draft' and new.status = 'published') then
    if tg_op = 'INSERT' then
      return new;
    end if;
    selected_action := 'created';
    selected_change := 'published';
  elsif tg_op = 'DELETE' then
    selected_action := 'deleted';
    selected_change := 'deleted';
  elsif old.retired_at is null and new.retired_at is not null then
    selected_action := 'updated';
    selected_change := 'retired';
  elsif old.retired_at is not null and new.retired_at is null then
    selected_action := 'updated';
    selected_change := 'restored';
  elsif old.storage_path is distinct from new.storage_path then
    selected_action := 'updated';
    selected_change := 'replaced';
  elsif row(old.display_name, old.description, old.category, old.document_date)
    is distinct from row(new.display_name, new.description, new.category, new.document_date) then
    selected_action := 'updated';
    selected_change := 'metadata_updated';
  else
    return new;
  end if;

  insert into public.family_audit_logs (
    family_id, actor_user_id, action, entity_type, entity_id, baby_id, details
  ) values (
    selected_data.family_id,
    coalesce(selected_actor, selected_data.author_user_id, selected_data.retired_by),
    selected_action,
    'baby_document',
    selected_data.id,
    selected_data.baby_id,
    jsonb_build_object('category', selected_data.category, 'change_kind', selected_change)
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger baby_documents_write_family_audit_log
after insert or update or delete on public.baby_documents
for each row
when (pg_catalog.current_setting('app.suppress_family_audit', true) is distinct from 'on')
execute function private.write_baby_document_audit_log();

revoke all on table public.baby_documents from public, anon;
revoke all on table public.baby_document_replacements from public, anon, authenticated;
revoke all on table public.baby_document_storage_cleanup from public, anon, authenticated;
revoke all on function private.validate_baby_document_file(text, text, integer) from public;
revoke all on function private.can_manage_baby_document(uuid) from public;
revoke all on function private.can_view_baby_document(uuid) from public;
revoke all on function private.can_access_baby_document_object(text) from public;
revoke all on function private.can_upload_baby_document_object(text) from public;
revoke all on function private.enqueue_baby_document_storage_cleanup() from public;
revoke all on function private.write_baby_document_audit_log() from public;
revoke all on function public.prepare_baby_document(uuid, text, text, public.baby_document_category, date, text, text, integer) from public, anon;
revoke all on function public.publish_baby_document(uuid) from public, anon;
revoke all on function public.update_baby_document_metadata(uuid, text, text, public.baby_document_category, date) from public, anon;
revoke all on function public.prepare_baby_document_replacement(uuid, text, text, integer) from public, anon;
revoke all on function public.publish_baby_document_replacement(uuid) from public, anon;
revoke all on function public.set_baby_document_retired(uuid, boolean) from public, anon;
revoke all on function public.claim_baby_document_storage_cleanup(integer) from public, anon, authenticated;

grant select on table public.baby_documents to authenticated;
grant select, insert, update, delete on table public.baby_documents to service_role;
grant select, insert, update, delete on table public.baby_document_replacements to service_role;
grant select, insert, update, delete on table public.baby_document_storage_cleanup to service_role;
grant execute on function private.can_manage_baby_document(uuid) to authenticated;
grant execute on function private.can_view_baby_document(uuid) to authenticated;
grant execute on function private.can_access_baby_document_object(text) to authenticated;
grant execute on function private.can_upload_baby_document_object(text) to authenticated;
grant execute on function public.prepare_baby_document(uuid, text, text, public.baby_document_category, date, text, text, integer) to authenticated;
grant execute on function public.publish_baby_document(uuid) to authenticated;
grant execute on function public.update_baby_document_metadata(uuid, text, text, public.baby_document_category, date) to authenticated;
grant execute on function public.prepare_baby_document_replacement(uuid, text, text, integer) to authenticated;
grant execute on function public.publish_baby_document_replacement(uuid) to authenticated;
grant execute on function public.set_baby_document_retired(uuid, boolean) to authenticated;
grant execute on function public.claim_baby_document_storage_cleanup(integer) to service_role;
