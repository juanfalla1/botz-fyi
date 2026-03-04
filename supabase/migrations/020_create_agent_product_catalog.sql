-- Product catalog for technical sales agents (Avanza and others)

create table if not exists agent_product_catalog (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'avanza',
  brand text,
  category text,
  name text not null,
  slug text,
  product_url text not null,
  image_url text,
  summary text,
  description text,
  standards text[] default '{}',
  methods text[] default '{}',
  specs_text text,
  specs_json jsonb not null default '{}'::jsonb,
  source_payload jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, product_url)
);

create table if not exists agent_product_variants (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references agent_product_catalog(id) on delete cascade,
  sku text,
  variant_name text,
  range_text text,
  attributes jsonb not null default '{}'::jsonb,
  raw_row jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_agent_product_catalog_tenant on agent_product_catalog(tenant_id);
create index if not exists idx_agent_product_catalog_created_by on agent_product_catalog(created_by);
create index if not exists idx_agent_product_catalog_provider on agent_product_catalog(provider);
create index if not exists idx_agent_product_catalog_brand on agent_product_catalog(brand);
create index if not exists idx_agent_product_catalog_category on agent_product_catalog(category);
create index if not exists idx_agent_product_catalog_name on agent_product_catalog(name);
create index if not exists idx_agent_product_variants_catalog on agent_product_variants(catalog_id);

alter table agent_product_catalog enable row level security;
alter table agent_product_variants enable row level security;

create policy if not exists "Users can view own catalog" on agent_product_catalog
  for select using (
    created_by = auth.uid() or
    exists (select 1 from platform_admins where auth_user_id = auth.uid())
  );

create policy if not exists "Users can insert own catalog" on agent_product_catalog
  for insert with check (
    created_by = auth.uid() or
    exists (select 1 from platform_admins where auth_user_id = auth.uid())
  );

create policy if not exists "Users can update own catalog" on agent_product_catalog
  for update using (
    created_by = auth.uid() or
    exists (select 1 from platform_admins where auth_user_id = auth.uid())
  );

create policy if not exists "Users can delete own catalog" on agent_product_catalog
  for delete using (
    created_by = auth.uid() or
    exists (select 1 from platform_admins where auth_user_id = auth.uid())
  );

create policy if not exists "Users can view own catalog variants" on agent_product_variants
  for select using (
    exists (
      select 1
      from agent_product_catalog c
      where c.id = catalog_id
        and (
          c.created_by = auth.uid() or
          exists (select 1 from platform_admins where auth_user_id = auth.uid())
        )
    )
  );

create policy if not exists "Users can insert own catalog variants" on agent_product_variants
  for insert with check (
    exists (
      select 1
      from agent_product_catalog c
      where c.id = catalog_id
        and (
          c.created_by = auth.uid() or
          exists (select 1 from platform_admins where auth_user_id = auth.uid())
        )
    )
  );

create policy if not exists "Users can update own catalog variants" on agent_product_variants
  for update using (
    exists (
      select 1
      from agent_product_catalog c
      where c.id = catalog_id
        and (
          c.created_by = auth.uid() or
          exists (select 1 from platform_admins where auth_user_id = auth.uid())
        )
    )
  );

create policy if not exists "Users can delete own catalog variants" on agent_product_variants
  for delete using (
    exists (
      select 1
      from agent_product_catalog c
      where c.id = catalog_id
        and (
          c.created_by = auth.uid() or
          exists (select 1 from platform_admins where auth_user_id = auth.uid())
        )
    )
  );
