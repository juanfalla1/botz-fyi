create table if not exists public.agent_channel_onboarding_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  created_by uuid not null,
  channel_type text not null,
  provider text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_agent_channel_onboarding_requests_created_by
  on public.agent_channel_onboarding_requests(created_by);
