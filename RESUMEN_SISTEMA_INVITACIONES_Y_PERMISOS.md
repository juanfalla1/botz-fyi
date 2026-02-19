# Resumen del Sistema de Invitaciones, Roles y Permisos en Botz

## 1. ARQUITECTURA GENERAL

El sistema Botz implementa un **sistema de permisos multi-nivel** basado en tres tipos de usuarios:

```
┌─────────────────────────────────────────────────────────────────┐
│                    USUARIO: Platform Admin                       │
│         (Botz Staff - Acceso total a plataforma)                │
│  ├─ Puede invitar otros admins (developers, support, guests)   │
│  ├─ Ve todos los tenants/clientes                              │
│  ├─ Controla todas las características                         │
│  └─ Acceso mediante tabla: platform_admins                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    USUARIO: Tenant Admin                         │
│       (Dueño de empresa - Compra planes, crea equipo)          │
│  ├─ Posee un único tenant/company                              │
│  ├─ Controla features según su plan de suscripción            │
│  ├─ Puede crear/gestionar team members (asesores)            │
│  ├─ Ve todos los leads de su tenant                           │
│  └─ Acceso mediante: Sin registro en team_members (default)    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  USUARIO: Team Member (Asesor)                  │
│              (Empleado - Acceso limitado a leads)              │
│  ├─ Pertenece a un tenant específico                          │
│  ├─ Solo ve leads asignados a él (assigned_to)              │
│  ├─ Features limitadas por plan de tenant                    │
│  └─ Acceso mediante: Tabla team_members con rol='asesor'    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. SISTEMA DE INVITACIONES (SOLO PARA PLATFORM ADMINS)

### 2.1 Tablas de Base de Datos

#### **admin_invites** (Invitaciones)
```sql
CREATE TABLE admin_invites (
  id UUID PRIMARY KEY,                    -- Identificador único
  email TEXT NOT NULL,                    -- Email del invitado
  role TEXT ('developer'|'guest'|'support'),  -- Tipo de acceso
  status TEXT ('pending'|'accepted'|'rejected'|'revoked'),
  access_level TEXT ('full'|'readonly'|'limited'),
  created_by UUID REFERENCES auth.users,  -- Quién creó la invitación
  created_at TIMESTAMP,                   -- Cuándo se creó
  expires_at TIMESTAMP,                   -- Expira en 7 días
  notes TEXT                              -- Notas del admin
);
```

**Roles Disponibles:**
- `developer`: Acceso completo a desarrollo
- `guest`: Acceso limitado temporal
- `support`: Acceso para soporte técnico

**Niveles de Acceso:**
- `full`: Acceso completo a todas las features
- `readonly`: Solo lectura (sin modificaciones)
- `limited`: Acceso restringido a funcionalidades específicas

#### **invite_tokens** (Tokens de Invitación)
```sql
CREATE TABLE invite_tokens (
  id UUID PRIMARY KEY,
  invite_id UUID REFERENCES admin_invites,
  token TEXT UNIQUE,                      -- Token único del link
  email TEXT,
  created_at TIMESTAMP,
  expires_at TIMESTAMP,
  used_at TIMESTAMP,                      -- Cuándo fue usado
  used BOOLEAN,                           -- ¿Ya fue usado?
  metadata JSONB
);
```

### 2.2 Flujo Completo de Invitación

#### **PASO 1: Crear Invitación**
- **Quién:** Solo Platform Admins (verificado con `isPlatformAdmin()`)
- **Cómo:** Admin accede a `/admin/invites` → Llena formulario
- **Qué se crea:** Registro en tabla `admin_invites`
- **Email:** Se envía automáticamente con link de aceptación

**Ubicación del código:**
```
Backend:  app/api/platform/admin-invites/route.ts (POST)
Frontend: app/components/AdminInvitesManager.tsx (línea 74-127)
```

**Validaciones:**
- Solo Platform Admin puede crear invitaciones
- Email debe ser único en admin_invites
- Rol debe ser válido ('developer', 'guest', 'support')
- Nivel de acceso debe ser válido ('full', 'readonly', 'limited')

**Código Backend (POST /api/platform/admin-invites):**
```typescript
// 1. Validar que sea Platform Admin
const isAdmin = await isPlatformAdmin(user.id);
if (!isAdmin) return { error: "Only platform admins can create invites" };

