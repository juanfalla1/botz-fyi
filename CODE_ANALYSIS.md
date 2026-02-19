# ANÁLISIS DE CÓDIGO: Demo Trial Users Sin Funcionalidades

## 1. PROBLEMA EN `/accept-invite/[inviteId]/page.tsx` (líneas 114-172)

### Código Actual - handleSetupPassword()

```tsx
const handleSetupPassword = async (e: React.FormEvent) => {
  e.preventDefault();
  
  try {
    setSubmitting(true);
    
    // ✅ PASO 1: Crear usuario con auth.signUp
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: invite.email,
      password,
      options: {
        data: {
          role: invite.role,
          access_level: invite.access_level,
          // ❌ FALTA: tenant_id NO se guarda aquí
        },
      },
    });

    if (authError || !authData.user) {
      throw new Error(authError?.message || "Error al crear la cuenta");
    }

    // ✅ PASO 2: Añadir a platform_admins
    const { error: adminError } = await supabase
      .from("platform_admins")
      .insert({
        auth_user_id: authData.user.id,
        // ❌ PROBLEMA: platform_admin ≠ usuario regular con tenant_id
      })
      .select()
      .single();

    if (adminError) {
      console.warn("Error adding to platform_admins:", adminError);
    }

    // ✅ PASO 3: Actualizar invite status
    const { error: inviteError } = await supabase
      .from("admin_invites")
      .update({ status: "accepted" })
      .eq("id", invite.id);

    if (inviteError) {
      console.warn("Error updating invite status:", inviteError);
    }

    setStep("success");
  } catch (err) {
    console.error("Error setting up password:", err);
    setPasswordError(err instanceof Error ? err.message : "Error al crear la cuenta");
  } finally {
    setSubmitting(false);
  }
};
```

### ¿Qué FALTA?

```tsx
// ❌ NO EXISTE ESTE CÓDIGO:

// 1. Crear un tenant para el demo user
const { data: newTenant, error: tenantError } = await supabase
  .from("tenants")
  .insert({
    empresa: invite.email.split("@")[0],
    email: invite.email,
    status: "trial",
    trial_start: new Date().toISOString(),
    trial_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    source: "demo_invite",
    auth_user_id: authData.user.id,
  })
  .select()
  .single();

// 2. Crear team_member con tenant_id
const { data: teamMember, error: teamError } = await supabase
  .from("team_members")
  .insert({
    tenant_id: newTenant.id,
    email: invite.email,
    nombre: invite.email.split("@")[0],
    rol: invite.role || "admin",
    activo: true,
    auth_user_id: authData.user.id,
    permissions: {
      view_leads: true,
      create_lead: true,
      view_all_leads: true,
      manage_team: true,
      manage_agents: true,
      manage_channels: true,
      view_exec_dashboard: true,
    },
  })
  .select()
  .single();

// 3. Crear subscription con status "trialing"
const { data: subscription, error: subError } = await supabase
  .from("subscriptions")
  .insert({
    user_id: authData.user.id,
    tenant_id: newTenant.id,
    plan: "Básico",
    status: "trialing",
    billing_cycle: "month",
    trial_start: newTenant.trial_start,
    trial_end: newTenant.trial_end,
  })
  .select()
  .single();

// 4. Guardar tenant_id en auth metadata (CRÍTICO)
await supabase.auth.updateUser({
  data: {
    tenant_id: newTenant.id,
    role: invite.role,
    access_level: invite.access_level,
  },
});
```

---

## 2. PROBLEMA EN `AuthRoleContext.tsx` (líneas 40-180)

### Cómo intenta obtener tenant_id

