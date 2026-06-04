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
