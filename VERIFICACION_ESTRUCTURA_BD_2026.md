# Verificación de Estructura Base de Datos - Botz Platform
**Fecha:** 2026-02-18  
**Analista:** Sistema de Verificación Automático  
**Versión:** 1.0

---

## Tabla de Contenidos
1. [Estructura de Tabla `tenants`](#tenants)
2. [Estructura de Tabla `admin_invites`](#admin-invites)
3. [Mecanismos de Expiración](#expiración)
4. [Validación de Acceso (Feature Gating)](#feature-gating)
5. [Estructura `team_members` y Relación con Tenant](#team-members)
6. [Hallazgos y Recomendaciones](#hallazgos)

---

## Estructura de Tabla `tenants` {#tenants}

### Estado: ⚠️ FALTANTE
La tabla `tenants` está **referenciada en migraciones pero NO CREADA**.

### Ubicación Recomendada para Migración
`supabase/migrations/000_create_tenants_table.sql`

### Campos Esperados (Inferidos)

```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificación
  tenant_id TEXT NOT NULL UNIQUE,                 -- Identificador público
  empresa TEXT NOT NULL,                          -- Nombre de empresa
  email TEXT NOT NULL,                            -- Email de contacto
  telefono TEXT,
  
  -- Plan y Suscripción
  plan TEXT DEFAULT 'free',                       -- 'free'|'growth'|'pro'|'scale'|'prime'
  status TEXT DEFAULT 'active',                   -- 'active'|'paused'|'cancelled'|'trial'
  
  -- Trial
  trial_start TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,
  
  -- Auditoría
  source TEXT,                                    -- Origen: 'signup', 'import', 'api', etc
  auth_user_id UUID REFERENCES auth.users(id),   -- Owner del tenant
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices recomendados
CREATE INDEX idx_tenants_tenant_id ON tenants(tenant_id);
CREATE INDEX idx_tenants_email ON tenants(email);
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_auth_user_id ON tenants(auth_user_id);
CREATE INDEX idx_tenants_plan ON tenants(plan);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_tenants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenants_updated_at 
BEFORE UPDATE ON tenants 
FOR EACH ROW EXECUTE FUNCTION update_tenants_updated_at();

-- RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant" ON tenants
  FOR SELECT USING (
    auth_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM platform_admins WHERE auth_user_id = auth.uid())
  );
```

### Referencias en Código
- `supabase/migrations/011_create_ai_agents_system.sql:7` - `REFERENCES tenants(id) ON DELETE CASCADE`
- `supabase/migrations/020240211_add_tenant_id_to_team_members.sql:25` - FK constraint
- `app/api/platform/tenants/route.ts:72` - Query to tenants table

---

## Estructura de Tabla `admin_invites` {#admin-invites}

### Ubicación
`supabase/migrations/009_create_admin_invites_table.sql`

### Schema Completo

```sql
CREATE TABLE IF NOT EXISTS admin_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,                            -- Email del invitado
  role TEXT NOT NULL DEFAULT 'developer',         -- 'developer'|'guest'|'support'
  status TEXT NOT NULL DEFAULT 'pending',         -- 'pending'|'accepted'|'rejected'|'revoked'
  access_level TEXT NOT NULL DEFAULT 'full',      -- 'full'|'readonly'|'limited'
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,            -- 7 días por defecto
  notes TEXT,
  UNIQUE(email)
);

CREATE INDEX idx_admin_invites_email ON admin_invites(email);
CREATE INDEX idx_admin_invites_status ON admin_invites(status);
CREATE INDEX idx_admin_invites_created_by ON admin_invites(created_by);
CREATE INDEX idx_admin_invites_expires_at ON admin_invites(expires_at);

ALTER TABLE admin_invites ENABLE ROW LEVEL SECURITY;

-- Solo platform admins pueden ver
CREATE POLICY "Platform admins can view all invites" ON admin_invites
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM platform_admins WHERE auth_user_id = auth.uid()
  ));

-- Solo platform admins pueden crear
CREATE POLICY "Platform admins can create invites" ON admin_invites
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM platform_admins WHERE auth_user_id = auth.uid()
  ));

-- Solo platform admins pueden actualizar
CREATE POLICY "Platform admins can update invites" ON admin_invites
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM platform_admins WHERE auth_user_id = auth.uid()
  ));

-- Solo platform admins pueden eliminar
CREATE POLICY "Platform admins can delete invites" ON admin_invites
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM platform_admins WHERE auth_user_id = auth.uid()
  ));
```

### Campos Disponibles

| Campo | Tipo | Restricción | Descripción |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Identificador único |
| `email` | TEXT | NOT NULL, UNIQUE | Email del invitado |
| `role` | TEXT | DEFAULT 'developer' | 'developer', 'guest', 'support' |
| `status` | TEXT | DEFAULT 'pending' | 'pending', 'accepted', 'rejected', 'revoked' |
| `access_level` | TEXT | DEFAULT 'full' | 'full', 'readonly', 'limited' |
| `created_by` | UUID | FK auth.users | Quién creó la invitación |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Cuándo se creó |
| `expires_at` | TIMESTAMP | NULLABLE | Fecha de expiración (7 días) |
| `notes` | TEXT | NULLABLE | Notas opcionales |

### Flujo de Creación

```typescript
// app/api/platform/admin-invites/route.ts - POST

// 1. Validar que sea Platform Admin
const isAdmin = await isPlatformAdmin(user.id);
if (!isAdmin) return { status: 403, error: "Only platform admins can create invites" };

// 2. Crear registro
const { data: inviteData } = await supabase
  .from("admin_invites")
  .insert({
    email,           // Email del invitado
    role,            // 'developer'|'guest'|'support'
    access_level,    // 'full'|'readonly'|'limited'
    created_by: user.id,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),  // +7 dias
    notes
  })
  .select()
  .single();

// 3. Enviar email
const emailSent = await sendInviteEmail(email, inviteData.id, role, access_level);

// 4. Retornar
return { id: inviteData.id, email, role, emailSent, message: "..." };
```

---

## Mecanismos de Expiración {#expiración}

### A) Admin Invites - 7 Días

**Campo:** `expires_at` (TIMESTAMP WITH TIME ZONE)

**Cálculo:**
```typescript
expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
// O en SQL: NOW() + INTERVAL '7 days'
```

**Validación:**
```typescript
// app/api/platform/admin-invites/validate/route.ts
if (new Date(invite.expires_at) < new Date()) {
  return { error: "Invitation expired", status: "expired" };
}
```

**Acción:** Rechazar aceptación de invitación expirada

**Limpieza:** ⚠️ **NO IMPLEMENTADA** - Faltan registros expirados en BD

---

### B) Trial Period (Agent Entitlements) - 3 Días

**Tabla:** `agent_entitlements`

**Campos:**
```sql
trial_start TIMESTAMP WITH TIME ZONE,
trial_end TIMESTAMP WITH TIME ZONE,
status TEXT CHECK (status IN ('trial', 'active', 'blocked'))
```

**Cálculo:**
```typescript
// app/api/agents/entitlement/route.ts
const TRIAL_DAYS = 3;
const trialStart = new Date();
const trialEnd = new Date(trialStart.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

// Almacenar
{
  user_id: authUserId,
  plan_key: 'pro',
  status: 'trial',
  credits_limit: 100000,
  trial_start: trialStart.toISOString(),
  trial_end: trialEnd.toISOString()
}
```

**Validación:**
```typescript
if (String(status) === 'trial' && new Date() > new Date(trial_end)) {
  // Trial expirado - usuario debe suscribirse
  return { status: 'blocked', error: "Trial period expired" };
}
```

**Plan Mapeo:**
```typescript
function planToCredits(planKey: string) {
  if (planKey === "prime") return 1500000;  // 1.5M créditos
  if (planKey === "scale") return 500000;   // 500K créditos
  return 100000;                             // 100K créditos (pro)
}
```