```tsx
const fetchUserWithRole = async () => {
  try {
    // ... obtener sesión ...
    const authUser = session.user;
    
    // LÍNEA 66: Intenta obtener tenant_id de metadata
    let tenantId = authUser.user_metadata?.tenant_id || 
                   authUser.app_metadata?.tenant_id || null;
    
    // ❌ FALLA para demo users porque:
    //    - No se guardó tenant_id en auth.updateUser() (Problema 1)
    //    - tenantId = null
    
    // LÍNEA 69-83: Si no hay metadata, busca en team_members
    if (!tenantId) {
      const { data: anyTenantMember } = await supabase
        .from('team_members')
        .select('tenant_id')
        .eq('email', authUser.email)
        .eq('activo', true)
        .not('tenant_id', 'is', 'null')
        .maybeSingle();
      
      // ❌ FALLA para demo users porque:
      //    - No existe team_member (Problema 1)
      //    - anyTenantMember = null
      
      if (anyTenantMember?.tenant_id) {
        tenantId = anyTenantMember.tenant_id;
      }
    }
    
    // LÍNEA 89-95: Busca el team_member
    let { data: teamMember } = await supabase
      .from('team_members')
      .select('id, nombre, email, rol, tenant_id')
      .eq('email', authUser.email)
      .eq('activo', true)
      .eq('tenant_id', tenantId)  // ❌ tenantId es null → FALLA
      .maybeSingle();
    
    // ❌ teamMember = null
    
    // LÍNEA 142-152: Por defecto, asigna rol "admin"
    let role: UserRole = 'admin';  // ❌ Admin sin datos
    if (teamMember) {
      role = (teamMember.rol === 'asesor') ? 'asesor' : 'admin';
    }
    
    const userToSet = {
      id: authUser.id,
      email: authUser.email || '',
      role,
      tenant_id: tenantId,  // ❌ null
      team_member_id: teamMember?.id || null,  // ❌ null
      nombre: teamMember?.nombre || authUser.user_metadata?.nombre || authUser.email
    };
    
    setUser(userToSet);
    // ❌ RESULTADO: user.tenant_id = null
    
  } catch (error) {
    console.error('AuthRoleContext: Error fetching user role:', error);
    setUser(null);
  }
};
```

### Resultado
```
user = {
  id: "auth-uuid",
  email: "demo@example.com",
  role: "admin",
  tenant_id: null,  // ❌ ← PROBLEMA
  team_member_id: null,  // ❌ ← PROBLEMA
  nombre: "demo"
}
```

---

## 3. PROBLEMA EN `MainLayout.tsx` (líneas 396-531)

### fetchUserSubscription() - Los 3 Pasos Fallan

```tsx
const fetchUserSubscription = useCallback(async (userId: string, tenantId?: string | null) => {
  try {
    console.log("🔍 [SUB] Buscando suscripción...");

    // ── PASO 1: Buscar por user_id (para admins normales)
    const { data: directData } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)  // userId = demo user
      .in("status", ["active", "trialing"])
      .order("created_at", { ascending: false })
      .limit(1);

    let activeSub = directData?.[0] ?? null;
    // ❌ FALLA: No hay entrada en subscriptions para demo user
    // activeSub = null

    // ── PASO 2: Si no encontró, buscar por tenant_id
    if (!activeSub && tenantId) {
      // ❌ FALLA: tenantId = null (del Problema 2)
      // Este if NUNCA se ejecuta porque tenantId es null
    }

    // ── PASO 3: Si aún no encontró, intentar obtener tenant_id
    if (!activeSub && !tenantId) {
      const { data: tmByAuth } = await supabase
        .from("team_members")
        .select("tenant_id, email, rol")
        .eq("auth_user_id", userId)
        .or("activo.is.null,activo.eq.true")
        .maybeSingle();

      // ❌ FALLA: No existe team_member (del Problema 1)
      // tmByAuth = null

      let foundTenantId = tmByAuth?.tenant_id || null;
      // foundTenantId = null

      // Si no encontró por auth_user_id, busca por email
      if (!foundTenantId) {
        const { data: tmByEmail } = await supabase
          .from("team_members")
          .select("id, tenant_id, auth_user_id")
          .eq("email", authUser.email)
          .or("activo.is.null,activo.eq.true")
          .maybeSingle();

        // ❌ FALLA: No existe team_member
        // tmByEmail = null
      }
    }

    // ❌ RESULTADO: activeSub = null
    applySubscription(activeSub);
    
  } catch (error) {
    console.error("Error en fetchUserSubscription:", error);
    applySubscription(null);  // ❌ null
  }
}, [applySubscription]);
```

### applySubscription(null) - Deshabilita Features

```tsx
const applySubscription = useCallback((activeSub: any | null) => {
  if (activeSub) {
    // ... user tiene suscripción ...
    setUserPlan(activeSub.plan);
    const planFeatures = PLAN_FEATURES[activeSub.plan];
    setEnabledFeatures(planFeatures);  // ✅ Todas las features
  } else {
    // ❌ activeSub es null → plan fr
