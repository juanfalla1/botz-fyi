![Botz Logo](../../public/botz-logo.png)

# Botz - Seguridad y Privacidad

## Principios
- Minimo privilegio (roles)
- Separacion de secretos (server env vs public env)
- Auditoria (bitacora)

## Datos sensibles
- PII: nombres, telefonos, correos
- Acceso restringido por tenant y rol

## Variables de entorno
- Publicas (frontend): `NEXT_PUBLIC_*`
- Privadas (server): Stripe secret, Supabase service role, etc.
- Nunca commitear `.env.local`.

## Recomendaciones
- Rotacion de claves
- 2FA para admins
- Registro de sesiones

## Hallazgos y correcciones

### Vinculacion team_members <-> auth.users
Problema visto en produccion: filas en `public.team_members` con `auth_user_id` en NULL. Eso rompe la deteccion de rol y puede provocar:
- Asignacion incorrecta de rol/tenant en el frontend.
- Filtros incompletos (por ejemplo, SLA/Kanban) si el sistema no puede resolver `teamMemberId`.

Correccion aplicada en la app:
- Al resolver rol por email, si `auth_user_id` esta NULL se vincula automaticamente al usuario autenticado.
- Al crear asesores desde Team Management, se guarda `auth_user_id` cuando Supabase Auth devuelve el `user.id`.

Backfill recomendado (ejecutar en SQL Editor de Supabase):

```sql
update public.team_members tm
set auth_user_id = u.id
from auth.users u
where tm.auth_user_id is null
  and tm.email is not null
  and lower(tm.email) = lower(u.email);
```

## RLS (Row Level Security) - Imprescindible
El frontend ayuda, pero la seguridad real debe vivir en la base de datos.

### Politicas recomendadas (leads)
Supuesto: `public.leads` tiene `tenant_id`, `asesor_id`, `assigned_to`. `public.team_members` tiene `id`, `auth_user_id`, `tenant_id`, `rol`, `activo`.

Habilitar RLS:

```sql
alter table public.leads enable row level security;
```

Select (admin ve todo su tenant; asesor solo sus leads):

```sql
create policy leads_select_by_tenant_and_role
on public.leads
for select
using (
  exists (
    select 1
    from public.team_members tm
    where tm.auth_user_id = auth.uid()
      and tm.tenant_id = leads.tenant_id
      and coalesce(tm.activo, true) = true
      and (
        tm.rol = 'admin'
        or leads.asesor_id = tm.id
        or leads.assigned_to = tm.id
      )
  )
);
```

### Bitacora (lead_logs)
Si `public.lead_logs` referencia `lead_id`, aplicar la misma restriccion via join a `leads`:

```sql
alter table public.lead_logs enable row level security;

create policy lead_logs_select_by_lead_access
on public.lead_logs
for select
using (
  exists (
    select 1
    from public.leads l
    join public.team_members tm
      on tm.auth_user_id = auth.uid()
     and tm.tenant_id = l.tenant_id
     and coalesce(tm.activo, true) = true
    where l.id = lead_logs.lead_id
      and (
        tm.rol = 'admin'
        or l.asesor_id = tm.id
        or l.assigned_to = tm.id
      )
  )
);
```

Nota: si existe un rol "platform admin" (tabla `platform_admins` / RPC `is_platform_admin()`), conviene agregar un OR que permita acceso total solo a ese rol, manteniendo las politicas por tenant para el resto.
