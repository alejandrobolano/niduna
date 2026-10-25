create function private.was_registered_before(target_timestamp timestamptz)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and created_at < target_timestamp
  );
$$;

revoke all on function private.was_registered_before(timestamptz)
from public, anon;
grant execute on function private.was_registered_before(timestamptz)
to authenticated;

drop policy "Authenticated users can read active product announcements"
on public.product_announcements;

create policy "Existing users can read active product announcements"
on public.product_announcements for select to authenticated
using (
  status = 'published'
  and published_at <= now()
  and (expires_at is null or expires_at > now())
  and private.was_registered_before(published_at)
);
