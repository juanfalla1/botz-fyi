-- Combined GEO dev setup. Run only on a non-production Supabase project.

-- ============================================================
-- 20260526_geo_engine_mvp.sql
-- ============================================================
create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_name text not null,
  website_url text not null,
  country text not null,
  language text not null,
  industry text not null,
  business_goal text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_competitors (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  competitor_name text not null,
  created_at timestamptz not null default now()
);

create type geo_audit_status as enum ('pending','crawling','analyzing','scoring','completed','failed');

create table if not exists public.geo_audits (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  status geo_audit_status not null default 'pending',
  base_url text not null,
  crawl_depth int not null default 1 check (crawl_depth between 1 and 3),
  engines jsonb not null default '[]'::jsonb,
  summary text,
  final_score numeric,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.crawled_pages (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.geo_audits(id) on delete cascade,
  url text not null,
  title text,
  description text,
  content text,
  status_code int,
  word_count int,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_queries (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.geo_audits(id) on delete cascade,
  prompt text not null,
  engine text not null,
  intent text,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_answers (
  id uuid primary key default gen_random_uuid(),
  query_id uuid not null references public.ai_queries(id) on delete cascade,
  engine text not null,
  answer_text text not null,
  citations jsonb default '[]'::jsonb,
  raw_response jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.brand_mentions (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.geo_audits(id) on delete cascade,
  engine text not null,
  brand_name text not null,
  mentioned boolean not null default false,
  mention_context text,
  sentiment text,
  confidence_score numeric
);

create table if not exists public.competitor_mentions (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.geo_audits(id) on delete cascade,
  competitor_name text not null,
  engine text not null,
  mentioned boolean not null default false,
  mention_context text,
  position int
);

create table if not exists public.geo_scores (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.geo_audits(id) on delete cascade,
  ai_visibility_score numeric,
  citation_probability numeric,
  brand_mention_score numeric,
  competitor_dominance_score numeric,
  content_clarity_score numeric,
  entity_consistency_score numeric,
  structured_data_score numeric,
  topical_authority_score numeric,
  freshness_score numeric,
  trust_signal_score numeric,
  final_score numeric,
  explanation text
);

create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.geo_audits(id) on delete cascade,
  title text not null,
  description text not null,
  priority text not null,
  type text not null,
  suggested_action text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.content_opportunities (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.geo_audits(id) on delete cascade,
  title text not null,
  target_prompt text not null,
  intent text not null,
  recommended_format text not null,
  priority text not null,
  brief text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid references public.geo_audits(id) on delete cascade,
  level text not null,
  message text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;
alter table public.project_competitors enable row level security;
alter table public.geo_audits enable row level security;
alter table public.crawled_pages enable row level security;
alter table public.ai_queries enable row level security;
alter table public.ai_answers enable row level security;
alter table public.brand_mentions enable row level security;
alter table public.competitor_mentions enable row level security;
alter table public.geo_scores enable row level security;
alter table public.recommendations enable row level security;
alter table public.content_opportunities enable row level security;
alter table public.audit_logs enable row level security;

create policy "projects_owner_select" on public.projects for select using (auth.uid() = user_id);
create policy "projects_owner_write" on public.projects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "project_competitors_owner" on public.project_competitors for all using (
  exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
) with check (
  exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
);

create policy "geo_audits_owner" on public.geo_audits for all using (
  exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
) with check (
  exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
);

create policy "crawled_pages_owner" on public.crawled_pages for all using (
  exists (
    select 1 from public.geo_audits a join public.projects p on p.id = a.project_id
    where a.id = audit_id and p.user_id = auth.uid()
  )
);

create policy "ai_queries_owner" on public.ai_queries for all using (
  exists (
    select 1 from public.geo_audits a join public.projects p on p.id = a.project_id
    where a.id = audit_id and p.user_id = auth.uid()
  )
);

create policy "ai_answers_owner" on public.ai_answers for all using (
  exists (
    select 1 from public.ai_queries q
    join public.geo_audits a on a.id = q.audit_id
    join public.projects p on p.id = a.project_id
    where q.id = query_id and p.user_id = auth.uid()
  )
);

create policy "brand_mentions_owner" on public.brand_mentions for all using (
  exists (
    select 1 from public.geo_audits a join public.projects p on p.id = a.project_id
    where a.id = audit_id and p.user_id = auth.uid()
  )
);

create policy "competitor_mentions_owner" on public.competitor_mentions for all using (
  exists (
    select 1 from public.geo_audits a join public.projects p on p.id = a.project_id
    where a.id = audit_id and p.user_id = auth.uid()
  )
);

create policy "geo_scores_owner" on public.geo_scores for all using (
  exists (
    select 1 from public.geo_audits a join public.projects p on p.id = a.project_id
    where a.id = audit_id and p.user_id = auth.uid()
  )
);

create policy "recommendations_owner" on public.recommendations for all using (
  exists (
    select 1 from public.geo_audits a join public.projects p on p.id = a.project_id
    where a.id = audit_id and p.user_id = auth.uid()
  )
);

create policy "content_opportunities_owner" on public.content_opportunities for all using (
  exists (
    select 1 from public.geo_audits a join public.projects p on p.id = a.project_id
    where a.id = audit_id and p.user_id = auth.uid()
  )
);

create policy "audit_logs_owner" on public.audit_logs for all using (
  exists (
    select 1 from public.geo_audits a join public.projects p on p.id = a.project_id
    where a.id = audit_id and p.user_id = auth.uid()
  )
);


-- ============================================================
-- 20260527_geo_phase1_auth_and_rls.sql
-- ============================================================
create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  locale text not null default 'es',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_geo_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(nullif(excluded.full_name, ''), public.users.full_name),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_geo on auth.users;
create trigger on_auth_user_created_geo
after insert on auth.users
for each row execute function public.handle_geo_new_user();

alter table public.users enable row level security;

drop policy if exists users_owner_select on public.users;
create policy users_owner_select on public.users
for select
using (auth.uid() = id);

drop policy if exists users_owner_update on public.users;
create policy users_owner_update on public.users
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create table if not exists public.competitors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  name text not null,
  domain text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  audit_id uuid references public.geo_audits(id) on delete cascade,
  name text not null,
  report_type text not null,
  status text not null default 'ready',
  file_url text,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.competitors enable row level security;
alter table public.reports enable row level security;

drop policy if exists competitors_owner_select on public.competitors;
create policy competitors_owner_select on public.competitors
for select using (auth.uid() = user_id);

drop policy if exists competitors_owner_insert on public.competitors;
create policy competitors_owner_insert on public.competitors
for insert with check (auth.uid() = user_id);

drop policy if exists competitors_owner_update on public.competitors;
create policy competitors_owner_update on public.competitors
for update using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists competitors_owner_delete on public.competitors;
create policy competitors_owner_delete on public.competitors
for delete using (auth.uid() = user_id);

drop policy if exists reports_owner_select on public.reports;
create policy reports_owner_select on public.reports
for select using (auth.uid() = user_id);

drop policy if exists reports_owner_insert on public.reports;
create policy reports_owner_insert on public.reports
for insert with check (auth.uid() = user_id);

drop policy if exists reports_owner_update on public.reports;
create policy reports_owner_update on public.reports
for update using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists reports_owner_delete on public.reports;
create policy reports_owner_delete on public.reports
for delete using (auth.uid() = user_id);


-- ============================================================
-- 20260527_geo_phase2_billing_and_usage.sql
-- ============================================================
create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'geo_plan') then
    create type public.geo_plan as enum ('trial', 'starter', 'growth', 'enterprise');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'geo_subscription_status') then
    create type public.geo_subscription_status as enum ('active', 'inactive', 'canceled', 'past_due');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'geo_usage_event_type') then
    create type public.geo_usage_event_type as enum ('geo_audit_created', 'prompt_used', 'report_exported');
  end if;
end
$$;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  plan public.geo_plan not null default 'trial',
  status public.geo_subscription_status not null default 'active',
  audits_limit integer not null default 3,
  audits_used integer not null default 0,
  prompts_limit integer not null default 25,
  prompts_used integer not null default 0,
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_non_negative check (
    audits_limit >= 0 and audits_used >= 0 and prompts_limit >= 0 and prompts_used >= 0
  )
);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type public.geo_usage_event_type not null,
  amount integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint usage_events_amount_positive check (amount > 0)
);

