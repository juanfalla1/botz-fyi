create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'geo_plan') then
    create type public.geo_plan as enum ('trial', 'starter', 'growth', 'enterprise');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'geo_subscription_status') then
    create type public.geo_subscription_status as enum ('active', 'inactive', 'canceled', 'past_due');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'geo_usage_event_type') then
    create type public.geo_usage_event_type as enum ('geo_audit_created', 'prompt_used', 'report_exported');
  end if;
end
$$;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  plan public.geo_plan not null default 'trial',
  status public.geo_subscription_status not null default 'active',
  audits_limit integer not null default 3,
  audits_used integer not null default 0,
  prompts_limit integer not null default 25,
  prompts_used integer not null default 0,
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null default (now() + interval '3 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_non_negative check (
    audits_limit >= 0 and audits_used >= 0 and prompts_limit >= 0 and prompts_used >= 0
  )
);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type public.geo_usage_event_type not null,
  amount integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint usage_events_amount_positive check (amount > 0)
);

create index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);
create index if not exists idx_usage_events_user_created on public.usage_events(user_id, created_at desc);

create or replace function public.set_updated_at_subscription()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_subscription on public.subscriptions;
create trigger set_updated_at_subscription
before update on public.subscriptions
for each row
execute function public.set_updated_at_subscription();

create or replace function public.handle_geo_subscription_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.subscriptions (
    user_id,
    plan,
    status,
    audits_limit,
    audits_used,
    prompts_limit,
    prompts_used,
    current_period_start,
    current_period_end
  ) values (
    new.id,
    'trial',
    'active',
    3,
    0,
    25,
    0,
    now(),
    now() + interval '3 days'
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_geo_subscription on auth.users;
create trigger on_auth_user_created_geo_subscription
after insert on auth.users
for each row execute function public.handle_geo_subscription_new_user();

alter table public.subscriptions enable row level security;
alter table public.usage_events enable row level security;

drop policy if exists subscriptions_owner_select on public.subscriptions;
create policy subscriptions_owner_select on public.subscriptions
for select using (auth.uid() = user_id);

drop policy if exists subscriptions_owner_insert on public.subscriptions;
create policy subscriptions_owner_insert on public.subscriptions
for insert with check (auth.uid() = user_id);

drop policy if exists subscriptions_owner_update on public.subscriptions;
create policy subscriptions_owner_update on public.subscriptions
for update using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists usage_events_owner_select on public.usage_events;
create policy usage_events_owner_select on public.usage_events
for select using (auth.uid() = user_id);

drop policy if exists usage_events_owner_insert on public.usage_events;
create policy usage_events_owner_insert on public.usage_events
for insert with check (auth.uid() = user_id);
