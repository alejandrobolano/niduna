alter table public.product_announcements
drop constraint if exists product_announcements_target_route_check;

alter table public.product_announcements
add constraint product_announcements_target_route_check
check (
  target_route is null
  or target_route in (
    'handoff',
    'history',
    'baby',
    'family',
    'medications',
    'settings'
  )
);
