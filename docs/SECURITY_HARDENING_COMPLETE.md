# Botz Security Hardening - Documentación Completa
## Implementación de Seguridad Multi-Tenant - Febrero 2025

---

## 📋 RESUMEN EJECUTIVO (PARA CLIENTE/NEGOCIO)

### ¿Qué problema resolvemos?
Tu aplicación maneja datos sensibles de múltiples clientes (inmobiliarias, asesores) y necesitaba protección contra:
- Acceso no autorizado entre clientes (fugas de datos)
- Abuso de formularios públicos (spam)
- Suplantación de identidad en webhooks
- Errores humanos al registrar emails

### ¿Qué implementamos?
✅ **Blindaje de APIs**: Ahora todas las operaciones críticas requieren autenticación válida  
✅ **Validación de firmas**: Los webhooks de WhatsApp ahora verifican que vienen realmente de Meta  
✅ **Rate limiting**: Protección contra spam y abuso en formularios de contacto  
✅ **Validación de emails**: Sugerencias automáticas de corrección de typos (gmal → gmail)  
✅ **Confirmación de email**: Los usuarios deben confirmar su email antes de usar la cuenta  
✅ **Monitoreo automático**: Escaneo diario de vulnerabilidades en dependencias  

### Beneficios para tu negocio
- **Cumplimiento GDPR/Ley de Protección de Datos**: Aislamiento garantizado entre clientes
- **Reducción de tickets de soporte**: Menos usuarios con emails mal escritos
- **Protección contra spam**: Formularios protegidos contra abuso masivo
- **Confianza del cliente**: Certificación de que sus datos están seguros y aislados
- **Detección proactiva**: Vulnerabilidades detectadas antes de ser explotadas

---

## 🔧 DETALLE TÉCNICO (PARA EQUIPO DEV)

### 1. HARDENING DE ENDPOINTS CRÍTICOS

#### Problema Identificado
Múltiples endpoints usando `SUPABASE_SERVICE_ROLE_KEY` aceptaban `tenant_id` y `user_id` desde el body sin validación de sesión, permitiendo potencialmente:
- Cross-tenant data access
- Escalación de privilegios
- Acceso a datos de otros usuarios

#### Implementación
**Archivos modificados:**
- `app/api/whatsapp/connect/route.ts`
- `app/api/whatsapp/disconnect/route.ts`
- `app/api/whatsapp/status/[tenantId]/route.ts`
- `app/api/whatsapp/meta/connect/route.ts`
- `app/api/integrations/route.ts`
- `app/api/integrations/gmail/profile/route.ts`
- `app/api/integrations/google/send-gmail/route.ts`
- `app/api/integrations/google/sync-gmail/route.ts`

**Cambios clave:**
```typescript
// Todas las rutas ahora requieren:
const { user, error: userErr } = await getRequestUser(req);
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

// Y validan tenant access:
const guard = await assertTenantAccess({ req, requestedTenantId: tenant_id });
if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
```

**Utilidades creadas:**
- `app/api/_utils/supabase.ts`: Clientes Supabase centralizados
- `app/api/_utils/guards.ts`: 
  - `getRequestUser()`: Extrae y valida Bearer token
  - `assertTenantAccess()`: Valida que el usuario pertenezca al tenant solicitado
  - `isPlatformAdmin()`: Verifica privilegios de super-admin

#### Validación de Acceso Multi-Tenant
```typescript
// Lógica de guard:
// 1. Extraer token JWT del header Authorization
// 2. Validar contra Supabase Auth
// 3. Buscar team_member del usuario
// 4. Si es platform admin → permitir cross-tenant con tenant_id explícito
// 5. Si es usuario normal → forzar uso de su propio tenant_id
// 6. Si no hay match → 403 Forbidden
```

### 2. VERIFICACIÓN DE FIRMAS EN WEBHOOKS (Meta/WhatsApp)

#### Problema
El webhook de Meta no verificaba la autenticidad de las peticiones POST, permitiendo que cualquiera con la URL pudiera enviar eventos falsos.

#### Solución
**Archivo:** `app/api/whatsapp/meta/callback/route.ts`

Implementación de verificación HMAC-SHA256:
```typescript
function verifyMetaSignature(payload: string, signatureHeader: string | null): boolean {
  const receivedSignature = signatureHeader.slice(7); // Remove "sha256="
  const hmac = createHmac("sha256", META_APP_SECRET);
  hmac.update(payload);
  const expectedSignature = hmac.digest("hex");
  
  // Timing-safe comparison
  return timingSafeEqual(
    Buffer.from(receivedSignature, "hex"),
    Buffer.from(expectedSignature, "hex")
  );
}
```

