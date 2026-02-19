# INVESTIGACIÓN DETALLADA: Problemas de Autenticación en Botz

## RESUMEN EJECUTIVO

Se identificaron **3 problemas críticos** en la plataforma:

### PROBLEMA 1: Google OAuth Roto
- **Síntoma**: Usuario no puede entrar con Google
- **Causa**: Falta configuración en Supabase OAuth providers
- **Ubicación**: Credenciales de Google en `.env.local` + Supabase dashboard

### PROBLEMA 2: Flujo Demo/Trial No Carga Datos
- **Síntoma**: Usuarios que aceptan invitación demo quedan sin acceso a funcionalidades
- **Causa**: No se crea `tenant_id` ni `team_member` para usuarios demo
- **Ubicación**: `/accept-invite/[inviteId]/page.tsx` + MainLayout.tsx

### PROBLEMA 3: Email info@botz.fyi Funciona Bien
- **Síntoma**: Usuarios con email específico tienen acceso normal
- **Causa**: Diferente flujo de autenticación (directo sin invitación)

---

## PROBLEMA 1: GOOGLE OAUTH ROTO

### 1.1 Archivos Involucrados
- `app/start/components/AuthModal.tsx` (línea 33-49)
- `app/pricing/page.tsx` (línea 330-342)
- `.env.local` (línea 15-17)
- Supabase Dashboard (OAuth Providers)

### 1.2 Código de AuthModal.tsx
```tsx
async function handleGoogle() {
  setLoading(true);
  setErr(null);
  setMsg(null);
  try {
    const next = redirectTo || (typeof window !== "undefined" ? `${window.location.origin}/start/agents` : undefined);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: next ? { redirectTo: next } : undefined,
    });
    if (error) throw error;
  } catch (e: any) {
    setErr(e?.message || "Error iniciando con Google");
    setLoading(false);
  }
}
```

### 1.3 Código de pricing/page.tsx
```tsx
async function handleGoogleLogin() {
  setGoogleLoading(true);
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { 
        redirectTo: `${window.location.origin}/start`
      },
    });
    if (error) throw error;
  } catch (e: any) {
    setErr(e?.message || "Error con Google");
    setGoogleLoading(false);
  }
}
```

### 1.4 Configuración Disponible en .env.local
```
GOOGLE_CLIENT_ID="417058045568-hheokiaia74qgr7lvfcgugpbenq8kq3t.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="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"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/integrations/google/callback"
```

### 1.5 DIAGNOSIS: ¿DÓNDE ESTÁ EL PROBLEMA?

**Hay dos puntos de OAuth de Google:**

#### A) Supabase OAuth (signInWithOAuth - para AUTENTICACIÓN)
- **Archivo**: `supabaseClient.ts`
- **URL**: https://chyzxaspglbwnenagtjv.supabase.co
- **Falta**: Credenciales de OAuth Google configuradas en Supabase Dashboard
- **Cómo verificar**: 
  1. Ir a Supabase Dashboard
  2. Authentication > Providers > Google
  3. Buscar si está habilitado y con credenciales

**ACTION REQUIRED:**
```
1. En Supabase Dashboard, ir a Authentication > Providers
2. Habilitar Google OAuth
3. Agregar credenciales:
   - Client ID: 417058045568-hheokiaia74qgr7lvfcgugpbenq8kq3t.apps.googleusercontent.com
   - Client Secret: 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
4. Configurar Redirect URI: https://chyzxaspglbwnenagtjv.supabase.co/auth/v1/callback
```

#### B) Google OAuth Manual (para INTEGRACIONES de Gmail)
- **Archivo**: `app/api/integrations/google/init/route.ts`
- **Archivo**: `app/api/integrations/google/callback/route.ts`
- **Estado**: Credenciales están en .env.local
- **Función**: Conectar cuentas Gmail, no autenticación de usuario

### 1.6 Flujo Correcto de Google OAuth

```
Usuario en /pricing o /start
  ↓
Click "Continuar con Google"
  ↓
AuthModal.handleGoogle() o handleGoogleLogin()
  ↓
supabase.auth.signInWithOAuth({ provider: "google" })
  ↓
REDIRIGE A: https://accounts.google.com/o/oauth2/v2/auth?...
  ↓
Google solicita consentimiento del usuario
  ↓
Google REDIRIGE BACK A: https://chyzxaspglbwnenagtjv.supabase.co/auth/v1/callback
  ↓
Supabase crea/actualiza auth.users
  ↓
Supabase redirige a: /start/agents (o redirectTo)
  ↓
Usuario entra en la app con sesión activa
```

**⚠️ SI FALLA EN PASO 5 (Supabase no está configurado con Google OAuth):**
- El usuario ve error en Google auth
- O la página se queda cargando
- O Supabase no reconoce las credenciales

---

