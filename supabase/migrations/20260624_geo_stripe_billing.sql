alter table public.subscriptions
  add column if not exists projects_limit integer not null default 1,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_price_id text;

create unique index if not exists idx_geo_subscriptions_stripe_subscription_id
  on public.subscriptions(stripe_subscription_id)
  where stripe_subscription_id is not null;

alter table public.subscriptions
  drop constraint if exists subscriptions_non_negative;

alter table public.subscriptions
  add constraint subscriptions_non_negative check (
    projects_limit >= 0 and audits_limit >= 0 and audits_used >= 0 and prompts_limit >= 0 and prompts_used >= 0
  );

update public.subscriptions
set
  projects_limit = case
    when plan = 'growth' then 5
    when plan = 'enterprise' then 1000000
    else 1
  end,
  audits_limit = case
    when plan = 'starter' then 10
    when plan = 'growth' then 100
    when plan = 'enterprise' then 1000000
    else 3
  end,
  prompts_limit = case
    when plan = 'starter' then 100
    when plan = 'growth' then 1000
    when plan = 'enterprise' then 1000000
    else 25
  end;