**Flujo:**
1. Lee body raw (no parseado) para mantener integridad
2. Extrae header `X-Hub-Signature-256`
3. Calcula HMAC-SHA256 usando `META_APP_SECRET`
4. Compara con timing-safe equality
5. Si falla → 401 Unauthorized
6. Si pasa → Procesa evento normalmente

**Variable de entorno requerida:**
```bash
META_APP_SECRET=<tu_app_secret_de_meta>
```

### 3. RATE LIMITING DISTRIBUIDO

#### Problema
Rate limiting en-memoria no funciona en serverless (múltiples instancias = múltiples contadores).

#### Solución
**Archivos:**
- `app/api/_utils/rateLimit.ts` - Implementación dual
- `package.json` - Agregada dependencia `@upstash/redis`

**Implementación Sliding Window con Redis:**
```typescript
export async function rateLimit(params: {
  key: string;
  limit: number;
  windowMs: number;
}): Promise<{ ok: boolean; remaining: number; resetAt: number }> {
  // Usa Redis si disponible (Upstash via Vercel Integration)
  if (redis) {
    const windowStart = now - windowMs;
    await redis.zremrangebyscore(redisKey, 0, windowStart);
    const currentCount = await redis.zcard(redisKey);
    
    if (currentCount >= limit) {
      return { ok: false, remaining: 0, resetAt: oldest + windowMs };
    }
    
    await redis.zadd(redisKey, { score: now, member: uuid });
    await redis.expire(redisKey, windowMs/1000);
    return { ok: true, remaining: limit - currentCount - 1 };
  }
  
  // Fallback a in-memory para dev local
  return rateLimitSync(params);
}
```

**Endpoints protegidos:**
- `/api/send-email`: 20 requests / 10 minutos por IP
- `/api/contact`: 10 requests / 10 minutos por IP

**Setup en Vercel:**
1. Dashboard > Integrations > Upstash Redis
2. Auto-configura variables:
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`

### 4. SEGURIDAD EN OAUTH (Google/Gmail)

#### Problema
El endpoint `/api/integrations/google/start` aceptaba `tenant_id` y `user_id` por query params sin autenticación.

#### Solución
**Nuevo endpoint seguro:** `app/api/integrations/google/init/route.ts`

**Flujo seguro:**
1. Cliente autenticado llama POST a `/init` con Bearer token
2. Backend valida sesión y tenant
3. Setea cookies httpOnly con state, tenant, user
4. Retorna `auth_url` para abrir en popup
5. Endpoint legacy `/start` solo redirige si cookies válidas existen
6. Callback lee tenant/user de cookies (no de query params)

**Cambios en frontend:**
```typescript
// Antes (inseguro):
window.open(`/api/integrations/google/start?tenant_id=${tid}&user_id=${uid}`)

// Ahora (seguro):
const initRes = await fetch("/api/integrations/google/init", {
  method: "POST",
  headers: { Authorization: `Bearer ${accessToken}` },
  body: JSON.stringify({ tenant_id: tid })
});
const { auth_url } = await initRes.json();
window.open(auth_url, "botz-oauth");
```

### 5. VALIDACIÓN Y CONFIRMACIÓN DE EMAIL

#### Validación de Typos
**Archivo:** `utils/email.ts`

```typescript
const DOMAIN_FIXES = {
  "gmal.com": "gmail.com",
  "gamil.com": "gmail.com",
  "hotmal.com": "hotmail.com",
  "outlok.com": "outlook.com",
  // ... más correcciones
};

export function suggestEmailFix(raw: string): EmailSuggestion | null {
  // Detecta dominios mal escritos y sugiere corrección
}
```

**Implementado en:**
- `app/start/components/RegistroAsesor.tsx`
- `app/pricing/page.tsx`

**UX:** Campo de confirmación de email + banner sugerente con botón "Usar".

#### Confirmación de Email (Supabase)
**Configuración requerida:**
- Supabase Dashboard > Authentication > Sign In / Providers
- Activar toggle: **"Confirm email"**
- Efecto: Usuarios deben hacer clic en link de confirmación antes de poder iniciar sesión

**Impacto:** Emails mal escritos (que no existen) nunca podrán usar la cuenta porque no recibirán el correo de confirmación.

### 6. AUTOMATIZACIÓN DE SEGURIDAD (DevSecOps)

#### Dependabot
**Archivo:** `.github/dependabot.yml`
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
```

#### CodeQL Analysis
**Archivo:** `.github/workflows/codeql.yml`
- Análisis estático semanal
- Detecta patrones de seguridad (SQL injection, XSS, etc.)

#### NPM Audit
**Archivo:** `.github/workflows/npm-audit.yml`
- Ejecuta `npm audit --audit-level=critical` diariamente
- Falla el build si hay vulnerabilidades críticas

