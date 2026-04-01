-- CRM extension: document registry + channel linkage

create table if not exists agent_crm_contact_channels (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  contact_id uuid not null references agent_crm_contacts(id) on delete cascade,
  channel text not null,
  channel_key text not null,
  is_primary boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (created_by, channel, channel_key)
);

create index if not exists idx_agent_crm_contact_channels_owner_contact
  on agent_crm_contact_channels(created_by, contact_id, updated_at desc);

alter table if exists agent_crm_contact_channels enable row level security;

create policy if not exists "Users can view own crm contact channels" on agent_crm_contact_channels
  for select using (
    created_by = auth.uid() or exists (select 1 from platform_admins where auth_user_id = auth.uid())
  );

create policy if not exists "Users can insert own crm contact channels" on agent_crm_contact_channels
  for insert with check (
    created_by = auth.uid() or exists (select 1 from platform_admins where auth_user_id = auth.uid())
  );

create policy if not exists "Users can update own crm contact channels" on agent_crm_contact_channels
  for update using (
    created_by = auth.uid() or exists (select 1 from platform_admins where auth_user_id = auth.uid())
  );

create policy if not exists "Users can delete own crm contact channels" on agent_crm_contact_channels
  for delete using (
    created_by = auth.uid() or exists (select 1 from platform_admins where auth_user_id = auth.uid())
  );

create table if not exists agent_crm_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  contact_id uuid references agent_crm_contacts(id) on delete set null,
  quote_draft_id uuid references agent_quote_drafts(id) on delete set null,
  doc_type text not null default 'other',
  bucket_name text not null,
  file_path text not null,
  file_name text not null,
  mime_type text,
  file_size_bytes bigint,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_agent_crm_documents_owner_contact
  on agent_crm_documents(created_by, contact_id, created_at desc);

create index if not exists idx_agent_crm_documents_owner_quote
  on agent_crm_documents(created_by, quote_draft_id, created_at desc);

alter table if exists agent_crm_documents enable row level security;

create policy if not exists "Users can view own crm documents" on agent_crm_documents
  for select using (
    created_by = auth.uid() or exists (select 1 from platform_admins where auth_user_id = auth.uid())
  );

create policy if not exists "Users can insert own crm documents" on agent_crm_documents
  for insert with check (
    created_by = auth.uid() or exists (select 1 from platform_admins where auth_user_id = auth.uid())
  );

create policy if not exists "Users can update own crm documents" on agent_crm_documents
  for update using (
    created_by = auth.uid() or exists (select 1 from platform_admins where auth_user_id = auth.uid())
  );

create policy if not exists "Users can delete own crm documents" on agent_crm_documents
  for delete using (
    created_by = auth.uid() or exists (select 1 from platform_admins where auth_user_id = auth.uid())
  );

create or replace function set_agent_crm_contact_channels_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_agent_crm_contact_channels_updated_at on agent_crm_contact_channels;
create trigger trg_agent_crm_contact_channels_updated_at
before update on agent_crm_contact_channels
for each row execute function set_agent_crm_contact_channels_updated_at();

create or replace function set_agent_crm_documents_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_agent_crm_documents_updated_at on agent_crm_documents;
create trigger trg_agent_crm_documents_updated_at
before update on agent_crm_documents
for each row execute function set_agent_crm_documents_updated_at();
