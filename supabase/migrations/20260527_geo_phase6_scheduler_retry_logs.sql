create extension if not exists "pgcrypto";

alter table public.audit_jobs
  add column if not exists retry_count integer not null default 0,
  add column if not exists max_retries integer not null default 3,
  add column if not exists failed_reason text,
  add column if not exists locked_at timestamptz,
  add column if not exists next_retry_at timestamptz;

create table if not exists public.audit_job_logs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.audit_jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  stage text not null,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_jobs_status_retry_created
  on public.audit_jobs(status, next_retry_at, created_at);

create index if not exists idx_audit_jobs_locked_at
  on public.audit_jobs(locked_at);

create index if not exists idx_audit_job_logs_job_created
  on public.audit_job_logs(job_id, created_at desc);

alter table public.audit_job_logs enable row level security;

drop policy if exists audit_job_logs_owner_select on public.audit_job_logs;
create policy audit_job_logs_owner_select on public.audit_job_logs
for select using (auth.uid() = user_id);

drop policy if exists audit_job_logs_owner_insert on public.audit_job_logs;
create policy audit_job_logs_owner_insert on public.audit_job_logs
for insert with check (auth.uid() = user_id);
