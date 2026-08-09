create index app_release_notification_deliveries_push_device_idx
  on public.app_release_notification_deliveries (push_device_id);

create policy app_release_notification_deliveries_no_client_access
on public.app_release_notification_deliveries
for all
to authenticated
using (false)
with check (false);
