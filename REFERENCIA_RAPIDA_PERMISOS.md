# Referencia Rápida: Permisos, Invitaciones y Aislamiento en Botz

## 1. TRES TIPOS DE USUARIOS

```
┌──────────────────────┬────────────────────┬──────────────────────┐
│ Platform Admin       │ Tenant Admin       │ Team Member/Asesor   │
├──────────────────────┼────────────────────┼──────────────────────┤
│ • Botz Staff         │ • Empresa Owner    │ • Empleado           │
│ • Ve TODOS tenants   │ • Ve su tenant     │ • Ve solo leads      │
│ • Acceso total       │ • Gestiona team    │   asignados          │
│ • Invita otros       │ • Crea asesores    │ • Role = 'asesor'    │
│   admins             │ • NO en inv. table │ • En team_members    │
│ • En platform_admins │ • Role = 'admin'   │                      │
│   table              │   (default)        │                      │
└──────────────────────┴────────────────────┴──────────────────────┘
```

## 2. FLUJO DE INVITACIÓN EN 5 PASOS

### PASO 1: Admin crea invitación
```bash
POST /api/platform/admin-invites
{
  "email": "developer@example.com",
  "role": "developer",           # 'developer'|'guest'|'support'
  "access_level": "full",        # 'full'|'readonly'|'limited'
  "notes": "Testing access"
}
```

### PASO 2: Email enviado
```
Para: developer@example.com
Link: https://botz.fyi/accept-invite/{inviteId}
Válido por: 7 días
```

### PASO 3: Usuario valida invitación
```bash
GET /api/platform/admin-invites/validate?inviteId={id}
# Verifica: existe, status=pending, no expirada
```

### PASO 4: Usuario crea contraseña
```
Formulario en: /accept-invite/{inviteId}
Validaciones:
  ✓ Mínimo 8 caracteres
  ✓ 1 mayúscula
  ✓ 1 número
  ✓ Confirmación coincide
```

### PASO 5: Cuenta creada
```
✓ auth.users record (email + password)
✓ platform_admins record (acceso a plataforma)
✓ admin_invites.status = 'accepted'
✓ Usuario puede login
```

## 3. AISLAMIENTO DE DATOS EN 3 NIVELES

### NIVEL 1: Tenant Isolation
```typescript
// Todos los queries filtran por tenant_id
const query = supabase
  .from('leads')
  .select('*')
  .eq('tenant_id', user.tenant_id);  // ← CRUCIAL
```

### NIVEL 2: Role-Based Filtering
```typescript
// Si asesor → solo sus leads asignados
if (user.role === 'asesor' && user.team_member_id) {
  query = query.eq('assigned_to', user.team_member_id);
}
```

### NIVEL 3: RLS Database Policies
```sql
-- En la BD, políticas RLS refuerzan el aislamiento
CREATE POLICY "tenant_isolation" ON leads
  FOR SELECT
  USING (
    tenant_id = current_setting('app.current_tenant_id')
    OR is_tenant_admin(tenant_id)
    OR is_platform_admin()
  );
```

## 4. VERIFICACIÓN DE PERMISOS (Guards)

**Para todo endpoint protegido:**

```typescript
// 1. Obtener usuario del JWT
const { user, error } = await getRequestUser(req);
if (!user) return { status: 401, error: "Unauthorized" };

// 2. Verificar acceso al tenant
const guard = await assertTenantAccess({
  req,
  requestedTenantId,
  allowPlatformAdminCrossTenant: true
});

if (!guard.ok) {
  return NextResponse.json({ error: guard.error }, { status: guard.status });
}

// 3. Usar guard.tenantId en queries (NUNCA requestedTenantId)
const { data } = await supabase
  .from('leads')
  .select('*')
  .eq('tenant_id', guard.tenantId);  // ← SEGURO
```

## 5. DETECCIÓN DE ROL EN FRONTEND

```typescript
// AuthRoleContext.tsx detecta automáticamente:
const user = {
  id: auth.user.id,
  email: auth.user.email,
  role: 'admin' || 'asesor',         // Detectado
  tenant_id: '...',                  // Detectado
  team_member_id: '...' || null      // Detectado
};

// Uso en componentes:
const { user, isAdmin, isAsesor } = useAuthRole();

if (isAdmin) {
  // Mostrar todos los leads
} else if (isAsesor) {
  // Mostrar solo leads asignados
}
```

## 6. FEATURE GATING (Por Plan)

```
Plan "free"       → Feature "demo" únicamente
Plan "Básico"+    → TODAS las features
  Includes:
  - demo (Operación en Vivo)
  - hipoteca (Motor Hipotecario)
  - channels (WhatsApp, etc.)
  - agents (IA)
  - crm (CRM en Vivo)
  - kanban (Tablero)
  - sla (Alertas)
  - n8n-config (Dashboard)

Verificación:
hasFeatureAccess(featureId) → boolean
  ├─ Platform admin? → true
  └─ enabledFeatures.includes(id)? → true/false
```

