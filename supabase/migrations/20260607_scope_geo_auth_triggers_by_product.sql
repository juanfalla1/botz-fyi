create or replace function public.handle_geo_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.raw_user_meta_data ->> 'product_key', new.raw_app_meta_data ->> 'product_key', 'geo') <> 'geo' then
    return new;
  end if;

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

create or replace function public.handle_geo_subscription_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.raw_user_meta_data ->> 'product_key', new.raw_app_meta_data ->> 'product_key', 'geo') <> 'geo' then
    return new;
  end if;

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

create or replace function public.handle_geo_workspace_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
begin
  if coalesce(new.raw_user_meta_data ->> 'product_key', new.raw_app_meta_data ->> 'product_key', 'geo') <> 'geo' then
    return new;
  end if;

  insert into public.workspaces (owner_user_id, name, slug)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'company_name', 'My Workspace'), 'ws-' || substring(replace(new.id::text, '-', ''), 1, 8))
  returning id into v_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_workspace_id, new.id, 'owner')
  on conflict (workspace_id, user_id) do nothing;

  return new;
end;
$$;
