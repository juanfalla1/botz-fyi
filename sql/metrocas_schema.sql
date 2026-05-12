create extension if not exists pgcrypto;

create table if not exists metrocas_leads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid null,
  created_by uuid null,
  name text not null,
  company text,
  email text not null,
  whatsapp text,
  sector text,
  company_size text,
  current_system text,
  message text,
  source text default 'metrocas_landing',
  created_at timestamptz default now()
);

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
  created_at timestamptz default now()
);

create table if not exists metrocas_sales_records (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid references metrocas_datasets(id) on delete cascade,
  tenant_id uuid null,
  sale_date date,
  customer_name text,
  product_name text,
  category text,
  quantity numeric,
  unit_price numeric,
  unit_cost numeric,
  total_sale numeric,
  gross_margin numeric,
  gross_margin_percent numeric,
  stock_current numeric,
  seller text,
  country text default 'Colombia',
  department text,
  city text,
  region text,
  channel text,
  raw_data jsonb,
  created_at timestamptz default now()
);

create table if not exists metrocas_kpis (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid references metrocas_datasets(id) on delete cascade,
  tenant_id uuid null,
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
  created_at timestamptz default now()
);

create table if not exists metrocas_ai_insights (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid references metrocas_datasets(id) on delete cascade,
  tenant_id uuid null,
  insight_type text,
  title text,
  summary text,
  severity text,
  recommendation text,
  data jsonb,
  created_at timestamptz default now()
);

create table if not exists metrocas_recommendations (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid references metrocas_datasets(id) on delete cascade,
  tenant_id uuid null,
  recommendation_type text,
  priority text,
  title text,
  description text,
  expected_impact text,
  action_plan text,
  data jsonb,
  created_at timestamptz default now()
);

create table if not exists metrocas_alerts (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid references metrocas_datasets(id) on delete cascade,
  tenant_id uuid null,
  alert_type text,
  severity text,
  title text,
  description text,
  recommendation text,
  status text default 'open',
  data jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_metrocas_leads_tenant_id on metrocas_leads(tenant_id);
create index if not exists idx_metrocas_datasets_tenant_id on metrocas_datasets(tenant_id);
create index if not exists idx_metrocas_sales_dataset_id on metrocas_sales_records(dataset_id);
create index if not exists idx_metrocas_sales_tenant_id on metrocas_sales_records(tenant_id);
create index if not exists idx_metrocas_sales_sale_date on metrocas_sales_records(sale_date);
create index if not exists idx_metrocas_sales_customer_name on metrocas_sales_records(customer_name);
create index if not exists idx_metrocas_sales_product_name on metrocas_sales_records(product_name);
create index if not exists idx_metrocas_sales_category on metrocas_sales_records(category);
create index if not exists idx_metrocas_sales_seller on metrocas_sales_records(seller);
create index if not exists idx_metrocas_sales_city on metrocas_sales_records(city);
create index if not exists idx_metrocas_sales_department on metrocas_sales_records(department);
create index if not exists idx_metrocas_sales_region on metrocas_sales_records(region);
create index if not exists idx_metrocas_sales_country on metrocas_sales_records(country);
create index if not exists idx_metrocas_sales_channel on metrocas_sales_records(channel);
create index if not exists idx_metrocas_kpis_tenant_id on metrocas_kpis(tenant_id);
create index if not exists idx_metrocas_kpis_dataset_id on metrocas_kpis(dataset_id);
create index if not exists idx_metrocas_ai_tenant_id on metrocas_ai_insights(tenant_id);
create index if not exists idx_metrocas_ai_dataset_id on metrocas_ai_insights(dataset_id);
create index if not exists idx_metrocas_reco_tenant_id on metrocas_recommendations(tenant_id);
create index if not exists idx_metrocas_reco_dataset_id on metrocas_recommendations(dataset_id);
create index if not exists idx_metrocas_alerts_tenant_id on metrocas_alerts(tenant_id);
create index if not exists idx_metrocas_alerts_dataset_id on metrocas_alerts(dataset_id);

alter table metrocas_leads enable row level security;
alter table metrocas_datasets enable row level security;
alter table metrocas_sales_records enable row level security;
alter table metrocas_kpis enable row level security;
alter table metrocas_ai_insights enable row level security;
alter table metrocas_recommendations enable row level security;
alter table metrocas_alerts enable row level security;

drop policy if exists metrocas_multi_tenant_datasets on metrocas_datasets;
create policy metrocas_multi_tenant_datasets on metrocas_datasets
  for all using (
    tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', tenant_id::text)
    and (created_by is null or created_by = auth.uid())
  ) with check (
    tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', tenant_id::text)
    and (created_by is null or created_by = auth.uid())
  );

-- Replicar la misma politica de tenant_id/created_by en las tablas restantes.
