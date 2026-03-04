-- Sales support tables for AI agents (TRM cache + quote drafts)

create table if not exists agent_fx_rates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  rate_date date not null,
  from_currency text not null default 'USD',
  to_currency text not null default 'COP',
  rate numeric(18,6) not null,
  source text,
  source_url text,
  created_at timestamptz not null default now(),
  unique (tenant_id, rate_date, from_currency, to_currency)
);

create table if not exists agent_quote_drafts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  agent_id uuid references ai_agents(id) on delete set null,
  customer_name text,
  customer_email text,
  customer_phone text,
  company_name text,
  location text,
  product_catalog_id uuid references agent_product_catalog(id) on delete set null,
  product_name text,
  base_price_usd numeric(18,2),
  trm_rate numeric(18,6),
  total_cop numeric(18,2),
  notes text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','sent','won','lost')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_agent_fx_rates_tenant_date on agent_fx_rates(tenant_id, rate_date desc);
create index if not exists idx_agent_quote_drafts_tenant_created on agent_quote_drafts(tenant_id, created_at desc);
create index if not exists idx_agent_quote_drafts_customer_email on agent_quote_drafts(customer_email);

alter table agent_fx_rates enable row level security;
alter table agent_quote_drafts enable row level security;

create policy if not exists "Users can view own fx rates" on agent_fx_rates
  for select using (
    created_by = auth.uid() or exists (select 1 from platform_admins where auth_user_id = auth.uid())
  );

create policy if not exists "Users can insert own fx rates" on agent_fx_rates
  for insert with check (
    created_by = auth.uid() or exists (select 1 from platform_admins where auth_user_id = auth.uid())
  );

create policy if not exists "Users can update own fx rates" on agent_fx_rates
  for update using (
    created_by = auth.uid() or exists (select 1 from platform_admins where auth_user_id = auth.uid())
  );

create policy if not exists "Users can delete own fx rates" on agent_fx_rates
  for delete using (
    created_by = auth.uid() or exists (select 1 from platform_admins where auth_user_id = auth.uid())
  );

create policy if not exists "Users can view own quote drafts" on agent_quote_drafts
  for select using (
    created_by = auth.uid() or exists (select 1 from platform_admins where auth_user_id = auth.uid())
  );

create policy if not exists "Users can insert own quote drafts" on agent_quote_drafts
  for insert with check (
    created_by = auth.uid() or exists (select 1 from platform_admins where auth_user_id = auth.uid())
  );

create policy if not exists "Users can update own quote drafts" on agent_quote_drafts
  for update using (
    created_by = auth.uid() or exists (select 1 from platform_admins where auth_user_id = auth.uid())
  );

create policy if not exists "Users can delete own quote drafts" on agent_quote_drafts
  for delete using (
    created_by = auth.uid() or exists (select 1 from platform_admins where auth_user_id = auth.uid())
  );
