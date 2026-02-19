# ANÁLISIS: Por Qué los Demo Trial Users NO Tienen Funcionalidades Habilitadas

## RESUMEN EJECUTIVO
Cuando un usuario de demo trial acepta una invitación y crea contraseña, **NO se habilitan las funcionalidades** porque:

1. **No se crea un tenant_id para el usuario demo**
2. **No se crea un team_member con el tenant_id correcto**
3. **AuthRoleContext no puede detectar el tenant_id del usuario**
4. **MainLayout no puede cargar la suscripción sin un tenant_id válido**
5. **El usuario queda sin acceso a datos porque no hay filtro por tenant válido**

---

## 1. FLUJO DE ACEPTACIÓN DE INVITACIÓN (`/accept-invite/[inviteId]/page.tsx`)

### Qué sucede actualmente (líneas 114-172):

```tsx
// LÍNEA 124-133: Crear usuario en auth
const { data: authData, error: authError } = await supabase.auth.signUp({
  email: invite.email,
  password,
  options: {
    data: {
      role: invite.role,
      access_level: invite.access_level,
      // ❌ PROBLEMA: NO ALMACENA tenant_id EN METADATA
    },
  },
});

// LÍNEA 144-154: Agregar como platform_admin
const { error: adminError } = await supabase
  .from("platform_admins")
  .insert({
    auth_user_id: authData.user.id,
    // ❌ PROBLEMA: Platform admin ≠ usuario regular que necesita tenant_id
  })
  .select()
  .single();

// LÍNEA 157-164: Actualizar status de invitación
const { error: inviteError } = await supabase
  .from("admin_invites")
  .update({ status: "accepted" })
  .eq("id", invite.id);
```

### PROBLEMAS IDENTIFICADOS:

❌ **Problema 1:** No se crea un `team_member` con `tenant_id`
- El usuario se añade a `platform_admins` pero NO a `team_members`
- `team_members` es donde se debe especificar `tenant_id` para filtrar datos
- Sin `tenant_id` en `team_members`, el usuario no puede asignarse a ningún tenant

❌ **Problema 2:** No se almacena `tenant_id` en auth metadata
- Las líneas 128-131 guardan `role` y `access_level` pero no `tenant_id`
- Cuando AuthRoleContext busca `tenant_id` (línea 66 de AuthRoleContext), no lo encuentra

❌ **Problema 3:** No se crea un tenant para usuarios demo
- No hay código que cree un nuevo `tenant` en la tabla `tenants`
- El usuario invitado no tiene un tenant_id a qué asignarse

---

## 2. DETECCIÓN DE TENANT EN `AuthRoleContext.tsx` (líneas 40-180)

### Cómo intenta detectar tenant_id (líneas 65-83):

```tsx
// LÍNEA 66: Intenta obtener tenant_id desde metadata (FALLA para demo users)
let tenantId = authUser.user_metadata?.tenant_id || 
               authUser.app_metadata?.tenant_id || null;

// LÍNEA 69-77: Si no hay metadata, busca en team_members
if (!tenantId) {
  const { data: anyTenantMember } = await supabase
    .from('team_members')
    .select('tenant_id')
    .eq('email', authUser.email)
    .eq('activo', true)
    .not('tenant_id', 'is', 'null')
    .maybeSingle();
  
  if (anyTenantMember?.tenant_id) {
    tenantId = anyTenantMember.tenant_id;
  }
}

// LÍNEA 89-95: Busca el team_member con ese tenant_id (FALLA si tenant_id es null)
let { data: teamMember } = await supabase
  .from('team_members')
  .select('id, nombre, email, rol, tenant_id')
  .eq('email', authUser.email)
  .eq('activo', true)
  .eq('tenant_id', tenantId)  // ❌ Si tenantId es null, esta query falla
  .maybeSingle();
```

### PROBLEMAS IDENTIFICADOS:

❌ **Problema 4:** El user metadata no tiene tenant_id
- Para usuarios de invitación demo, NO se guardó el tenant_id en auth metadata
- AuthRoleContext no puede obtenerlo de línea 66

❌ **Problema 5:** No hay team_member creado
- El usuario NO está en `team_members` (se añadió a `platform_admins`)
- La búsqueda de línea 71-77 retorna null
- La búsqueda de línea 89-95 también retorna null porque:
  - O no existe el team_member
  - O el tenant_id es null

❌ **Problema 6:** El usuario se clasifica como "admin" sin datos
- Línea 142: Por defecto, si no es team_member, se asigna rol "admin"
- Pero un admin SIN tenant_id NO puede filtrar datos
- El usuario tiene acceso teórico pero NO puede ver leads/datos

