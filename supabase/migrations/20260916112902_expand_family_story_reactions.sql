alter table public.family_story_reactions
  drop constraint if exists family_story_reactions_reaction_check;

alter table public.family_story_reactions
  add constraint family_story_reactions_reaction_check
  check (reaction in ('heart', 'tender', 'celebrate', 'laugh', 'surprise', 'silly'));

create or replace function public.set_family_story_reaction(
  target_story_id uuid,
  target_reaction text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  selected_author_id uuid;
begin
  if actor_id is null or not private.can_view_family_story(target_story_id) then
    raise exception 'family_story_reaction_not_allowed' using errcode = '42501';
  end if;

  select story.author_user_id
  into selected_author_id
  from public.family_stories story
  where story.id = target_story_id;

  if selected_author_id is null or selected_author_id = actor_id then
    raise exception 'family_story_reaction_not_allowed' using errcode = '42501';
  end if;

  if target_reaction is null then
    delete from public.family_story_reactions
    where story_id = target_story_id and user_id = actor_id;
    return;
  end if;

  if target_reaction not in ('heart', 'tender', 'celebrate', 'laugh', 'surprise', 'silly') then
    raise exception 'family_story_reaction_invalid' using errcode = '22023';
  end if;

  insert into public.family_story_reactions (
    story_id,
    user_id,
    reaction,
    created_at,
    updated_at
  ) values (
    target_story_id,
    actor_id,
    target_reaction,
    now(),
    now()
  )
  on conflict (story_id, user_id)
  do update set
    reaction = excluded.reaction,
    updated_at = now();
end;
$$;

revoke all on function public.set_family_story_reaction(uuid, text) from public, anon;
grant execute on function public.set_family_story_reaction(uuid, text) to authenticated;