create index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);
create index if not exists idx_usage_events_user_created on public.usage_events(user_id, created_at desc);

create or replace function public.set_updated_at_subscription()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_subscription on public.subscriptions;
create trigger set_updated_at_subscription
before update on public.subscriptions
for each row
execute function public.set_updated_at_subscription();

create or replace function public.handle_geo_subscription_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.subscriptions (
    user_id,
    plan,
    status,
    audits_limit,
    audits_used,
    prompts_limit,
    prompts_used,
    current_period_start,
    current_period_end
  ) values (
    new.id,
    'trial',
    'active',
    3,
    0,
    25,
    0,
    now(),
    now() + interval '30 days'
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_geo_subscription on auth.users;
create trigger on_auth_user_created_geo_subscription
after insert on auth.users
for each row execute function public.handle_geo_subscription_new_user();

alter table public.subscriptions enable row level security;
alter table public.usage_events enable row level security;

drop policy if exists subscriptions_owner_select on public.subscriptions;
create policy subscriptions_owner_select on public.subscriptions
for select using (auth.uid() = user_id);

drop policy if exists subscriptions_owner_insert on public.subscriptions;
create policy subscriptions_owner_insert on public.subscriptions
for insert with check (auth.uid() = user_id);

drop policy if exists subscriptions_owner_update on public.subscriptions;
create policy subscriptions_owner_update on public.subscriptions
for update using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists usage_events_owner_select on public.usage_events;
create policy usage_events_owner_select on public.usage_events
for select using (auth.uid() = user_id);

drop policy if exists usage_events_owner_insert on public.usage_events;
create policy usage_events_owner_insert on public.usage_events
for insert with check (auth.uid() = user_id);


-- ============================================================
-- 20260527_geo_phase3_saas_core.sql
-- ============================================================
create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'geo_job_status') then
    create type public.geo_job_status as enum ('queued', 'running', 'completed', 'failed');
  end if;
