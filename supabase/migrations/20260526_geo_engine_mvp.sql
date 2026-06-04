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
