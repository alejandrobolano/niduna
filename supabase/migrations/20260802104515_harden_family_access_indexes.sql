create index baby_followers_family_baby_idx
  on public.baby_followers (family_id, baby_id);

create index baby_followers_family_user_idx
  on public.baby_followers (family_id, user_id);

create policy family_membership_removals_deny_clients
on private.family_membership_removals
for all
to authenticated
using (false)
with check (false);

create policy baby_archive_events_deny_clients
on private.baby_archive_events
for all
to authenticated
using (false)
with check (false);