end
$$;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

alter table public.projects add column if not exists workspace_id uuid references public.workspaces(id) on delete set null;
create index if not exists idx_projects_workspace_id on public.projects(workspace_id);

create table if not exists public.audit_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  audit_id uuid references public.geo_audits(id) on delete set null,
  status public.geo_job_status not null default 'queued',
  payload jsonb not null default '{}'::jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  level text not null default 'info',
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.automations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  competitor_id uuid references public.competitors(id) on delete set null,
  name text not null,
  frequency text not null default 'weekly',
  enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_workspace_members_user on public.workspace_members(user_id);
create index if not exists idx_audit_jobs_user_created on public.audit_jobs(user_id, created_at desc);
create index if not exists idx_notifications_user_created on public.notifications(user_id, created_at desc);
create index if not exists idx_automations_user_created on public.automations(user_id, created_at desc);

create or replace function public.geo_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_workspaces_updated_at on public.workspaces;
create trigger trg_workspaces_updated_at before update on public.workspaces for each row execute function public.geo_set_updated_at();
drop trigger if exists trg_audit_jobs_updated_at on public.audit_jobs;
create trigger trg_audit_jobs_updated_at before update on public.audit_jobs for each row execute function public.geo_set_updated_at();
drop trigger if exists trg_automations_updated_at on public.automations;
create trigger trg_automations_updated_at before update on public.automations for each row execute function public.geo_set_updated_at();

create or replace function public.handle_geo_workspace_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
begin
  insert into public.workspaces (owner_user_id, name, slug)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'company_name', 'My Workspace'), 'ws-' || substring(replace(new.id::text, '-', ''), 1, 8))
  returning id into v_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_workspace_id, new.id, 'owner')
  on conflict (workspace_id, user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_geo_workspace on auth.users;
create trigger on_auth_user_created_geo_workspace
after insert on auth.users
for each row execute function public.handle_geo_workspace_new_user();

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.audit_jobs enable row level security;
alter table public.notifications enable row level security;
alter table public.automations enable row level security;

drop policy if exists workspaces_owner_rw on public.workspaces;
create policy workspaces_owner_rw on public.workspaces
for all using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

drop policy if exists workspace_members_owner_rw on public.workspace_members;
create policy workspace_members_owner_rw on public.workspace_members
for all using (
  exists (
    select 1 from public.workspaces w
    where w.id = workspace_id and w.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workspaces w
    where w.id = workspace_id and w.owner_user_id = auth.uid()
  )
);

drop policy if exists audit_jobs_owner_rw on public.audit_jobs;
create policy audit_jobs_owner_rw on public.audit_jobs
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists notifications_owner_rw on public.notifications;
create policy notifications_owner_rw on public.notifications
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists automations_owner_rw on public.automations;
create policy automations_owner_rw on public.automations
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);