## 7. TABLAS CRÍTICAS

```
┌─ platform_admins
│  ├─ id (UUID)
│  ├─ auth_user_id (→ auth.users)
│  └─ created_at
│
├─ team_members
│  ├─ id (UUID)
│  ├─ auth_user_id (→ auth.users)
│  ├─ tenant_id (→ tenants)
│  ├─ email
│  ├─ nombre
│  ├─ rol ('admin' | 'asesor')
│  ├─ activo (boolean)
│  └─ created_at
│
└─ admin_invites (SOLO Platform Admins)
   ├─ id (UUID)
   ├─ email (UNIQUE)
   ├─ role ('developer'|'guest'|'support')
   ├─ access_level ('full'|'readonly'|'limited')
   ├─ status ('pending'|'accepted'|'rejected'|'revoked')
   ├─ created_by (→ auth.users)
   ├─ created_at
   ├─ expires_at (now + 7 days)
   └─ notes
```

## 8. UBICACIONES DE CÓDIGO CLAVE

### Backend
```
/api/platform/admin-invites/
├── route.ts ..................... CRUD (crear, leer, actualizar, eliminar)
├── validate/route.ts ............. Validar invitación
└── resend-email/route.ts ......... Reenviar email

/api/_utils/
├── guards.ts .................... getRequestUser(), assertTenantAccess()
├── mailer.ts .................... sendInviteEmail()
└── supabase.ts .................. Clients (anon, service)
```

### Frontend
```
/accept-invite/[inviteId]/
└── page.tsx ..................... Aceptar invitación + crear contraseña

/admin/invites/
└── page.tsx ..................... Página admin

/components/
├── AdminInvitesManager.tsx ....... UI para invitaciones
└── AuthRoleContext.tsx ........... Detecta rol automáticamente
```

### Base de Datos
```
/supabase/migrations/
├── 004_support_chat_platform_admin.sql
├── 005_fix_platform_admin_rls_and_grants.sql
├── 009_create_admin_invites_table.sql
└── 010_create_invite_tokens_table.sql
```

## 9. CHECKLIST DE SEGURIDAD

✅ **Siempre Hacer:**
- [ ] Verificar isPlatformAdmin() para invitaciones
- [ ] Usar assertTenantAccess() en endpoints
- [ ] Filtrar queries por tenant_id
- [ ] Usar service role key solo en backend
- [ ] Pasar JWT en Authorization header
- [ ] Validar datos en servidor (no confiar en cliente)
- [ ] Usar RLS en todas las tablas sensibles
- [ ] Rotar tokens (7 días máximo)

❌ **Nunca Hacer:**
- [ ] Usar requestedTenantId sin validar
- [ ] Permitir que usuario normal vea admin_invites
- [ ] Pasar service role key en frontend
- [ ] Almacenar passwords en plain text
- [ ] Confiar ciegamente en user.tenant_id del cliente
- [ ] Permitir acces cross-tenant sin isPlatformAdmin check

## 10. REFERENCIA RÁPIDA DE ENDPOINTS

```
GET    /api/platform/admin-invites
       → Lista todas (solo admin)

POST   /api/platform/admin-invites
       → Crear + enviar email (solo admin)

PATCH  /api/platform/admin-invites
       → Actualizar (solo admin)

DELETE /api/platform/admin-invites?id={id}
       → Eliminar (solo admin)

GET    /api/platform/admin-invites/validate?inviteId={id}
       → Verificar invitación

POST   /api/platform/admin-invites/resend-email
       → Reenviar email (solo admin)
```

## 11. MÉTODOS DE VERIFICACIÓN

```typescript
// Verificar Platform Admin
const { isAdmin } = await isPlatformAdmin(user.id);
if (!isAdmin) return { status: 403, error: "Forbidden" };

// Verificar Acceso a Tenant
const guard = await assertTenantAccess({ req, requestedTenantId });
if (!guard.ok) return { status: guard.status, error: guard.error };

// Verificar Team Member
const { row: teamMember } = await getTeamMemberByAuthUserId(user.id);
if (!teamMember) return { status: 403, error: "Forbidden" };

// En Frontend
const { user, isAdmin, isAsesor, canAccessAdminFeatures } = useAuthRole();
```

## 12. MATRIZ DE PERMISOS

| Acción | Platform Admin | Tenant Admin | Asesor |
|--------|---|---|---|
| Invitar otros admins | ✅ | ❌ | ❌ |
| Ver panel de invitaciones | ✅ | ❌ | ❌ |
| Ver todos los tenants | ✅ | ❌ | ❌ |
| Ver su tenant | ✅ | ✅ | ❌ |
| Crear team members | ❌ | ✅ | ❌ |
| Ver todos los leads | ✅ | ✅ | ❌ |
| Ver leads asignados | ✅ | N/A | ✅ |
| Acceso a todas features | ✅ | Plan-based | Plan-based |

## 13. VARIABLES DE ENTORNO (Importante)

```bash
# NEXT_PUBL
