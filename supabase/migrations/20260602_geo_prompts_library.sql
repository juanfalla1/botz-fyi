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
