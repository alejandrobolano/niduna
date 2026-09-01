create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'cleanup-baby-documents-every-fifteen-minutes',
  '*/15 * * * *',
  $cleanup$
    select net.http_post(
      url := (
        select decrypted_secret from vault.decrypted_secrets where name = 'project_url'
      ) || '/functions/v1/cleanup-baby-documents',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (
          select decrypted_secret from vault.decrypted_secrets where name = 'publishable_key'
        ),
        'Authorization', 'Bearer ' || (
          select decrypted_secret from vault.decrypted_secrets where name = 'publishable_key'
        )
      ),
      body := jsonb_build_object('scheduledAt', now()),
      timeout_milliseconds := 10000
    );
  $cleanup$
);
