alter table public.profiles
add column avatar_key text;

alter table public.profiles
add constraint profiles_avatar_key_check
check (avatar_key is null or avatar_key in ('rabbit', 'bear', 'fox', 'koala', 'otter', 'owl'));

alter table public.babies
add column avatar_key text;

alter table public.babies
add constraint babies_avatar_key_check
check (avatar_key is null or avatar_key in ('chick', 'lamb', 'seal', 'rabbit', 'bear', 'fox', 'koala', 'otter', 'owl'));

grant update (avatar_key) on public.profiles to authenticated;
grant update (avatar_key) on public.babies to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-photos',
  'profile-photos',
  false,
  2097152,
  array['image/jpeg']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy profile_photos_select_family
on storage.objects for select
to authenticated
using (
  bucket_id = 'profile-photos'
  and exists (
    select 1
    from public.profiles
    where profiles.avatar_path = storage.objects.name
      and (
        profiles.id = (select auth.uid())
        or private.shares_family_with(profiles.id)
      )
  )
);

create policy profile_photos_insert_self
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy profile_photos_update_self
on storage.objects for update
to authenticated
using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy profile_photos_delete_self
on storage.objects for delete
to authenticated
using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
