-- Optional pricing fields for catalog products

alter table if exists agent_product_catalog
  add column if not exists base_price_usd numeric(18,2);

alter table if exists agent_product_catalog
  add column if not exists price_currency text not null default 'USD';

alter table if exists agent_product_catalog
  add column if not exists last_price_update timestamptz;

create index if not exists idx_agent_product_catalog_base_price_usd
  on agent_product_catalog(base_price_usd);
