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
