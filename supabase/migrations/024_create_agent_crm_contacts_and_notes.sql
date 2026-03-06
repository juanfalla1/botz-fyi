-- Contact-level CRM data for Agents (assignment, next action, bitacora)

create table if not exists agent_crm_contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  contact_key text not null,
  name text,
  email text,
  phone text,
  company text,
  assigned_agent_id uuid references ai_agents(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','sent','won','lost')),
  next_action text,
  next_action_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (created_by, contact_key)
);

create table if not exists agent_crm_notes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  contact_id uuid not null references agent_crm_contacts(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_agent_crm_contacts_owner_updated on agent_crm_contacts(created_by, updated_at desc);
create index if not exists idx_agent_crm_notes_contact_created on agent_crm_notes(contact_id, created_at desc);

alter table agent_crm_contacts enable row level security;
alter table agent_crm_notes enable row level security;

create policy if not exists "Users can view own crm contacts" on agent_crm_contacts
  for select using (
    created_by = auth.uid() or exists (select 1 from platform_admins where auth_user_id = auth.uid())
  );

create policy if not exists "Users can insert own crm contacts" on agent_crm_contacts
  for insert with check (
    created_by = auth.uid() or exists (select 1 from platform_admins where auth_user_id = auth.uid())
  );

create policy if not exists "Users can update own crm contacts" on agent_crm_contacts
  for update using (
    created_by = auth.uid() or exists (select 1 from platform_admins where auth_user_id = auth.uid())
  );

create policy if not exists "Users can delete own crm contacts" on agent_crm_contacts
  for delete using (
    created_by = auth.uid() or exists (select 1 from platform_admins where auth_user_id = auth.uid())
  );

create policy if not exists "Users can view own crm notes" on agent_crm_notes
  for select using (
    created_by = auth.uid() or exists (select 1 from platform_admins where auth_user_id = auth.uid())
  );

create policy if not exists "Users can insert own crm notes" on agent_crm_notes
  for insert with check (
    created_by = auth.uid() or exists (select 1 from platform_admins where auth_user_id = auth.uid())
  );

create policy if not exists "Users can update own crm notes" on agent_crm_notes
  for update using (
    created_by = auth.uid() or exists (select 1 from platform_admins where auth_user_id = auth.uid())
  );

create policy if not exists "Users can delete own crm notes" on agent_crm_notes
  for delete using (
    created_by = auth.uid() or exists (select 1 from platform_admins where auth_user_id = auth.uid())
  );

create or replace function set_agent_crm_contacts_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_agent_crm_contacts_updated_at on agent_crm_contacts;
create trigger trg_agent_crm_contacts_updated_at
before update on agent_crm_contacts
for each row execute function set_agent_crm_contacts_updated_at();
