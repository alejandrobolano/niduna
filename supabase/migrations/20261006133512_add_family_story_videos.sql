alter table public.family_stories
  add column media_type text not null default 'image',
  add column duration_ms integer;

alter table public.family_stories
  drop constraint family_stories_mime_type_check,
  drop constraint family_stories_file_size_bytes_check;

alter table public.family_stories
  add constraint family_stories_media_type_check
    check (media_type in ('image', 'video')),
  add constraint family_stories_mime_type_check
    check (
      (media_type = 'image' and mime_type in ('image/jpeg', 'image/png', 'image/webp'))
      or
      (media_type = 'video' and mime_type in ('video/mp4', 'video/quicktime', 'video/webm'))
    ),
  add constraint family_stories_file_size_bytes_check
    check (
      (media_type = 'image' and file_size_bytes between 1 and 5242880)
      or
      (media_type = 'video' and file_size_bytes between 1 and 15728640)
    ),
  add constraint family_stories_duration_check
    check (
      (media_type = 'image' and duration_ms is null)
      or
      (media_type = 'video' and duration_ms between 1 and 15000)
    );

create function public.prepare_family_story_media(
  target_baby_id uuid,
  target_mime_type text,
  target_file_size_bytes integer,
  target_duration_ms integer
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
  selected_media_type text;
  selected_path text;
begin
  if actor_id is null
    or not private.can_record_baby_care(target_baby_id)
    or not private.can_view_followed_baby(target_baby_id) then
    raise exception 'family_story_not_allowed' using errcode = '42501';
  end if;

  selected_media_type := case
    when target_mime_type in ('image/jpeg', 'image/png', 'image/webp') then 'image'
    when target_mime_type in ('video/mp4', 'video/quicktime', 'video/webm') then 'video'
    else null
  end;

  if selected_media_type is null then
    raise exception 'family_story_invalid_mime' using errcode = '22023';
  end if;

  if selected_media_type = 'image' and (
    target_file_size_bytes < 1
    or target_file_size_bytes > 5242880
    or target_duration_ms is not null
  ) then
    raise exception 'family_story_invalid_image' using errcode = '22023';
  end if;

  if selected_media_type = 'video' and (
    target_file_size_bytes < 1
    or target_file_size_bytes > 15728640
    or target_duration_ms is null
    or target_duration_ms < 1
    or target_duration_ms > 15000
  ) then
    raise exception 'family_story_invalid_video' using errcode = '22023';
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
    when 'video/quicktime' then 'mov'
    when 'video/webm' then 'webm'
    when 'video/mp4' then 'mp4'
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
    media_type,
    mime_type,
    file_size_bytes,
    duration_ms,
    created_at,
    expires_at
  ) values (
    selected_story_id,
    selected_family_id,
    target_baby_id,
    actor_id,
    selected_path,
    selected_media_type,
    target_mime_type,
    target_file_size_bytes,
    target_duration_ms,
    selected_created_at,
    selected_created_at + interval '24 hours'
  );

  return query
  select selected_story_id, selected_path, selected_created_at + interval '24 hours';
end;
$$;

create or replace function public.publish_family_story(target_story_id uuid)
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
      and (
        (
          selected_story.media_type = 'image'
          and (object.metadata ->> 'size')::integer between 1 and 5242880
        )
        or
        (
          selected_story.media_type = 'video'
          and (object.metadata ->> 'size')::integer between 1 and 15728640
        )
      )
  ) then
    raise exception 'family_story_object_invalid' using errcode = '22023';
  end if;

  update public.family_stories
  set published_at = now()
  where id = selected_story.id;
end;
$$;

update storage.buckets
set
  file_size_limit = 15728640,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'video/webm'
  ]
where id = 'family-stories';

revoke all on function public.prepare_family_story_media(uuid, text, integer, integer)
from public, anon;
grant execute on function public.prepare_family_story_media(uuid, text, integer, integer)
to authenticated;
