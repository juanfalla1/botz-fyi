create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  locale text not null default 'es',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_geo_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(nullif(excluded.full_name, ''), public.users.full_name),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_geo on auth.users;
create trigger on_auth_user_created_geo
after insert on auth.users
for each row execute function public.handle_geo_new_user();

alter table public.users enable row level security;

drop policy if exists users_owner_select on public.users;
create policy users_owner_select on public.users
for select
using (auth.uid() = id);

drop policy if exists users_owner_update on public.users;
create policy users_owner_update on public.users
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create table if not exists public.competitors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  name text not null,
  domain text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  audit_id uuid references public.geo_audits(id) on delete cascade,
  name text not null,
  report_type text not null,
  status text not null default 'ready',
  file_url text,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.competitors enable row level security;
alter table public.reports enable row level security;

drop policy if exists competitors_owner_select on public.competitors;
create policy competitors_owner_select on public.competitors
for select using (auth.uid() = user_id);

drop policy if exists competitors_owner_insert on public.competitors;
create policy competitors_owner_insert on public.competitors
for insert with check (auth.uid() = user_id);

drop policy if exists competitors_owner_update on public.competitors;
create policy competitors_owner_update on public.competitors
for update using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists competitors_owner_delete on public.competitors;
create policy competitors_owner_delete on public.competitors
for delete using (auth.uid() = user_id);

drop policy if exists reports_owner_select on public.reports;
create policy reports_owner_select on public.reports
for select using (auth.uid() = user_id);

drop policy if exists reports_owner_insert on public.reports;
create policy reports_owner_insert on public.reports
for insert with check (auth.uid() = user_id);

drop policy if exists reports_owner_update on public.reports;
create policy reports_owner_update on public.reports
for update using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists reports_owner_delete on public.reports;
create policy reports_owner_delete on public.reports
for delete using (auth.uid() = user_id);
