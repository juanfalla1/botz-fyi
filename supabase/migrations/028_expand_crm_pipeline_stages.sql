-- Expand CRM pipeline to 5 customer-requested stages.

alter table if exists agent_crm_settings
  alter column stage_labels set default
  '{"analysis":"Analisis de necesidad","study":"Estudio","quote":"Cotizacion","purchase_order":"Orden de compra","invoicing":"Facturacion"}'::jsonb;

update agent_crm_settings
set stage_labels = jsonb_strip_nulls(
  jsonb_build_object(
    'analysis', coalesce(nullif(stage_labels->>'analysis', ''), nullif(stage_labels->>'draft', ''), 'Analisis de necesidad'),
    'study', coalesce(nullif(stage_labels->>'study', ''), 'Estudio'),
    'quote', coalesce(nullif(stage_labels->>'quote', ''), nullif(stage_labels->>'sent', ''), 'Cotizacion'),
    'purchase_order', coalesce(nullif(stage_labels->>'purchase_order', ''), nullif(stage_labels->>'won', ''), 'Orden de compra'),
    'invoicing', coalesce(nullif(stage_labels->>'invoicing', ''), nullif(stage_labels->>'lost', ''), 'Facturacion')
  )
)
where stage_labels is not null;

update agent_quote_drafts
set status = case
  when status = 'draft' then 'analysis'
  when status = 'sent' then 'quote'
  when status = 'won' then 'purchase_order'
  when status = 'lost' then 'invoicing'
  else status
end
where status in ('draft', 'sent', 'won', 'lost');

update agent_crm_contacts
set status = case
  when status = 'draft' then 'analysis'
  when status = 'sent' then 'quote'
  when status = 'won' then 'purchase_order'
  when status = 'lost' then 'invoicing'
  else status
end
where status in ('draft', 'sent', 'won', 'lost');

alter table if exists agent_quote_drafts
  alter column status set default 'analysis';

alter table if exists agent_crm_contacts
  alter column status set default 'analysis';

do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'agent_quote_drafts'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table agent_quote_drafts drop constraint %I', c.conname);
  end loop;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'agent_quote_drafts_status_check'
      and conrelid = 'agent_quote_drafts'::regclass
  ) then
    alter table agent_quote_drafts
      add constraint agent_quote_drafts_status_check
      check (status in ('analysis','study','quote','purchase_order','invoicing'));
  end if;
end$$;

do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'agent_crm_contacts'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table agent_crm_contacts drop constraint %I', c.conname);
  end loop;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'agent_crm_contacts_status_check'
      and conrelid = 'agent_crm_contacts'::regclass
  ) then
    alter table agent_crm_contacts
      add constraint agent_crm_contacts_status_check
      check (status in ('analysis','study','quote','purchase_order','invoicing'));
  end if;
end$$;
