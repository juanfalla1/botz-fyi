alter table public.audit_jobs
  add column if not exists heartbeat_at timestamptz;

create index if not exists idx_audit_jobs_scheduler_hardening
  on public.audit_jobs(status, locked_at, heartbeat_at, next_retry_at, created_at);
