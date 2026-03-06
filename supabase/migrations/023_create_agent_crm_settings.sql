-- CRM settings per Agents client (owner)

create table if not exists agent_crm_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  stage_labels jsonb not null default '{"draft":"Nuevo","sent":"Cotizacion enviada","won":"Ganado","lost":"Perdido"}'::jsonb,
  contact_fields jsonb not null default '[{"key":"name","label":"Nombre","visible":true,"required":true},{"key":"email","label":"Email","visible":true,"required":true},{"key":"phone","label":"Telefono","visible":true,"required":true},{"key":"company","label":"Empresa","visible":true,"required":false},{"key":"quotes_count","label":"Cotizaciones","visible":true,"required":false},{"key":"last_activity_at","label":"Ultima actividad","visible":true,"required":false}]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (created_by)
);

create index if not exists idx_agent_crm_settings_owner on agent_crm_settings(created_by);

alter table agent_crm_settings enable row level security;

create policy if not exists "Users can view own crm settings" on agent_crm_settings
  for select using (
    created_by = auth.uid() or exists (select 1 from platform_admins where auth_user_id = auth.uid())
  );

create policy if not exists "Users can insert own crm settings" on agent_crm_settings
  for insert with check (
    created_by = auth.uid() or exists (select 1 from platform_admins where auth_user_id = auth.uid())
  );

create policy if not exists "Users can update own crm settings" on agent_crm_settings
  for update using (
    created_by = auth.uid() or exists (select 1 from platform_admins where auth_user_id = auth.uid())
  );

create policy if not exists "Users can delete own crm settings" on agent_crm_settings
  for delete using (
    created_by = auth.uid() or exists (select 1 from platform_admins where auth_user_id = auth.uid())
  );

create or replace function set_agent_crm_settings_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_agent_crm_settings_updated_at on agent_crm_settings;
create trigger trg_agent_crm_settings_updated_at
before update on agent_crm_settings
for each row execute function set_agent_crm_settings_updated_at();
