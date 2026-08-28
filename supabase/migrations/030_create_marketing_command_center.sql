-- BOTZ Marketing Command Center foundation.
-- This migration is intentionally not applied by application startup.

create extension if not exists pgcrypto;

create or replace function public.has_marketing_tenant_access(target_tenant uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from public.platform_admins pa
      where pa.auth_user_id = auth.uid()
    )
    or exists (
      select 1
      from public.team_members tm
      where tm.auth_user_id = auth.uid()
        and tm.tenant_id = target_tenant
        and tm.activo = true
    );
$$;

revoke all on function public.has_marketing_tenant_access(uuid) from public;
grant execute on function public.has_marketing_tenant_access(uuid) to authenticated;

create table if not exists public.marketing_connections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  provider text not null check (provider in ('meta', 'google_ads', 'ga4')),
  status text not null default 'pending' check (status in ('pending', 'active', 'expired', 'revoked', 'error')),
  display_name text,
  external_subject_id text,
  access_token_ciphertext bytea,
  access_token_nonce bytea,
  refresh_token_ciphertext bytea,
  refresh_token_nonce bytea,
  encryption_key_version integer,
  scopes text[] not null default '{}',
  expires_at timestamptz,
  last_refreshed_at timestamptz,
  last_error_code text,
  last_error_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, provider, external_subject_id)
);

create table if not exists public.marketing_account_grants (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  connection_id uuid not null references public.marketing_connections(id) on delete cascade,
  provider text not null check (provider in ('meta', 'google_ads', 'ga4')),
  external_account_id text not null,
  parent_external_account_id text,
  account_name text not null,
  currency_code text,
  timezone text,
  is_enabled boolean not null default true,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  unique (tenant_id, provider, external_account_id)
);

create table if not exists public.marketing_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  connection_id uuid references public.marketing_connections(id) on delete cascade,
  provider text not null check (provider in ('meta', 'google_ads', 'ga4', 'crm')),
  resource_type text not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'partial', 'failed', 'cancelled')),
  window_start timestamptz,
  window_end timestamptz,
  cursor jsonb not null default '{}'::jsonb,
  attempts integer not null default 0,
  records_read integer not null default 0,
  records_written integer not null default 0,
  error_code text,
  error_message text,
  queued_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create table if not exists public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  account_grant_id uuid not null references public.marketing_account_grants(id) on delete cascade,
  provider text not null check (provider in ('meta', 'google_ads')),
  external_campaign_id text not null,
  name text not null,
  campaign_type text,
  status text,
  objective text,
  currency_code text not null,
  timezone text not null,
  daily_budget numeric(18, 6),
  lifetime_budget numeric(18, 6),
  starts_at timestamptz,
  ends_at timestamptz,
  provider_updated_at timestamptz,
  synced_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (tenant_id, provider, external_campaign_id)
);

create table if not exists public.marketing_campaign_daily (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  campaign_id uuid not null references public.marketing_campaigns(id) on delete cascade,
  provider text not null check (provider in ('meta', 'google_ads')),
  metric_date date not null,
  platform_placement text,
  device text,
  location_key text,
  impressions bigint not null default 0,
  reach bigint not null default 0,
  clicks bigint not null default 0,
  spend numeric(18, 6) not null default 0,
  leads bigint not null default 0,
  conversions numeric(18, 6) not null default 0,
  purchases numeric(18, 6) not null default 0,
  conversion_value numeric(18, 6) not null default 0,
  currency_code text not null,
  source_fresh_at timestamptz,
  ingested_at timestamptz not null default now(),
  dimensions jsonb not null default '{}'::jsonb,
  unique (campaign_id, metric_date, platform_placement, device, location_key)
);

create table if not exists public.marketing_funnel_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  lead_id uuid,
  opportunity_id uuid,
  external_event_id text,
  event_type text not null check (event_type in ('lead', 'qualified_lead', 'opportunity', 'customer', 'revenue', 'lost')),
  event_at timestamptz not null,
  value numeric(18, 6),
  currency_code text,
  salesperson_id uuid,
  source_system text not null,
  idempotency_key text not null,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (tenant_id, idempotency_key)
);

create table if not exists public.marketing_attribution_touches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  lead_id uuid,
  opportunity_id uuid,
  campaign_id uuid references public.marketing_campaigns(id) on delete set null,
  provider text,
  source text,
  medium text,
  campaign_name text,
  adset_external_id text,
  ad_external_id text,
  form_external_id text,
  landing_page text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  gclid text,
  gbraid text,
  wbraid text,
  meta_click_id text,
  touch_position integer not null,
  touched_at timestamptz not null,
  properties jsonb not null default '{}'::jsonb
);

