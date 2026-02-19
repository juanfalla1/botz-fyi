# Estructura Base de Datos Botz - Análisis Completo

**Fecha del análisis:** 2026-02-18
**Versión:** 1.0

---

## 1. RESUMEN EJECUTIVO

El sistema Botz implementa una arquitectura **multi-tenant** con tres niveles de usuarios:
1. **Platform Admin** - Acceso global a plataforma (tabla `platform_admins`)
2. **Tenant Admin** - Owner de empresa (sin registro especial, por defecto)
3. **Team Member** - Empleado con acceso limitado (tabla `team_members`)

### Tablas Principales:
- `platform_admins` - Admins de plataforma
- `admin_invites` - Invitaciones a platform admins
- `invite_tokens` - Tokens de validación de invitaciones
- `team_members` - Equipo del tenant
- `tenants` - **PENDIENTE DE CREAR** (referenciada pero no existe)
- `bot_agents` - Agentes IA por tenant
- `ai_agents` - Sistema completo de agentes
- `agent_entitlements` - Planes y créditos de usuarios

---

## 2. TABLAS DE BASE DE DATOS

### 2.1 TABLA: `platform_admins`
**Ubicación:** `supabase/migrations/004_support_chat_platform_admin.sql`

```sql
CREATE TABLE IF NOT EXISTS public.platform_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- RLS Policy: solo lectura para el mismo usuario
CREATE POLICY "Platform admins read" ON public.platform_admins
FOR SELECT
USING (auth_user_id = auth.uid());
```

**Campos:**
- `id` (UUID) - Clave primaria
- `auth_user_id` (UUID) - Referencia a auth.users (UNIQUE)
- `created_at` (TIMESTAMP) - Timestamp de creación

**Características:**
- RLS habilitado
- Cada usuario platform admin solo ve su propio registro
- Sin actualización/inserción desde UI (protegido)

**Validación de acceso en API:**
```typescript
// app/api/_utils/guards.ts
async function isPlatformAdmin(authUserId: string) {
  const { data, error } = await svc
    .from("platform_admins")
    .select("auth_user_id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  return !error && !!data;
}
```

---

### 2.2 TABLA: `admin_invites`
**Ubicación:** `supabase/migrations/009_create_admin_invites_table.sql`

```sql
CREATE TABLE IF NOT EXISTS admin_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'developer',          -- 'developer'|'guest'|'support'
  status TEXT NOT NULL DEFAULT 'pending',          -- 'pending'|'accepted'|'rejected'|'revoked'
  access_level TEXT NOT NULL DEFAULT 'full',       -- 'full'|'readonly'|'limited'
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,            -- 7 días por defecto
  notes TEXT,
  UNIQUE(email)
);

CREATE INDEX idx_admin_invites_email ON admin_invites(email);
CREATE INDEX idx_admin_invites_status ON admin_invites(status);
CREATE INDEX idx_admin_invites_created_by ON admin_invites(created_by);

ALTER TABLE admin_invites ENABLE ROW LEVEL SECURITY;

-- Solo platform admins pueden ver/gestionar
CREATE POLICY "Platform admins can view all invites" ON admin_invites
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM platform_admins WHERE auth_user_id = auth.uid()
  ));
```

**Campos:**
- `id` (UUID) - Clave primaria
- `email` (TEXT) - Email del invitado (UNIQUE)
- `role` (TEXT) - Rol: 'developer', 'guest', 'support'
- `status` (TEXT) - Estado: 'pending', 'accepted', 'rejected', 'revoked'
- `access_level` (TEXT) - Nivel de acceso: 'full', 'readonly', 'limited'
- `created_by` (UUID) - FK a auth.users
- `created_at` (TIMESTAMP) - Cuándo se creó
- `expires_at` (TIMESTAMP) - Expira en 7 días
- `notes` (TEXT) - Notas opcionales

**Características:**
- Solo Platform Admins pueden crear/ver invitaciones
- Email es único (una invitación por email)
- Expiración: 7 días (configurable)
- Sin soft delete (físico)

