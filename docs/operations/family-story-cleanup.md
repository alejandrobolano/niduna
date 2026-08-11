# Family story cleanup

The `cleanup-family-stories` Edge Function must be deployed with JWT verification enabled. The database invokes it every five minutes through `pg_cron` and `pg_net`.

Before applying `schedule_family_story_cleanup` in a new Supabase environment, store the environment URL and publishable key in Vault:

```sql
select vault.create_secret('https://PROJECT_REF.supabase.co', 'project_url');
select vault.create_secret('PUBLISHABLE_KEY', 'publishable_key');
```

The scheduled function claims expired, retired, and abandoned uploads atomically. It deletes each object through the Storage API before deleting its metadata. Failed operations remain hidden and are retried by a later run.

Verify the job after deployment:

```sql
select jobid, jobname, schedule, active
from cron.job
where jobname = 'cleanup-family-stories-every-five-minutes';
```
