alter table public.subscriptions
add column if not exists metadata jsonb not null default '{}'::jsonb;
