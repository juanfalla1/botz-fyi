-- Datasheet URL for WhatsApp technical file delivery

alter table if exists agent_product_catalog
  add column if not exists datasheet_url text;

create index if not exists idx_agent_product_catalog_datasheet_url
  on agent_product_catalog(datasheet_url);
