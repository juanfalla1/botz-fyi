alter table public.subscriptions
alter column current_period_end set default (now() + interval '3 days');

create or replace function public.handle_geo_subscription_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.raw_user_meta_data ->> 'product', '') = 'geo' then
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
  end if;

  return new;
end;
$$;
