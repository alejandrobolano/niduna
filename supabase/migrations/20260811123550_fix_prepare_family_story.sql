create or replace function public.prepare_family_story(
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