// 2. Crear registro en admin_invites
const { data: inviteData } = await supabase
  .from("admin_invites")
  .insert({
    email,
    role,                    // 'developer', 'guest', 'support'
    access_level,           // 'full', 'readonly', 'limited'
    created_by: user.id,
    expires_at,             // 7 días por defecto
    notes
  })
  .select()
  .single();

// 3. Enviar email de invitación
const emailSent = await sendInviteEmail(email, inviteData.id, role, access_level);
```

#### **PASO 2: Recibir Invitación por Email**
- **Destinatario:** Email especificado en la invitación
- **Contenido:** HTML con link personalizado
- **Link:** `{APP_URL}/accept-invite/{inviteId}`
- **Validez:** 7 días desde creación
- **Información incluida:** Email, rol, nivel de acceso, instrucciones

**Template de Email:**
```
Ubicación: app/api/_utils/mailer.ts (sendInviteEmail function)

Incluye:
- Email del usuario
- Rol asignado (developer/guest/support)
- Nivel de acceso (full/readonly/limited)
- Link de aceptación personalizado
- Nota de seguridad sobre expiración
```

#### **PASO 3: Validar Invitación**
- **Acción:** Usuario hace click en el link del email
- **Endpoint:** GET `/api/platform/admin-invites/validate?inviteId={id}`
- **Validaciones:**
  - Invitación existe
  - Status es 'pending'
  - No está expirada (compara con expires_at)

**Código de Validación:**
```typescript
// app/api/platform/admin-invites/validate/route.ts
const { data: invite } = await supabase
  .from("admin_invites")
  .select("*")
  .eq("id", inviteId)
  .single();

if (invite.status === "accepted") {
  return { error: "Invitation already accepted" };
}

if (new Date(invite.expires_at) < new Date()) {
  return { error: "Invitation expired" };
}

return { ok: true, invite };
```

#### **PASO 4: Aceptar Invitación (Frontend)**
- **Componente:** `/accept-invite/[inviteId]/page.tsx`
- **Flujo:**
  1. Verificar invitación (validar)
  2. Mostrar formulario de contraseña
  3. Validar contraseña (min 8 caracteres, 1 mayúscula, 1 número)
  4. Crear cuenta de auth con email/password
  5. Actualizar invitación a "accepted"
  6. Mostrar página de éxito

**Validaciones de Contraseña:**
```typescript
- Mínimo 8 caracteres
- Al menos 1 mayúscula
- Al menos 1 número
- Debe coincidir con confirmación
```

**Código de Aceptación:**
```typescript
// 1. Crear usuario en Supabase Auth
const { data: authData } = await supabase.auth.signUp({
  email: invite.email,
  password,
  options: {
    data: {
      role: invite.role,              // Guardar en user_metadata
      access_level: invite.access_level
    }
  }
});

// 2. Crear registro en platform_admins (para acceso en dashboard)
await supabase
  .from("platform_admins")
  .insert({
    auth_user_id: authData.user.id
  });

// 3. Actualizar estado de invitación
await supabase
  .from("admin_invites")
  .update({ status: "accepted" })
  .eq("id", invite.id);
```

#### **PASO 5: Gestionar Invitaciones**
- **Admin puede:** Reenviar email, editar rol/acceso, eliminar invitación
- **Endpoint Reenvío:** POST `/api/platform/admin-invites/resend-email`
- **Endpoint Edición:** PATCH `/api/platform/admin-invites`
- **Endpoint Eliminación:** DELETE `/api/platform/admin-invites?id={id}`

---

## 3. SISTEMA DE ROLES Y PERMISOS

### 3.1 Jerarquía de Roles

```
NIVEL 1: Platform Admin (en tabla platform_admins)
├─ Control total de la plataforma
├─ Ver todos los tenants
├─ Invitar otros platform admins
└─ Sin restricciones de features

NIVEL 2: Tenant Admin (NOT en team_members, o rol='admin')
├─ Owner de un tenant específico
├─ Control de features según plan
├─ Crear/gestionar team members
└─ Ver todos los leads del tenant

NIVEL 3: Team Member / Asesor (en team_members con rol='asesor')
├─ Empleado del tenant
├─ Solo ve sus leads asignados
├─ Fe