---

## 3. CARGA DE MÓDULOS EN `MainLayout.tsx` (líneas 394-531)

### Cómo se cargan las funcionalidades (líneas 322-343):

```tsx
// LÍNEA 322-343: applySubscription
const applySubscription = useCallback((activeSub: any | null) => {
  if (activeSub) {
    setSubscription(activeSub);
    const tenantPlan = activeSub.plan || "free";
    setUserPlan(tenantPlan);
    const planFeatures = PLAN_FEATURES[tenantPlan] || PLAN_FEATURES["free"];
    setEnabledFeatures(planFeatures);  // ✅ Aquí se habilitan features
  } else {
    // ❌ Si NO hay suscripción, solo "demo" está habilitado
    setUserPlan("free");
    setSubscription(null);
    setEnabledFeatures(PLAN_FEATURES["free"]);  // Solo "demo"
  }
}, []);

// LÍNEA 68-78: PLAN_FEATURES
const PLAN_FEATURES: Record<string, string[]> = {
  free: ["demo"],  // ❌ Solo "demo" está habilitado en free/trial
  "Básico": ALL_FEATURES,
  Growth: ALL_FEATURES,
  // ... otros planes habilitan TODO
};
```

### Cómo se obtiene la suscripción (líneas 396-531):

```tsx
// LÍNEA 396-531: fetchUserSubscription
const fetchUserSubscription = useCallback(async (userId: string, tenantId?: string | null) => {
  // ── PASO 1: Buscar por user_id (para admins)
  const { data: directData } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .limit(1);
  
  let activeSub = directData?.[0] ?? null;

  // ── PASO 2: Si no encontró y tenemos tenant_id, buscar por tenant
  if (!activeSub && tenantId) {
    const { data: tenantSubData } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("tenant_id", tenantId)
      .in("status", ["active", "trialing"])
      .limit(1);
    activeSub = tenantSubData?.[0] ?? null;
  }

  // ── PASO 3: Si aún no encontró, intentar obtener tenant_id de team_members
  if (!activeSub && !tenantId) {
    const { data: tmByAuth } = await supabase
      .from("team_members")
      .select("tenant_id")
      .eq("auth_user_id", userId)
      .maybeSingle();
    
    let foundTenantId = tmByAuth?.tenant_id || null;
    
    if (foundTenantId) {
      // Buscar suscripción por tenant
      const { data: tenantSubData } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("tenant_id", foundTenantId)
        .in("status", ["active", "trialing"])
        .limit(1);
      activeSub = tenantSubData?.[0] ?? null;
    }
  }

  applySubscription(activeSub);  // ❌ Si no encontró, aplica null
}, [applySubscription]);
```

### PROBLEMAS IDENTIFICADOS:

❌ **Problema 7:** No hay suscripción en la BD para el demo user
- PASO 1: No hay entrada en `subscriptions` con `user_id` = demo user
- PASO 2: No hay `tenant_id` (falla en línea anterior)
- PASO 3: No hay `team_member` con `auth_user_id` = demo user
- Resultado: `activeSub = null`

❌ **Problema 8:** Sin suscripción, solo "demo" está habilitado
- `applySubscription(null)` ejecuta línea 332-335
- `setEnabledFeatures(PLAN_FEATURES["free"])` → solo `["demo"]`
- Todas las demás funcionalidades quedan bloqueadas

---

## 4. GUARDIAS DE ACCESO A API (`app/api/_utils/guards.ts`)

### Función critical: `assertTenantAccess` (líneas 58-91):

```tsx
export async function assertTenantAccess(params: {
  req: Request;
  requestedTenantId?: string | null;
  allowPlatformAdminCrossTenant?: boolean;
}) {
  const { req, requestedTenantId = null, allowPlatformAdminCrossTenant = true } = params;

  const { user, error } = await getRequestUser(req);
  if (!user) return { ok: false, status: 401, error: "Unauthorized" };

  const pa = await isPlatformAdmin(user.id);
  if (pa.isAdmin) {
    return { ok: true, tenantId: requestedTenantId || null, isPlatformAdmin: true };
  }

  // ❌ Si NO es platform admin, busca en team_members
  const tm = await getTeamMemberByAuthUserId(user.id);
  if (!tm.ok) return { ok: false, status: 500, error: "Team member lookup failed" };
  if (!tm.row?.tenant_id) return { ok: false, status: 403, error: "Forbidden" };

  const tenantId = String(tm.row.tenant_id);
  if (requestedTenantId && requestedTenantId !== tenantId) {
    return { ok: false, status: 4
