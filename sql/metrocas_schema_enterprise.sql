create extension if not exists pgcrypto;

create table if not exists metrocas_datasets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid null,
  created_by uuid null,
  name text,
  file_name text,
  file_type text,
  status text default 'uploaded',
  total_rows integer,
  valid_rows integer,
  invalid_rows integer,
  metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists metrocas_sales_records (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid references metrocas_datasets(id) on delete cascade,
  tenant_id uuid,
  created_by uuid,
  invoice_number text,
  journal text,
  customer_name text,
  state_department text,
  city text,
  country text,
  segment text,
  invoice_date date,
  product_category text,
  product_name text,
  product_line text,
  analytic_distribution text,
  currency text,
  quantity numeric,
  unit_price numeric,
  amount_currency numeric,
  balance numeric,
  analytic_account text,
  origin text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists metrocas_pos_sales_records (like metrocas_sales_records including all);

create table if not exists metrocas_daily_sales (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  created_by uuid,
  dataset_id uuid references metrocas_datasets(id) on delete cascade,
  sale_date date,
  branch text,
  sales_total numeric,
  quantity_total numeric,
  target_daily numeric,
  compliance numeric,
  data jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists metrocas_daily_traffic (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  created_by uuid,
  dataset_id uuid references metrocas_datasets(id) on delete cascade,
  traffic_date date,
  branch text,
  visits integer,
  target_daily integer,
  conversion numeric,
  sales_per_visit numeric,
  data jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists metrocas_hourly_traffic (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  created_by uuid,
  dataset_id uuid references metrocas_datasets(id) on delete cascade,
  day_name text,
  hour_slot text,
  visits integer,
  data jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists metrocas_kpis (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  created_by uuid,
  dataset_id uuid references metrocas_datasets(id) on delete cascade,
  period text,
  total_sales numeric,
  total_margin numeric,
  average_ticket numeric,
  total_customers integer,
  total_products integer,
  active_customers integer,
  inactive_customers integer,
  products_without_rotation integer,
  critical_stock_products integer,
  growth_rate numeric,
  drop_rate numeric,
  data jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists metrocas_rankings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  created_by uuid,
  dataset_id uuid references metrocas_datasets(id) on delete cascade,
  ranking_type text,
  ranking_label text,
  quantity_total numeric,
  balance_total numeric,
  participation numeric,
  ranking_order integer,
  data jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists metrocas_quotes_kpi (
  id uuid primary key default gen_random_uuid(), tenant_id uuid, created_by uuid,
  dataset_id uuid references metrocas_datasets(id) on delete cascade,
  ceco text, branch text, quotes numeric, budget numeric, quotes_goal numeric,
  compliance numeric, approved numeric, effectiveness numeric, notes text, actions text,
  data jsonb, created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists metrocas_new_customers_kpi (
  id uuid primary key default gen_random_uuid(), tenant_id uuid, created_by uuid,
  dataset_id uuid references metrocas_datasets(id) on delete cascade,
  branch text, nit text, customer_name text, invoice_number text, invoice_date date,
  segment text, amount numeric, total_customers integer, total_billed numeric, participation numeric,
  data jsonb, created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists metrocas_market_deepening_kpi (
  id uuid primary key default gen_random_uuid(), tenant_id uuid, created_by uuid,
  dataset_id uuid references metrocas_datasets(id) on delete cascade,
  branch text, telemarketing numeric, telemarketing_target numeric,
  visits numeric, visits_target numeric, telemarketing_compliance numeric,
  visits_compliance numeric, status text, explanation text, corrective_actions text,
  data jsonb, created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists metrocas_annexes (
  id uuid primary key default gen_random_uuid(), tenant_id uuid, created_by uuid,
  dataset_id uuid references metrocas_datasets(id) on delete cascade,
  branch text, observations text, pending_orders integer, delay_days integer,
  net_amount numeric, financial_impact numeric, data jsonb,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists metrocas_work_plans (
  id uuid primary key default gen_random_uuid(), tenant_id uuid, created_by uuid,
  dataset_id uuid references metrocas_datasets(id) on delete cascade,
  branch text, city text, diagnosis text, month_goals text,
  field_work text, telemarketing_plan text, quotes_followup text,
  accounts_followup text, campaigns text, visit_zones text,
  responsible text, priority text, actions text, data jsonb,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists metrocas_ai_insights (
  id uuid primary key default gen_random_uuid(), tenant_id uuid, created_by uuid,
  dataset_id uuid references metrocas_datasets(id) on delete cascade,
  insight_type text, title text, summary text, severity text, recommendation text,
  data jsonb, created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists metrocas_alerts (
  id uuid primary key default gen_random_uuid(), tenant_id uuid, created_by uuid,
  dataset_id uuid references metrocas_datasets(id) on delete cascade,
  alert_type text, severity text, title text, description text, recommendation text,
  status text default 'open', data jsonb, created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists metrocas_recommendations (
  id uuid primary key default gen_random_uuid(), tenant_id uuid, created_by uuid,
  dataset_id uuid references metrocas_datasets(id) on delete cascade,
  recommendation_type text, priority text, title text, description text,
  expected_impact text, action_plan text, data jsonb,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create index if not exists idx_metrocas_sales_dataset on metrocas_sales_records(dataset_id);
create index if not exists idx_metrocas_sales_tenant on metrocas_sales_records(tenant_id);
create index if not exists idx_metrocas_sales_city on metrocas_sales_records(city);
create index if not exists idx_metrocas_sales_customer on metrocas_sales_records(customer_name);
create index if not exists idx_metrocas_sales_product on metrocas_sales_records(product_name);
create index if not exists idx_metrocas_sales_line on metrocas_sales_records(product_line);
create index if not exists idx_metrocas_sales_category on metrocas_sales_records(product_category);
create index if not exists idx_metrocas_sales_journal on metrocas_sales_records(journal);
create index if not exists idx_metrocas_sales_date on metrocas_sales_records(invoice_date);

-- Aplicar RLS y politicas tenant_id + created_by en todas las tablas segun modelo de seguridad del proyecto.