## PROBLEMA 2: FLUJO DEMO/TRIAL NO CARGA DATOS

### 2.1 Archivos Involucrados

| Archivo | Líneas | Función |
|---------|--------|---------|
| `/accept-invite/[inviteId]/page.tsx` | 114-172 | Crear usuario demo |
| `MainLayout.tsx` | 322-531 | Cargar suscripción y features |
| `guards.ts` | 58-91 | Validar acceso por tenant_id |

### 2.2 Flujo de Aceptación de Invitación

```tsx
// LÍNEA 114-134: Crear usuario en auth
const { data: authData } = await supabase.auth.signUp({
  email: invite.email,
  password,
  options: {
    data: {
      role: invite.role,
      access_level: invite.access_level,
      // ❌ NO GUARDA: tenant_id
    },
  },
});

// LÍNEA 144-154: Agregar como platform_admin
const { error: adminError } = await supabase
  .from("platform_admins")
  .insert({
    auth_user_id: authData.user.id,
  })
  .select()
  .single();

// LÍNEA 157-164: Marcar invitación como aceptada
const { error: inviteError } = await supabase
  .from("admin_invites")
  .update({ status: "accepted" })
  .eq("id", invite.id);
```

### 2.3 PROBLEMA: Flujo Incompleto

**❌ PROBLEMA A: No se crea tenant_id**
```
Usuario demo acepta invitación
  ↓
Se crea en auth.users (OK)
  ↓
Se agrega a platform_admins (OK)
  ↓
PERO: No hay tenant_id en user_metadata
PERO: No hay entrada en tenant
PERO: No hay entrada en team_members
```

**❌ PROBLEMA B: MainLayout no puede detectar tenant_id**
```tsx
// MainLayout.tsx línea 395-410
const fetchUserSubscription = async (userId, tenantId) => {
  // PASO 1: Buscar por user_id (para admins)
  // PASO 2: Si no encontró, buscar por tenant_id (FALLA: tenantId=null)
  // PASO 3: Si aún no, buscar en team_members (FALLA: no existe team_member)
  
  // RESULTADO: activeSub = null
  applySubscription(null);  // ❌ Solo habilita "demo"
}
```

**❌ PROBLEMA C: Sin subscription, sin features**
```tsx
// MainLayout.tsx línea 322-339
const applySubscription = (activeSub) => {
  if (activeSub) {
    setEnabledFeatures(ALL_FEATURES);  // Todo desbloqueado
  } else {
    setEnabledFeatures(["demo"]);  // ❌ Solo "demo"
  }
}

const PLAN_FEATURES = {
  free: ["demo"],  // ← Usuario demo obtiene esto
  Básico: ALL_FEATURES,
  Growth: ALL_FEATURES,
  // ...
}
```

### 2.4 API Guards Bloquean Acceso

```tsx
// guards.ts línea 58-91
export async function assertTenantAccess({ req, requestedTenantId }) {
  const { user } = await getRequestUser(req);
  
  // ✅ PASO 1: Verificar si es platform_admin
  const isAdmin = await isPlatformAdmin(user.id);
  if (isAdmin) {
    // Si ES admin, permite pero requiere requestedTenantId
    if (!requestedTenantId) {
      return { ok: false, error: "Missing tenantId" };  // ❌
    }
    return { ok: true, tenantId: requestedTenantId };
  }
  
  // ❌ PASO 2: Si NO es platform_admin, busca en team_members
  const tm = await getTeamMemberByAuthUserId(user.id);
  if (!tm.row?.tenant_id) {
    return { ok: false, status: 403, error: "Forbidden" };  // ❌
  }
}
```

**CONCLUSIÓN**: El usuario demo es platform_admin, pero:
- No puede llamar APIs sin proporcionar `requestedTenantId`
- No tiene asignado un `tenant_id` donde los datos existan
- Las APIs retornan 403 Forbidden

### 2.5 Comparación: Flujo Correcto (info@botz.fyi)

**¿POR QUÉ FUNCIONA info@botz.fyi?**

1. **Supuesto**: Fue creado como usuario regular con empresa/tenant asignado
2. **Flow**:
   ```
   Usuario hace login con info@botz.fyi
     ↓
   Se verifica sesión en Supabase
     ↓
   MainLayout detecta:
     - user.id = AUTH_ID
     - user.email = info@botz.fyi
     ↓
   AuthRoleContext busca en team_members:
     - email = info@botz.fyi
     - Encuentra: tenant_id = XXXX-XXXX-XXXX
     ↓
   MainLayout carga subscriptions:
     - Busca en tabla subscriptions donde tenant_id = XXXX-XXXX-XXXX
     - Encuentra plan pagado o trial
     ↓
   applySubscription(sub)
     - setEnabledFeatures(ALL_FEATURES)  ← TODO DESBLOQUEADO
     ↓
   Cuando llama APIs:
     - Envía Beare
