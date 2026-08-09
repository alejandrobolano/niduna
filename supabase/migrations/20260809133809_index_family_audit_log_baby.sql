create index family_audit_logs_baby_idx
  on public.family_audit_logs (baby_id)
  where baby_id is not null;
