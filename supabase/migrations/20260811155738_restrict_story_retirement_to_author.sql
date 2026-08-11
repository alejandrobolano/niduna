create or replace function public.mark_family_story_viewed(target_story_id uuid)
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
  do nothing;
end;
$$;

create or replace function public.retire_family_story(target_story_id uuid)
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

  if selected_story.author_user_id <> (select auth.uid()) then
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