create table if not exists public.marketing_alerts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  alert_type text not null,
  severity text not null check (severity in ('info', 'warning', 'critical')),
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved', 'dismissed')),
  title text not null,
  description text not null,
  entity_type text,
  entity_id text,
  metric_name text,
  current_value numeric(18, 6),
  baseline_value numeric(18, 6),
  detected_at timestamptz not null default now(),
  acknowledged_by uuid references auth.users(id) on delete set null,
  acknowledged_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.marketing_mutation_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  provider text not null check (provider in ('meta', 'google_ads')),
  external_account_id text not null,
  external_entity_id text,
  mutation_type text not null check (mutation_type in ('create_campaign', 'pause', 'resume', 'update_budget')),
  status text not null default 'proposed' check (status in ('proposed', 'confirmed', 'executing', 'succeeded', 'failed', 'expired', 'cancelled')),
  before_state jsonb not null default '{}'::jsonb,
  requested_state jsonb not null,
  impact_summary text not null,
  idempotency_key text not null,
  proposed_by uuid references auth.users(id) on delete set null,
  confirmed_by uuid references auth.users(id) on delete set null,
  proposed_at timestamptz not null default now(),
  confirmed_at timestamptz,
  expires_at timestamptz not null,
  executed_at timestamptz,
  provider_request_id text,
  error_message text,
  unique (tenant_id, idempotency_key)
);

create table if not exists public.marketing_audit_log (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_type text not null check (actor_type in ('user', 'system', 'ai')),
  action text not null,
  entity_type text,
  entity_id text,
  request_id text,
  ip_hash text,
  before_state jsonb,
  after_state jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists marketing_campaign_daily_tenant_date_idx
  on public.marketing_campaign_daily (tenant_id, metric_date desc);
create index if not exists marketing_funnel_events_tenant_date_idx
  on public.marketing_funnel_events (tenant_id, event_at desc);
create index if not exists marketing_touches_tenant_lead_idx
  on public.marketing_attribution_touches (tenant_id, lead_id, touch_position);
create index if not exists marketing_alerts_tenant_status_idx
  on public.marketing_alerts (tenant_id, status, detected_at desc);
create index if not exists marketing_audit_tenant_date_idx
  on public.marketing_audit_log (tenant_id, created_at desc);

alter table public.marketing_connections enable row level security;
alter table public.marketing_account_grants enable row level security;
alter table public.marketing_sync_jobs enable row level security;
alter table public.marketing_campaigns enable row level security;
alter table public.marketing_campaign_daily enable row level security;
alter table public.marketing_funnel_events enable row level security;
alter table public.marketing_attribution_touches enable row level security;
alter table public.marketing_alerts enable row level security;
alter table public.marketing_mutation_requests enable row level security;
alter table public.marketing_audit_log enable row level security;

create policy marketing_connections_tenant_select on public.marketing_connections
  for select to authenticated using (public.has_marketing_tenant_access(tenant_id));
create policy marketing_account_grants_tenant_select on public.marketing_account_grants
  for select to authenticated using (public.has_marketing_tenant_access(tenant_id));
create policy marketing_sync_jobs_tenant_select on public.marketing_sync_jobs
  for select to authenticated using (public.has_marketing_tenant_access(tenant_id));
create policy marketing_campaigns_tenant_select on public.marketing_campaigns
  for select to authenticated using (public.has_marketing_tenant_access(tenant_id));
create policy marketing_campaign_daily_tenant_select on public.marketing_campaign_daily
  for select to authenticated using (public.has_marketing_tenant_access(tenant_id));
create policy marketing_funnel_events_tenant_select on public.marketing_funnel_events
  for select to authenticated using (public.has_marketing_tenant_access(tenant_id));
create policy marketing_touches_tenant_select on public.marketing_attribution_touches
  for select to authenticated using (public.has_marketing_tenant_access(tenant_id));
create policy marketing_alerts_tenant_select on public.marketing_alerts
  for select to authenticated using (public.has_marketing_tenant_access(tenant_id));
create policy marketing_mutations_tenant_select on public.marketing_mutation_requests
  for select to authenticated using (public.has_marketing_tenant_access(tenant_id));
create policy marketing_audit_tenant_select on public.marketing_audit_log
  for select to authenticated using (public.has_marketing_tenant_access(tenant_id));

-- Writes are intentionally service-only until server-side permission and audit
-- checks are enabled in later phases. No authenticated INSERT/UPDATE/DELETE
-- policies are created by this foundation migration.
