# Data retention

## Policy

| Data | Retention | Recovery |
| --- | --- | --- |
| Active care events, notes, and measurements | No automatic expiry while the family exists | Not applicable |
| Retired care events, notes, and measurements | 30 days from `deleted_at` | Owners and administrators can restore them before the deadline |
| Family activity entries | 180 days from `created_at` | Not recoverable; removing an entry never removes the underlying care record |
| Retention execution records | 180 days | Private operational evidence only |

Account and family deletion, provider backups, and future legal-retention
requirements are separate policies.

## Scheduled operation

Supabase Cron runs `private.apply_data_retention()` every day at `03:17 UTC`
under the job name `apply-niduna-data-retention`.

The function:

1. Serializes concurrent executions with a transaction-level advisory lock.
2. Physically deletes only retired care rows whose `deleted_at` is strictly
   earlier than the 30-day cutoff.
3. Deletes family activity strictly older than 180 days.
4. Writes the cutoffs and per-table deletion counts to
   `private.data_retention_runs`.

It is safe to execute repeatedly. A second execution at the same instant finds
no additional eligible rows. Active care rows do not match any purge query.

## Operational verification

Inspect the active schedule without exposing application data:

```sql
select jobid, jobname, schedule, active
from cron.job
where jobname = 'apply-niduna-data-retention';
```

Inspect recent job outcomes:

```sql
select status, start_time, end_time, return_message
from cron.job_run_details
where jobid = (
  select jobid from cron.job
  where jobname = 'apply-niduna-data-retention'
)
order by start_time desc
limit 10;
```

Inspect deletion counts as a database administrator:

```sql
select *
from private.data_retention_runs
order by executed_at desc
limit 10;
```

## Public privacy text

Before a stable release, the public privacy policy on `niduna.com` must explain
that active family-care records are kept while needed for the service, retired
records can be recovered for 30 days before permanent deletion, and the
administrative activity log is retained for 180 days. It must also distinguish
application deletion from the database provider's backup lifecycle.

The policy must also state that families may upload private PDF, JPEG, and PNG
documents associated with a baby. These files and their metadata are available
only to active authorized members of that family through short-lived signed
URLs. Authors can manage their own documents, while family owners and
administrators can manage every family document. Retired documents remain
stored until they are restored or permanently deleted with the baby, family,
or account; replaced files and abandoned uploads are removed automatically.
Niduna does not interpret these files as medical records and does not provide
diagnosis or clinical advice.
