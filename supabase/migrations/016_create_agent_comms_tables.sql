create table if not exists public.agent_phone_numbers (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  created_by uuid not null,
  provider text not null default 'twilio',
  friendly_name text not null default '',
  phone_number_e164 text not null,
  status text not null default 'verified',
  assigned_agent_id uuid null references public.ai_agents(id) on delete set null,
  capabilities jsonb not null default '{"voice": true, "sms": false, "whatsapp": false}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(created_by, phone_number_e164)
);

create table if not exists public.agent_channel_connections (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  created_by uuid not null,
  channel_type text not null,
  provider text not null,
  display_name text not null,
  status text not null default 'disconnected',
  webhook_url text null,
  phone_number_id uuid null references public.agent_phone_numbers(id) on delete set null,
  assigned_agent_id uuid null references public.ai_agents(id) on delete set null,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_agent_phone_numbers_created_by on public.agent_phone_numbers(created_by);
create index if not exists idx_agent_phone_numbers_assigned_agent on public.agent_phone_numbers(assigned_agent_id);
create index if not exists idx_agent_channel_connections_created_by on public.agent_channel_connections(created_by);
create index if not exists idx_agent_channel_connections_assigned_agent on public.agent_channel_connections(assigned_agent_id);