**Flujo de creación:**
```typescript
// app/api/platform/admin-invites/route.ts - POST
// 1. Verificar que sea Platform Admin
const isAdmin = await isPlatformAdmin(user.id);

// 2. Crear registro
const { data: inviteData } = await supabase
  .from("admin_invites")
  .insert({
    email,
    role,           // 'developer'|'guest'|'support'
    access_level,   // 'full'|'readonly'|'limited'
    created_by: user.id,
    expires_at,     // NOW() + 7 days
    notes
  })
  .select()
  .single();

// 3. Enviar email con link
await sendInviteEmail(email, inviteData.id, role, access_level);
```

---

### 2.3 TABLA: `invite_tokens`
**Ubicación:** `supabase/migrations/010_create_invite_tokens_table.sql`

```sql
CREATE TABLE IF NOT EXISTS invite_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id UUID NOT NULL REFERENCES admin_invites(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,                      -- Token único del link
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,  -- 7 días
  used_at TIMESTAMP WITH TIME ZONE,               -- Cuándo fue usado
  used BOOLEAN DEFAULT FALSE,                     -- ¿Ya fue usado?
  metadata JSONB
);

CREATE INDEX idx_invite_tokens_token ON invite_tokens(token);
CREATE INDEX idx_invite_tokens_email ON invite_tokens(email);
CREATE INDEX idx_invite_tokens_used ON invite_tokens(used);

ALTER TABLE invite_tokens ENABLE ROW LEVEL SECURITY;

-- Service role puede gestionar
CREATE POLICY "Service role can manage invite tokens" ON invite_tokens
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

**Campos:**
- `id` (UUID) - Clave primaria
- `invite_id` (UUID) - FK a admin_invites
- `token` (TEXT) - Token único (UNIQUE) - base64/hex
- `email` (TEXT) - Email del invitado
- `created_at` (TIMESTAMP) - Cuándo se creó
- `expires_at` (TIMESTAMP) - Expiración (7 días)
- `used_at` (TIMESTAMP) - Cuándo fue usado
- `used` (BOOLEAN) - Flag de uso
- `metadata` (JSONB) - Metadatos adicionales

**Características:**
- Tabla de auditoría para tracking de invitaciones
- Permite múltiples tokens por invitación (reenvíos)
- Tokens pueden expirar
- Permite tracking de cuándo fue usado

---

### 2.4 TABLA: `team_members`
**Ubicación:** `sql_setup_team_members.sql` + `20240211_*.sql` (migrations)

```sql
CREATE TABLE IF NOT EXISTS team_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    telefono TEXT,
    rol TEXT NOT NULL DEFAULT 'asesor',    -- 'admin'|'asesor'
    tenant_id UUID,                         -- FK a tenants
    auth_user_id UUID,                      -- FK a auth.users
    activo BOOLEAN DEFAULT true,            -- Soft delete
    permissions TEXT,                       -- JSONB de permisos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Foreign key constraints
ALTER TABLE team_members 
ADD CONSTRAINT team_members_tenant_id_fkey 
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE team_members 
ADD CONSTRAINT team_members_auth_user_id_fkey 
FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX idx_team_members_tenant_id ON team_members(tenant_id);
CREATE UNIQUE INDEX idx_team_members_auth_user_id ON team_members(auth_user_id);

-- RLS policies
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
```

**Campos:**
- `id` (UUID) - Clave primaria
- `nombre` (TEXT) - Nombre completo
- `email` (TEXT) - Email (UNIQUE)
- `telefono` (TEXT) - Teléfono
- `rol` (TEXT) - 'admin' (tenant owner) o 'asesor' (empleado)
- `tenant_id` (UUID) - FK a tenants (multi-tenant)
- `auth_user_id` (UUID) - FK a auth.users (vinculación con auth)
- `activo` (BOOLEAN) - Soft delete (true = activo)
- `permissions` (TEXT/JSONB) - Permisos granulares
- `created_at` (TIMESTAMP) - Creación

**Características:**
- Soft delete con campo `activo`
- Vinculación dual: tenant_id + auth_user_id
- Rol determina acceso a leads
- Sin RLS específica (controlada en app)

**Relación con tenants:**
```typescript
// Acceso a un tenant
- Si rol = 'admin' → Ve todos los leads del tenant
- Si rol = 'asesor' → Ve s
