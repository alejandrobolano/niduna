create table public.family_stories (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  baby_id uuid not null references public.babies (id) on delete cascade,
  author_user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  file_size_bytes integer not null check (file_size_bytes between 1 and 5242880),
  created_at timestamptz not null default now(),
  published_at timestamptz,
  expires_at timestamptz not null,
  removed_at timestamptz,
  cleanup_status text not null default 'not_due'
    check (cleanup_status in ('not_due', 'pending', 'processing', 'failed')),
  cleanup_attempts integer not null default 0 check (cleanup_attempts >= 0),
  cleanup_claimed_at timestamptz,
  cleanup_last_error text,
  constraint family_stories_expire_after_24_hours
    check (expires_at = created_at + interval '24 hours')
);

create table public.family_story_views (
  story_id uuid not null references public.family_stories (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (story_id, user_id)
);

create index family_stories_active_baby_created_idx
  on public.family_stories (baby_id, created_at desc)
  where published_at is not null and removed_at is null;

create index family_stories_cleanup_idx
  on public.family_stories (cleanup_status, expires_at)
  where cleanup_status in ('pending', 'processing', 'failed');

create index family_stories_family_id_idx
  on public.family_stories (family_id);

create index family_stories_author_user_id_idx
  on public.family_stories (author_user_id);

create index family_story_views_user_id_idx
  on public.family_story_views (user_id, story_id);

create or replace function private.can_view_followed_baby(target_baby_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.babies baby
    join public.baby_followers follower
      on follower.family_id = baby.family_id
      and follower.baby_id = baby.id
      and follower.user_id = (select auth.uid())
    where baby.id = target_baby_id
      and baby.archived_at is null
      and private.is_family_member(baby.family_id)
  );
$$;

create or replace function private.can_view_family_story(target_story_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.family_stories story
    where story.id = target_story_id
      and story.published_at is not null
      and story.removed_at is null
      and story.expires_at > now()
      and private.can_view_followed_baby(story.baby_id)
  );
$$;

create or replace function private.can_access_family_story_object(target_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.family_stories story
    where story.storage_path = target_path
      and private.can_view_family_story(story.id)
  );
$$;

create or replace function private.can_upload_family_story_object(target_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.family_stories story
    where story.storage_path = target_path
      and story.author_user_id = (select auth.uid())
      and story.published_at is null
      and story.removed_at is null
      and story.expires_at > now()
      and private.can_record_baby_care(story.baby_id)
      and private.can_view_followed_baby(story.baby_id)
  );
$$;

create function public.prepare_family_story(
  target_baby_id uuid,
  target_mime_type text,
  target_file_size_bytes integer
)
returns table (id uuid, storage_path text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  selected_family_id uuid;
  selected_story_id uuid := gen_random_uuid();
  selected_created_at timestamptz := now();
  selected_extension text;
  selected_path text;
begin
  if actor_id is null
    or not private.can_record_baby_care(target_baby_id)
    or not private.can_view_followed_baby(target_baby_id) then
    raise exception 'family_story_not_allowed' using errcode = '42501';
  end if;

  if target_mime_type not in ('image/jpeg', 'image/png', 'image/webp') then
    raise exception 'family_story_invalid_mime' using errcode = '22023';
  end if;

  if target_file_size_bytes < 1 or target_file_size_bytes > 5242880 then
    raise exception 'family_story_invalid_size' using errcode = '22023';
  end if;

  select baby.family_id
  into selected_family_id
  from public.babies baby
  where baby.id = target_baby_id and baby.archived_at is null;

  if selected_family_id is null then
    raise exception 'family_story_baby_not_found' using errcode = 'P0002';
  end if;

  selected_extension := case target_mime_type
    when 'image/png' then 'png'
    when 'image/webp' then 'webp'
    else 'jpg'
  end;
  selected_path := concat(
    selected_family_id, '/', target_baby_id, '/', actor_id, '/',
    selected_story_id, '.', selected_extension
  );

  insert into public.family_stories (
    id,
    family_id,
    baby_id,
    author_user_id,
    storage_path,
    mime_type,
    file_size_bytes,
    created_at,
    expires_at
  ) values (
    selected_story_id,
    selected_family_id,
    target_baby_id,
    actor_id,
    selected_path,
    target_mime_type,
    target_file_size_bytes,
    selected_created_at,
    selected_created_at + interval '24 hours'
  );

  return query
  select selected_story_id, selected_path, selected_created_at + interval '24 hours';
end;
$$;

create function public.publish_family_story(target_story_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_story public.family_stories%rowtype;
begin
  select * into selected_story
  from public.family_stories
  where id = target_story_id
    and author_user_id = (select auth.uid())
    and published_at is null
    and removed_at is null;

  if selected_story.id is null then
    raise exception 'family_story_not_found' using errcode = 'P0002';
  end if;

  if not exists (
    select 1
    from storage.objects object
    where object.bucket_id = 'family-stories'
      and object.name = selected_story.storage_path
      and object.metadata ->> 'mimetype' = selected_story.mime_type
      and (object.metadata ->> 'size')::integer between 1 and 5242880
  ) then
    raise exception 'family_story_object_invalid' using errcode = '22023';
  end if;

  update public.family_stories
  set published_at = now()
  where id = selected_story.id;
end;
$$;

create function public.mark_family_story_viewed(target_story_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.can_view_family_story(target_story_id) then
    raise exception 'family_story_not_allowed' using errcode = '42501';
  end if;

  insert into public.family_story_views (story_id, user_id, viewed_at)
  values (target_story_id, (select auth.uid()), now())
  on conflict (story_id, user_id)
  do update set viewed_at = excluded.viewed_at;
end;
$$;

create function public.retire_family_story(target_story_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_story public.family_stories%rowtype;
begin
  select * into selected_story
  from public.family_stories
  where id = target_story_id;

  if selected_story.id is null then
    raise exception 'family_story_not_found' using errcode = 'P0002';
  end if;

  if selected_story.author_user_id <> (select auth.uid())
    and not private.has_family_role(
      selected_story.family_id,
      array['owner', 'admin']::public.family_role[]
    ) then
    raise exception 'family_story_not_allowed' using errcode = '42501';
  end if;

  update public.family_stories
  set
    removed_at = coalesce(removed_at, now()),
    cleanup_status = 'pending',
    cleanup_claimed_at = null,
    cleanup_last_error = null
  where id = selected_story.id;
end;
$$;

create function public.claim_family_stories_for_cleanup(batch_size integer default 100)
returns table (id uuid, storage_path text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'family_story_cleanup_not_allowed' using errcode = '42501';
  end if;

  return query
  with candidates as (
    select story.id
    from public.family_stories story
    where (
      story.expires_at <= now()
      or story.removed_at is not null
      or (story.published_at is null and story.created_at <= now() - interval '15 minutes')
    )
      and (
        story.cleanup_status in ('not_due', 'pending', 'failed')
        or (
          story.cleanup_status = 'processing'
          and story.cleanup_claimed_at <= now() - interval '15 minutes'
        )
      )
    order by story.expires_at
    for update skip locked
    limit greatest(1, least(batch_size, 500))
  ), claimed as (
    update public.family_stories story
    set
      cleanup_status = 'processing',
      cleanup_claimed_at = now(),
      cleanup_attempts = story.cleanup_attempts + 1,
      cleanup_last_error = null
    from candidates
    where story.id = candidates.id
    returning story.id, story.storage_path
  )
  select claimed.id, claimed.storage_path from claimed;
end;
$$;

alter table public.family_stories enable row level security;
alter table public.family_story_views enable row level security;

create policy family_stories_select_followers
on public.family_stories for select
to authenticated
using (private.can_view_family_story(id));

create policy family_story_views_select_self
on public.family_story_views for select
to authenticated
using (
  user_id = (select auth.uid())
  and private.can_view_family_story(story_id)
);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'family-stories',
  'family-stories',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy family_stories_objects_select_followers
on storage.objects for select
to authenticated
using (
  bucket_id = 'family-stories'
  and private.can_access_family_story_object(name)
);

create policy family_stories_objects_insert_authors
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'family-stories'
  and private.can_upload_family_story_object(name)
);

alter publication supabase_realtime add table public.family_stories;
alter publication supabase_realtime add table public.family_story_views;

revoke all on table public.family_stories from public, anon;
revoke all on table public.family_story_views from public, anon;
revoke all on function private.can_view_followed_baby(uuid) from public;
revoke all on function private.can_view_family_story(uuid) from public;
revoke all on function private.can_access_family_story_object(text) from public;
revoke all on function private.can_upload_family_story_object(text) from public;
revoke all on function public.prepare_family_story(uuid, text, integer) from public, anon;
revoke all on function public.publish_family_story(uuid) from public, anon;
revoke all on function public.mark_family_story_viewed(uuid) from public, anon;
revoke all on function public.retire_family_story(uuid) from public, anon;
revoke all on function public.claim_family_stories_for_cleanup(integer) from public, anon, authenticated;

grant select on table public.family_stories to authenticated;
grant select on table public.family_story_views to authenticated;
grant select, update, delete on table public.family_stories to service_role;
grant select, delete on table public.family_story_views to service_role;
grant execute on function private.can_view_followed_baby(uuid) to authenticated;
grant execute on function private.can_view_family_story(uuid) to authenticated;
grant execute on function private.can_access_family_story_object(text) to authenticated;
grant execute on function private.can_upload_family_story_object(text) to authenticated;
grant execute on function public.prepare_family_story(uuid, text, integer) to authenticated;
grant execute on function public.publish_family_story(uuid) to authenticated;
grant execute on function public.mark_family_story_viewed(uuid) to authenticated;
grant execute on function public.retire_family_story(uuid) to authenticated;
grant execute on function public.claim_family_stories_for_cleanup(integer) to service_role;