-- ============================================================
-- 20260527_geo_phase6_scheduler_retry_logs.sql
-- ============================================================
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


-- ============================================================
-- 20260527_geo_phase6_1_scheduler_hardening.sql
-- ============================================================
alter table public.audit_jobs
  add column if not exists heartbeat_at timestamptz;

create index if not exists idx_audit_jobs_scheduler_hardening
  on public.audit_jobs(status, locked_at, heartbeat_at, next_retry_at, created_at);


-- ============================================================
-- 20260527_geo_phase7_2_aliases_config.sql
-- ============================================================
alter table public.projects
  add column if not exists brand_aliases jsonb not null default '[]'::jsonb,
  add column if not exists domain_aliases jsonb not null default '[]'::jsonb,
  add column if not exists entity_stopwords jsonb not null default '[]'::jsonb;

alter table public.competitors
  add column if not exists aliases jsonb not null default '[]'::jsonb,
  add column if not exists domain_aliases jsonb not null default '[]'::jsonb;

create index if not exists idx_projects_brand_aliases_gin on public.projects using gin (brand_aliases);
create index if not exists idx_projects_domain_aliases_gin on public.projects using gin (domain_aliases);
create index if not exists idx_competitors_aliases_gin on public.competitors using gin (aliases);


-- ============================================================
-- 20260602_geo_prompts_library.sql
-- ============================================================
create table if not exists public.geo_prompts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  prompt text not null,
  category text not null default 'general',
  engines text[] not null default array[]::text[],
  country text,
  language text,
  enabled boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_geo_prompts_user_project_created on public.geo_prompts(user_id, project_id, created_at desc);
create index if not exists idx_geo_prompts_project_enabled on public.geo_prompts(project_id, enabled);

drop trigger if exists trg_geo_prompts_updated_at on public.geo_prompts;
create trigger trg_geo_prompts_updated_at before update on public.geo_prompts for each row execute function public.geo_set_updated_at();

alter table public.geo_prompts enable row level security;

drop policy if exists geo_prompts_owner_rw on public.geo_prompts;
create policy geo_prompts_owner_rw on public.geo_prompts
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);


-- ============================================================
-- 20260607_scope_geo_auth_triggers_by_product.sql
-- ============================================================
create or replace function public.handle_geo_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.raw_user_meta_data ->> 'product_key', new.raw_app_meta_data ->> 'product_key', 'geo') <> 'geo' then
    return new;
  end if;

  insert into public.users (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(nullif(excluded.full_name, ''), public.users.full_name),
    updated_at = now();

  return new;
end;
$$;

create or replace function public.handle_geo_subscription_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.raw_user_meta_data ->> 'product_key', new.raw_app_meta_data ->> 'product_key', 'geo') <> 'geo' then
    return new;
  end if;

  insert into public.subscriptions (
    user_id,
    plan,
    status,
    audits_limit,
    audits_used,
    prompts_limit,
    prompts_used,
    current_period_start,
    current_period_end
  ) values (
    new.id,
    'trial',
    'active',
    3,
    0,
    25,
    0,
    now(),
    now() + interval '30 days'
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create or replace function public.handle_geo_workspace_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
begin
  if coalesce(new.raw_user_meta_data ->> 'product_key', new.raw_app_meta_data ->> 'product_key', 'geo') <> 'geo' then
    return new;
  end if;

  insert into public.workspaces (owner_user_id, name, slug)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'company_name', 'My Workspace'), 'ws-' || substring(replace(new.id::text, '-', ''), 1, 8))
  returning id into v_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_workspace_id, new.id, 'owner')
  on conflict (workspace_id, user_id) do nothing;

  return new;
end;
$$;

