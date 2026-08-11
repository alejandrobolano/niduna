create index family_stories_expiry_cleanup_idx
  on public.family_stories (expires_at)
  where cleanup_status = 'not_due';

create index family_stories_abandoned_upload_cleanup_idx
  on public.family_stories (created_at)
  where published_at is null and cleanup_status = 'not_due';
