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

create function private.validate_family_story_author_access()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.role()) <> 'service_role' and (
    new.author_user_id <> (select auth.uid())
    or not private.can_record_baby_care(new.baby_id)
    or not private.can_view_followed_baby(new.baby_id)
  ) then
    raise exception 'family_story_not_allowed' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger family_stories_validate_author_access
before insert on public.family_stories
for each row execute function private.validate_family_story_author_access();

revoke all on function private.can_upload_family_story_object(text) from public;
revoke all on function private.validate_family_story_author_access() from public;
grant execute on function private.can_upload_family_story_object(text) to authenticated;
