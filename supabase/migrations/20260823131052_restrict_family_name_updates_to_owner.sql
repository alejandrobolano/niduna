drop policy if exists families_update_admins on public.families;

create policy families_update_owners
on public.families for update
to authenticated
using (
  private.has_family_role(
    id,
    array['owner']::public.family_role[]
  )
)
with check (
  private.has_family_role(
    id,
    array['owner']::public.family_role[]
  )
);

create function public.rename_family(
  target_family_id uuid,
  target_name text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  normalized_name text := trim(target_name);
begin
  if (select auth.uid()) is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if not private.has_family_role(
    target_family_id,
    array['owner']::public.family_role[]
  ) then
    raise exception 'family_rename_not_allowed' using errcode = '42501';
  end if;

  if normalized_name = '' or char_length(normalized_name) > 80 then
    raise exception 'invalid_family_name' using errcode = '22023';
  end if;

  update public.families
  set name = normalized_name
  where id = target_family_id;

  if not found then
    raise exception 'family_not_found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.rename_family(uuid, text)
from public, anon;

grant execute on function public.rename_family(uuid, text)
to authenticated;
