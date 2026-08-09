select cron.unschedule(jobid)
from cron.job
where jobname = 'purge-niduna-family-audit-logs';

select cron.schedule(
  'purge-niduna-family-audit-logs',
  '17 3 * * *',
  $$delete from public.family_audit_logs
    where created_at < now() - interval '60 days'$$
);

delete from public.family_audit_logs
where created_at < now() - interval '60 days';
