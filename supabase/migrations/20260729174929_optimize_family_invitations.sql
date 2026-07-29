create index family_invitations_accepted_by_idx
  on public.family_invitations (accepted_by);

create index family_invitations_created_by_idx
  on public.family_invitations (created_by);

drop policy profiles_select_self on public.profiles;
drop policy profiles_select_shared_family on public.profiles;

create policy profiles_select_family
on public.profiles for select
to authenticated
using (private.shares_family_with(id));
