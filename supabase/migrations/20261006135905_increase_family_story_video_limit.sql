alter table public.family_stories
  drop constraint family_stories_file_size_bytes_check;

alter table public.family_stories
  add constraint family_stories_file_size_bytes_check
    check (
      (media_type = 'image' and file_size_bytes between 1 and 5242880)
      or
      (media_type = 'video' and file_size_bytes between 1 and 52428800)
    );

do $$
declare
  function_definition text;
begin
  select pg_get_functiondef('public.prepare_family_story_media(uuid,text,integer,integer)'::regprocedure)
  into function_definition;
  execute replace(function_definition, '15728640', '52428800');

  select pg_get_functiondef('public.publish_family_story(uuid)'::regprocedure)
  into function_definition;
  execute replace(function_definition, '15728640', '52428800');
end;
$$;

update storage.buckets
set file_size_limit = 52428800
where id = 'family-stories';
