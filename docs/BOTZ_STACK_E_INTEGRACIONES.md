# Botz - Stack Tecnologico e Integraciones (Documento tecnico)

## 1) Resumen ejecutivo

Botz es una plataforma de automatizacion con IA que combina:

- Canales conversacionales (principalmente WhatsApp via Evolution/Meta).
- Motor de IA (OpenAI) para interpretacion, respuesta, cotizacion y automatizacion comercial.
- Backoffice CRM para pipeline, contactos, oportunidades y seguimiento.
- Orquestacion de workflows (n8n / flujos tipo phone call) para integraciones externas.
- Backend en Next.js (API Routes), persistencia en Supabase (Postgres + Auth + Storage).

Arquitectura de alto nivel:

`Frontend Next.js -> API Next.js -> Supabase + OpenAI + Evolution + Integraciones (n8n/Stripe/Google)`

---

## 2) Stack principal

## Frontend

- Next.js `^16.0.8`
- React `^19.1.0`
- TypeScript `5.8.3`
- TailwindCSS `^4.1.11` (+ estilos custom)
- UI/data libs:
  - `@tanstack/react-query`
  - `@tanstack/react-table`
  - `recharts`
  - `framer-motion`
  - `lucide-react`
  - `@xyflow/react` (builder/diagramas de flujos)

## Backend (BFF/API)

- Next.js Route Handlers en `app/api/**`
- Node runtime para endpoints de integracion
- SDKs y servicios:
  - `openai`
  - `@supabase/supabase-js`
  - `stripe`
  - `nodemailer`
  - `resend`
  - `@upstash/redis` (soporte cache/eventos)

## Datos

- Supabase Postgres (multi-tenant por `created_by` / `tenant_id`)
- Supabase Auth (login/signup + OTP personalizado)
- Migraciones SQL en `supabase/migrations`

## Documentos y archivos

- `jspdf`, `pdf-parse`, `mammoth`, `xlsx`, `papaparse`

---

## 3) Integraciones clave

## WhatsApp (principal)

- Proveedor: Evolution API
- Servicio: `lib/services/evolution.service.ts`
- Webhook principal:
  - `app/api/agents/channels/evolution/webhook/route.ts`
- Endpoints operativos:
  - `connect`, `disconnect`, `status`, `diagnostics`

Funcionalidades implementadas:

- Recepcion de mensajes inbound y respuesta AI.
- Memoria por conversacion (`whatsapp_memory`) y reconocimiento por telefono normalizado.
- Cotizacion automatica (PDF) con TRM del dia.
- Reenvio de cotizacion, ajuste de cantidades y continuidad contextual.
- Envio de ficha tecnica/imagen cuando aplica.
- Reglas de canal: priorizar envio por WhatsApp.

## IA / LLM

- OpenAI (`OPENAI_API_KEY`)
- Usado en:
  - Chat de canales
  - Clasificacion/respuesta comercial
  - Voz/TTS endpoints (segun modulo)

## CRM interno

Endpoints:

- `app/api/agents/crm/overview/route.ts`
- `app/api/agents/crm/contact/route.ts`
- `app/api/agents/crm/opportunities/[id]/route.ts`
- `app/api/agents/crm/settings/route.ts`
- `app/api/agents/crm/integration-access/route.ts` (autorizacion owner)

Regla actual de negocio:

- CRM habilitado por autorizacion owner/integracion (no auto-toggle por cliente).

## OTP / autenticacion segura

Endpoints:

- `app/api/auth/request-otp/route.ts`
- `app/api/auth/verify-otp/route.ts`
- `app/api/auth/complete-signup-otp/route.ts`
- `app/api/auth/reset-password-otp/route.ts`

Resultado:

- Flujo orientado a OTP para confirmacion y acceso.

## Llamada en vivo (web)

- Front CTA en `app/components/Agentes.tsx`
- Endpoint backend unificado:
  - `app/api/live-call/request/route.ts`

Comportamiento:

- Si existe `LIVE_CALL_WEBHOOK_URL` (o compat `NEXT_PUBLIC_LIVE_CALL_WEBHOOK_URL`), dispara integracion de llamada.
- Si no existe, fallback a registro de lead (`/api/register`).

## Pagos y billing

- Stripe:
  - `app/api/stripe/create-checkout-session/route.ts`
  - `app/api/stripe/webhook/route.ts`

## Integraciones Google

- OAuth callback:
  - `app/api/integrations/google/callback/route.ts`

## Email/transaccional

- `nodemailer` / `resend`

## Motor de calculo hipotecario y viabilidad (modulo hipotecario)

El modulo hipotecario corre en paralelo al modulo Agents y cubre:

- Calculo de cuota (sistema frances)
- Indicadores de viabilidad (DTI, LTV)
- Reglas por pais/institucion
- Scoring de leads y priorizacion comercial
- Flujos de salida (email/seguimiento)

Servicios internos:

- `app/start/services/mortgageCalculator.ts`
  - Motor principal de calculo hipotecario.
  - Calcula cuota mensual, interes total, costos estimados y viabilidad.
- `app/start/services/realBankingAPI.ts`
  - Integracion de tasas/score con APIs externas (ej. sandbox Bancolombia y Datacredito) cuando aplica.

Endpoints API relacionados (nombre exacto y para que sirven):