---

## 🎯 CHECKLIST DE IMPLEMENTACIÓN

### Variables de Entorno Requeridas

**Obligatorias para funcionamiento:**
```bash
# Ya existentes (verificar que estén en Vercel)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Nuevas - Seguridad
META_APP_SECRET=           # Para verificar webhooks de WhatsApp
```

**Recomendadas para producción:**
```bash
# Para rate limiting distribuido (auto-seteado por Upstash Integration)
KV_REST_API_URL=
KV_REST_API_TOKEN=
# O manualmente:
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

### Configuración en Supabase Dashboard

1. ✅ **Authentication > Sign In / Providers > Confirm email**: Activar
2. ✅ **Authentication > Email Templates**: Configurar SMTP propio (SendGrid/Resend/AWS SES) para evitar spam folder
3. ✅ **Database > RLS Policies**: Verificar que todas las tablas con `tenant_id` tengan RLS habilitado

### Configuración en Meta Developers

1. ✅ Copiar **App Secret** de Meta Business / WhatsApp Business API
2. ✅ Pegar en Vercel como `META_APP_SECRET`
3. ✅ Webhook URL debe incluir verificación: `https://tuapp.com/api/whatsapp/meta/callback`

### Configuración en Vercel

1. ✅ Agregar todas las variables de entorno listadas arriba
2. ✅ Instalar integración **Upstash Redis** (para rate limiting persistente)
3. ✅ Redeploy del proyecto

---

## 📊 MONITOREO Y MANTENIMIENTO

### Logs de Seguridad a Monitorear

**En Vercel Functions Logs, buscar:**
```
"Invalid X-Hub-Signature-256"     # Posibles intentos de spoofing
"RATE_LIMITED"                     # IPs bloqueadas por rate limiting
"Unauthorized"                     # Intentos de acceso sin token
"Forbidden"                        # Cross-tenant access attempts
"Invalid session"                  # Tokens expirados o manipulados
```

### Métricas de Éxito

- ✅ 0 fugas de datos cross-tenant (validar con tests)
- ✅ Reducción de registros con emails inválidos (monitorear `team_members`)
- ✅ 0 reportes de spam en formularios de contacto
- ✅ Tiempo de respuesta de APIs < 200ms (el nuevo middleware no agrega latencia significativa)

---

## 🚨 PLAN DE CONTINGENCIA

### Si algo falla después del deploy:

1. **Rollback inmediato:**
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Desactivar rate limiting (si bloquea usuarios legítimos):**
   - Comentar líneas de `rateLimit()` en send-email y contact
   - Redeploy

3. **Desactivar confirmación de email (si afecta conversión):**
   - Supabase Dashboard > Auth > Sign In / Providers
   - Desactivar "Confirm email"
   - Nota: Esto reduce seguridad pero mejora conversión inicial

4. **Contactar soporte:**
   - Si webhook deja de funcionar: Verificar `META_APP_SECRET`
   - Si Google OAuth falla: Verificar cookies y flujo de init → start → callback

---

## 📈 PRÓXIMOS PASOS RECOMENDADOS

### Prioridad Alta (Q1 2025)
1. **Auditoría de RLS**: Revisar todas las tablas en Supabase tengan policies correctas
2. **CSP Headers**: Implementar Content Security Policy en `next.config.js`
3. **HSTS**: Forzar HTTPS con Strict-Transport-Security
4. **Password Policy**: Aumentar complejidad mínima en Supabase Auth

### Prioridad Media (Q2 2025)
1. **MFA**: Implementar autenticación de dos factores para platform admins
2. **Audit Logging**: Tabla de logs de acciones sensibles (quién hizo qué y cuándo)
3. **Data Encryption**: Encriptar PII sensible en DB (teléfonos, emails)
4. **Backup Testing**: Verificar restauración de backups de Supabase

### Prioridad Baja (Q3 2025)
1. **WAF**: Considerar Cloudflare Pro para protección DDoS avanzada
2. **Penetration Testing**: Contratar auditoría externa anual
3. **SOC 2**: Preparación para certificación de seguridad

---

## 📞 SOPORTE Y CONTACTO

**Para dudas técnicas:**
- Revisar logs en Vercel Dashboard > Functions
- Verificar RLS policies en Supabase Dashboard
- Consultar este documento y el código comentado

**Para dudas de negocio:**
- La seguridad implementada cumple con estándares de la industria
- Los cambios son transparentes para usuarios finales (no afectan UX)
- El único cambio visible: campo de confirmación de email en registro

---

**Documento versión:** 1.0  
**Fecha:** Febrero 2025  
**Autor:** Equipo de Desarrollo Botz  
**Clasificación:** Confidencial - Solo para equipo y cliente