- `app/api/lead-scoring/route.ts`
  - Recibe datos del lead y calcula score/segmentacion para priorizacion.
- `app/api/send-email/route.ts`
  - Envio de correos transaccionales/comerciales del flujo hipotecario (aprobado, potencial, guia, etc.).
- `app/api/chat/route.ts`
  - Endpoint conversacional general de Botz; incluye contexto de modulo hipotecario (calculo, viabilidad, PDF).
- `app/api/whatsapp/meta/callback/route.ts`
  - Webhook de WhatsApp (Meta) para automatizaciones conversacionales y seguimiento.

Páginas/rutas de negocio hipotecario (front):

- `app/ia-hipotecaria/page.tsx`
- `app/bot-hipotecario-whatsapp/page.tsx`
- `app/start/page.tsx` (tabs hipoteca / control operativo)

Resultado funcional:

- Captura y calificacion de leads hipotecarios.
- Simulacion y viabilidad financiera.
- Activacion de acciones comerciales (CRM/WhatsApp/email) segun resultado.

---

## 4) Como integramos (patron tecnico)

Patron comun de integracion en Botz:

1. Front captura evento (ej. formulario, chat, accion CRM).
2. Front llama endpoint backend propio (`/api/...`).
3. Backend valida, normaliza y enriquece payload.
4. Backend persiste estado en Supabase.
5. Backend llama integracion externa (Evolution, webhook n8n, Stripe, etc.).
6. Backend registra trazabilidad (`metadata`, uso de creditos, estado de ejecucion).
7. Front recibe resultado y muestra estado usuario.

Ventajas:

- Seguridad (credenciales nunca expuestas en cliente).
- Reintentos/controles centralizados.
- Auditoria de eventos y debugging mas rapido.

---

## 5) Modelo de datos (resumen operativo)

Tablas relevantes (vista funcional):

- `ai_agents` - configuracion de agentes y flujos.
- `agent_channels` - canales conectados (WhatsApp/voz/etc.).
- `agent_conversations` - historial conversacional y metadata/memoria.
- `agent_quote_drafts` - cotizaciones preliminares + payload.
- `agent_crm_contacts` - contacto comercial consolidado.
- `agent_crm_settings` - personalizacion CRM por cliente.
- `agent_crm_access` - habilitacion CRM por owner/integracion.
- `agent_entitlements` - creditos/planes/uso del producto.
- `otp_sessions` - sesiones OTP para auth segura.

---

## 6) Variables de entorno relevantes

Core:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

IA:

- `OPENAI_API_KEY`

WhatsApp Evolution:

- `EVOLUTION_API_URL`
- `EVOLUTION_API_KEY`

CRM access control:

- `CRM_OWNER_EMAILS` (lista de owners autorizadores)

Llamadas:

- `LIVE_CALL_WEBHOOK_URL` (server-side recomendado)
- `NEXT_PUBLIC_LIVE_CALL_WEBHOOK_URL` (compatibilidad)

App/public:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_AGENTS_DEMO_VIDEO_URL`

Billing:

- Variables de Stripe (segun entorno)

---

## 7) Seguridad y buenas practicas ya usadas

- Credenciales sensibles usadas server-side.
- Normalizacion de telefono y validaciones previas.
- Bloqueo de acciones de alto impacto por rol/owner (ej. CRM access).
- Manejo de errores con fallback controlado.
- Logging tecnico en endpoints criticos para diagnostico.

---

## 8) Estado actual por modulo

- WhatsApp AI: operativo y endurecido (memoria, cotizacion, ficha, imagen, recall).
- CRM: operativo con control de habilitacion por owner.
- OTP auth: operativo con flujo personalizado.
- Live Call web CTA: operativo a nivel backend; llamada inmediata depende de webhook/proveedor de voz configurado.

---

## 9) Recomendacion de arquitectura de llamada IA (target)

Para llamada "de una" al enviar formulario:

`Frontend CTA -> /api/live-call/request -> n8n (orquestador) -> proveedor voz (Twilio/SIP/Vapi/Retell) -> agente IA`

Payload sugerido:

```json
{
  "nombre": "Cliente",
  "email": "cliente@correo.com",
  "telefono": "+573001112233",
  "interes": "Llamada en vivo de agente",
  "source": "botz_web_live_call",
  "trigger_now": true,
  "agent_id": "opcional"
}
```

---

## 10) Rutas de referencia rapida

- WhatsApp webhook: `app/api/agents/channels/evolution/webhook/route.ts`
- Servicio Evolution: `lib/services/evolution.service.ts`
- CRM UI: `app/start/agents/crm/page.tsx`
- CRM APIs: `app/api/agents/crm/*`
- OTP modal UI: `app/start/agents/components/AgentsAuthModal.tsx`
- OTP APIs: `app/api/auth/*`
- Live call API: `app/api/live-call/request/route.ts`
- Integracion access CRM: `app/api/agents/crm/integration-access/route.ts`
- Motor hipotecario: `app/start/services/mortgageCalculator.ts`
- Scoring hipotecario API: `app/api/lead-scoring/route.ts`
- Email hipotecario/transaccional: `app/api/send-email/route.ts`

---

Si quieres, puedo entregarte este mismo documento en PDF y en una version "ejecutiva" (1 pagina) para clientes o inversionistas.
