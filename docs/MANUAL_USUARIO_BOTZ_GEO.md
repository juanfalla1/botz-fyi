# Manual Real de Usuario y Capacitación BOTZ GEO

Versión: 2.0  
Base del documento: código real encontrado en `app/geo`, `GEO/app`, `GEO/components`, `app/api/geo` y `lib/geo`.  
Audiencia: usuarios de negocio, gerentes, directores de marketing, agencias y equipos operativos.  
Nota de alcance: este manual no documenta funcionalidades no encontradas en el código. Todo lo no comprobado se marca como `NO VERIFICADA`.

---

## Índice

1. [Qué Es BOTZ GEO Según La Plataforma Real](#1-qué-es-botz-geo-según-la-plataforma-real)
2. [Arquitectura Operativa Para Usuarios](#2-arquitectura-operativa-para-usuarios)
3. [Flujo Real De Trabajo](#3-flujo-real-de-trabajo)
4. [Pantallas Públicas](#4-pantallas-públicas)
5. [Autenticación Y Cuenta](#5-autenticación-y-cuenta)
6. [Dashboard Principal](#6-dashboard-principal)
7. [Proyectos](#7-proyectos)
8. [Auditorías GEO](#8-auditorías-geo)
9. [Detalle Real De Auditoría](#9-detalle-real-de-auditoría)
10. [Prompts](#10-prompts)
11. [Competidores](#11-competidores)
12. [Plan De Acción Y Recomendaciones](#12-plan-de-acción-y-recomendaciones)
13. [Reportes](#13-reportes)
14. [Automatizaciones](#14-automatizaciones)
15. [Billing, Uso Y Planes](#15-billing-uso-y-planes)
16. [Settings](#16-settings)
17. [Help Center Y Asistente](#17-help-center-y-asistente)
18. [Métricas Y Cálculos Reales](#18-métricas-y-cálculos-reales)
19. [Workflows Reales](#19-workflows-reales)
20. [Buenas Prácticas Operativas](#20-buenas-prácticas-operativas)
21. [Glosario Real](#21-glosario-real)
22. [Preguntas Frecuentes Operativas](#22-preguntas-frecuentes-operativas)
23. [Checklist De Capacitación](#23-checklist-de-capacitación)

---

# 1. Qué Es BOTZ GEO Según La Plataforma Real

BOTZ GEO es una plataforma SaaS para medir y mejorar la visibilidad de una marca en motores de IA. En el código real, la plataforma trabaja con:

- Proyectos de marca.
- Auditorías GEO.
- Motores IA seleccionables.
- Prompts generados por industria, país, marca, dominio y competidores.
- Respuestas guardadas por motor.
- GEO Score y métricas derivadas.
- Recomendaciones y plan de acción.
- Reportes.
- Automatizaciones.
- Competidores.
- Notificaciones y uso.

Motores encontrados en el código:

| Motor visible | ID interno | Uso real |
|---|---|---|
| ChatGPT | `openai` | Consultas a proveedor OpenAI |
| Gemini | `gemini` | Consultas a Gemini API o Vertex Gemini |
| Perplexity | `perplexity` | Consultas a Perplexity |
| AI Overviews | `ai_overviews` | Consulta vía SerpApi |

BOTZ GEO no debe interpretarse como una herramienta de SEO tradicional. En el flujo real, evalúa respuestas de motores IA, menciones de marca, citaciones, presencia competitiva y evidencia rastreable.

---

# 2. Arquitectura Operativa Para Usuarios

Diagrama de alto nivel de la experiencia de usuario:

```text
Landing /geo
  ↓
Registro o Login
  ↓
Dashboard /geo/app
  ↓
Proyecto
  ├─ Datos de marca
  ├─ Dominio
  ├─ País
  ├─ Idioma
  ├─ Industria
  └─ Competidores
  ↓
Auditoría GEO
  ├─ ChatGPT
  ├─ Gemini
  ├─ Perplexity
  └─ AI Overviews
  ↓
Procesamiento
  ├─ Prompts
  ├─ Respuestas IA
  ├─ Citaciones
  ├─ Crawled pages
  ├─ Mentions
  └─ Competitors
  ↓
Detalle De Auditoría
  ├─ GEO Score
  ├─ Visibilidad espontánea
  ├─ Visibilidad asistida
  ├─ Win rate competitivo
  ├─ Cobertura de citations
  └─ Evidencia por motor
  ↓
Plan De Acción
  ↓
Implementación
  ↓
Nueva Auditoría
```

---

# 3. Flujo Real De Trabajo

## Flujo recomendado para un usuario nuevo

1. Entrar a `/geo`.
2. Registrarse en `/geo/register`.
3. Iniciar sesión en `/geo/login`.
4. Entrar al dashboard `/geo/app`.
5. Crear un proyecto en `/geo/app/projects/new` o crear auditoría desde `/geo/app/audits/new`.
6. Configurar marca, dominio, país, idioma, industria y competidores.
7. Ejecutar auditoría.
8. Esperar procesamiento.
9. Revisar detalle de auditoría.
10. Revisar recomendaciones en el plan de acción.
11. Generar entregables o reportes.
12. Aplicar cambios.
13. Repetir auditoría.

## Estados reales visibles

| Estado | Dónde aparece | Interpretación |
|---|---|---|
| `queued` | Jobs de auditoría | Auditoría creada y en cola |
| `running` | Detalle de auditoría | El sistema está consultando motores y recolectando evidencia |
| `completed` | Auditorías y jobs | Auditoría finalizada con resultados persistidos |
| `failed` | Auditorías/jobs | El procesamiento falló; debe revisarse error |

---

# 4. Pantallas Públicas

## 4.1 Landing

| Campo | Detalle |
|---|---|
| URL | `/geo` |
| Archivo | `app/geo/page.tsx` |
| Objetivo | Presentar BOTZ GEO y llevar a registro, login o demo |
| Formularios | No se verificó formulario directo |
| Acciones | Login, registro, cambio ES/EN, ver demo, agendar demo |
| APIs | No se verificaron fetch/API directas |

Captura ilustrativa basada en estructura encontrada:

```text
┌──────────────────────────────────────────────────────────┐
│ BOTZ GEO  Producto  Características  Cómo funciona Blog  │
│                                      Iniciar sesión CTA   │
├──────────────────────────────────────────────────────────┤
│ Tu marca ya no solo debe aparecer en Google              │
│ Debe ser recomendada por la IA                           │
│ [Crear GEO Audit] [Ver demo]                             │
└──────────────────────────────────────────────────────────┘
```

## 4.2 Demo pública

| Campo | Detalle |
|---|---|
| URL | `/geo/demo` |
| Archivo | `app/geo/demo/page.tsx` |
| Objetivo | Mostrar demo guiada simulada |
| Formularios | No verificados |
| Acciones | Seleccionar pasos del tour, agendar demo |
| APIs | No APIs verificadas |

## 4.3 Agendar demo

| Campo | Detalle |
|---|---|
| URL | `/geo/agendar-demo` |
| Archivo | `app/geo/agendar-demo/page.tsx` |
| Objetivo | Solicitar demo comercial |
| Campos | Nombre, email, empresa, website, teléfono, interés |
| Acciones | Enviar solicitud, volver a GEO, elegir horario externo si existe `NEXT_PUBLIC_GEO_DEMO_CALENDAR_URL` |
| API | `POST /api/contact` |

---

# 5. Autenticación Y Cuenta

## 5.1 Login

| Campo | Detalle |
|---|---|
| URL | `/geo/login` |
| Archivos | `app/geo/login/page.tsx`, `GEO/app/geo/login/page.tsx` |
| Objetivo | Iniciar sesión en BOTZ GEO |
| Campos | Email, contraseña, recordarme |
| Acciones | Iniciar sesión, mostrar/ocultar password, login con Google, reenviar confirmación, ir a recuperar contraseña, ir a registro, cambio ES/EN |
| Servicios | `supabaseGeo.auth.signInWithPassword`, `getSession`, `resend`, `signInWithOAuth` |

## 5.2 Registro

| Campo | Detalle |
|---|---|
| URL | `/geo/register` |
| Archivos | `app/geo/register/page.tsx`, `GEO/app/geo/register/page.tsx` |
| Objetivo | Crear cuenta BOTZ GEO |
| Campos paso 1 | Nombre, email, contraseña |
| Campos paso 2 | Empresa, website, industria |
| Acciones | Continuar, volver, crear cuenta, mostrar/ocultar password, cambio ES/EN |
| Servicios | `supabaseGeo.auth.signUp`, `signInWithPassword`, `ensureTrialSubscription` |

## 5.3 Forgot password

| Campo | Detalle |
|---|---|
| URL | `/geo/forgot-password` |
| Objetivo | Enviar enlace de recuperación |
| Campo | Email |
| Acción | Enviar enlace, volver a login |
| Servicio | `supabaseGeo.auth.resetPasswordForEmail` |

## 5.4 Reset password

| Campo | Detalle |
|---|---|
| URL | `/geo/reset-password` |
| Objetivo | Definir nueva contraseña |
| Campos | Nueva contraseña, confirmar contraseña |
| Acción | Guardar nueva contraseña |
| Servicio | `supabaseGeo.auth.updateUser` |

---

# 6. Dashboard Principal

| Campo | Detalle |
|---|---|
| URL | `/geo/app` |
| Archivos | `app/geo/app/page.tsx`, `GEO/app/geo/app/page.tsx` |
| Objetivo | Mostrar resumen operativo de proyectos, auditorías, uso y actividad |
| APIs | `GET /api/geo/projects`, `GET /api/geo/audits`, `GET /api/geo/usage`, `GET /api/geo/competitors`, `GET /api/geo/notifications`, `PATCH /api/geo/notifications/[id]` |
| Acciones | Run GEO Audit, Upgrade, New/Create Project, View all, abrir proyecto, abrir auditoría, notificaciones, logout |

## Interpretación

El dashboard es la puerta de entrada después del login. Según el inventario del código, concentra estado de:

- Proyectos.
- Auditorías.
- Uso.
- Competidores.
- Notificaciones.

Campos exactos renderizados en el dashboard: `NO VERIFICADA` en este documento porque no se releyó todo el componente final durante esta revisión.

---

# 7. Proyectos

## 7.1 Listado de proyectos

| Campo | Detalle |
|---|---|
| URL | `/geo/app/projects` |
| Archivo | `app/geo/app/projects/page.tsx` |
| Objetivo | Ver portafolio de marcas/proyectos |
| Acciones | Nuevo proyecto, abrir proyecto, ejecutar auditoría, abrir prompts, abrir acciones, eliminar proyecto |
| APIs | `GET /api/geo/projects`, `GET /api/geo/audits`, `DELETE /api/geo/projects/[projectId]` |

## 7.2 Crear proyecto

| Campo | Detalle |
|---|---|
| URL | `/geo/app/projects/new` |
| Archivo | `app/geo/app/projects/new/page.tsx` |
| Objetivo | Crear proyecto GEO manualmente |
| Campos | `company_name`, `website_url`, `country`, `language`, `industry`, `business_goal` |
| Acción | Guardar proyecto |
| API | `POST /api/geo/projects` |

## 7.3 Hub de proyecto

| Campo | Detalle |
|---|---|
| URL | `/geo/app/projects/[projectId]` |
| Archivos | `app/geo/app/projects/[projectId]/page.tsx`, `GEO/components/geo/project-hub-real.tsx` |
| Objetivo | Ver contexto, auditorías, competidores, prompts y accesos del proyecto |
| Campos | Agregar competidor: nombre y dominio opcional |
| Acciones | Back dashboard, Prompts, New Audit, añadir competidor, abrir audit, recomendaciones, oportunidades, fixes, impacto, automations |
| APIs | `GET /api/geo/projects/[projectId]`, `GET /api/geo/audits`, `GET /api/geo/competitors?project_id=...`, `GET /api/geo/projects/[projectId]/prompts`, `POST /api/geo/competitors` |

## Reglas operativas de proyectos verificadas

- Al crear un proyecto desde `POST /api/geo/projects`, el backend crea prompts iniciales en `geo_prompts`.
- Los prompts iniciales dependen de idioma, industria, país, empresa y competidores.
- Si hay competidores, se crea prompt de comparación.
- La creación también inserta competidores si se envían en el body.

---

# 8. Auditorías GEO

## 8.1 Historial de auditorías

| Campo | Detalle |
|---|---|
| URL | `/geo/app/audits` |
| Archivo | `app/geo/app/audits/page.tsx` |
| Objetivo | Ver auditorías, estado, score, motores y fecha |
| Campos | Buscador visual por marca/dominio; filtros visuales |
| Acciones | New Audit/Create Audit, View, eliminar auditoría |
| APIs | `GET /api/geo/audits`, `GET /api/geo/usage`, `POST /api/geo/audits/delete` |

## Métricas visibles en historial

En el código de `app/geo/app/audits/page.tsx` se verifican:

| Métrica | Cálculo/UI |
|---|---|
| Total Audits | `apiAudits.length` |
| Avg GEO Score | Promedio de `final_score` no nulos |
| Active Monitoring | Jobs con estado `running` o `queued` |
| Prompts ejecutados | `usageTotals.prompt_used ?? 0` |

## 8.2 Nueva auditoría

| Campo | Detalle |
|---|---|
| URL | `/geo/app/audits/new` |
| Archivos | `app/geo/app/audits/new/page.tsx`, `GEO/app/geo/app/audits/new/page.tsx` |
| Objetivo | Crear proyecto y auditoría desde un formulario único |
| API previa | `GET /api/geo/auth-debug` |
| APIs principales | `POST /api/geo/projects`, `POST /api/geo/audits` |

### Campos reales

| Campo | Default verificado | Uso |
|---|---|---|
| Marca | Vacío | Nombre de empresa/marca |
| Website | Vacío | Dominio a auditar |
| País | Colombia | Contexto geográfico |
| Idioma | `es` | Idioma de prompts/proyecto |
| Industria | E-commerce | Categoría de análisis |
| Competidores | 5 inputs vacíos | Hasta 5 competidores |
| Motores | OpenAI, Gemini, Perplexity por defecto | Checkboxes de motores; AI Overviews también disponible |

### Flujo verificado al enviar

1. Valida marca y website.
2. Valida que haya al menos un motor seleccionado.
3. Obtiene sesión Supabase.
4. Consulta `/api/geo/auth-debug`.
5. Crea proyecto con `POST /api/geo/projects`.
6. Crea auditoría con `POST /api/geo/audits`.
7. Redirige a `/geo/app/audits`.

### Body verificado para proyecto

```json
{
  "company_name": "Marca",
  "website_url": "https://dominio.com",
  "country": "Colombia",
  "language": "es",
  "industry": "E-commerce",
  "business_goal": "Medir y mejorar la visibilidad de Marca en respuestas de IA para Colombia.",
  "competitors": []
}
```

### Body verificado para auditoría

```json
{
  "project_id": "...",
  "base_url": "https://dominio.com",
  "crawl_depth": 1,
  "engines": ["openai", "gemini", "perplexity"],
  "language": "es",
  "country": "Colombia",
  "competitors": [],
  "max_pages": 10,
  "max_prompts_per_engine": 5
}
```

Nota: `max_pages` y `max_prompts_per_engine` se envían desde UI, pero el pipeline real usa `GEO_MAX_PROMPTS_PER_ENGINE` para limitar prompts por motor.

## 8.3 Creación y procesamiento real

`POST /api/geo/audits` realiza:

1. Valida schema de auditoría.
2. Autentica usuario.
3. Verifica ownership del proyecto.
4. Consume uso tipo `audit`.
5. Inserta `geo_audits` con `status: pending`.
6. Inserta `audit_jobs` con `status: queued`.
7. Lanza procesamiento en background con `after()`.
8. Responde con `audit` y `job`.

Procesamiento en background:

- Recupera jobs del usuario.
- Marca job como `running`.
- Construye prompts.
- Ejecuta análisis.
- Persiste score, summary, evidencia, crawled pages, recommendations.
- Marca job como completed o failed.

---

# 9. Detalle Real De Auditoría

| Campo | Detalle |
|---|---|
| URLs | `/geo/app/audits/[id]`, `/geo/app/audits/detail?id=...`, `/geo/audit/[id]` |
| Archivo principal | `GEO/components/geo/audit-detail-real.tsx` |
| Objetivo | Mostrar evidencia y resultados reales de auditoría |
| APIs | `GET /api/geo/audits/[id]`, fallback `GET /api/geo/audits`, `POST /api/geo/audits/delete` |
| Acciones | Volver, descargar reporte PDF si hay proyecto, eliminar auditoría |

## Estado de procesamiento

La pantalla refresca cada 5 segundos.

Si el job está `pending`, `queued` o `running` y la auditoría no tiene `completed_at`, muestra:

```text
Auditoría en procesamiento
Botz GEO está consultando todos los motores seleccionados y recolectando evidencia real.
Estado actual: running
```

Si el job está `failed`, muestra error de procesamiento.

## Datos cargados por la API de detalle

`GET /api/geo/audits/[id]` devuelve:

- Auditoría completa.
- `audit_job` con estado y errores.
- Proyecto asociado.
- `ai_queries` con `ai_answers`.
- `brand_mentions`.
- `competitor_mentions`.
- `content_opportunities`.
- `crawled_pages`.

## Secciones verificadas en detalle

| Sección | Contenido |
|---|---|
| GEO Score | Puntaje final o `--` si no existe |
| Marca/dominio | `projects.company_name` o base URL |
| Visibilidad espontánea | Se muestra si hay muestra espontánea |
| Visibilidad asistida | Se muestra si hay muestra asistida |
| Win rate competitivo | Se muestra si hay resultados competitivos |
| Citations/fuentes | Desde `ai_answers.citations` |
| Motores | Conteo de engines y resultados |
| Prompts evaluados | Evidencia por prompt/motor |
| Rendimiento por motor IA | Barras por engine |
| Riesgos | Derivados de métricas duras |
| Acciones siguientes | Derivadas de métricas duras |
| Oportunidades de contenido | Desde recomendaciones o `content_opportunities` |
| Crawled pages | Si existen páginas rastreadas |

---

# 10. Prompts

| Campo | Detalle |
|---|---|
| URLs | `/geo/app/prompts`, `/geo/app/projects/[projectId]/prompts` |
| Archivo principal | `GEO/components/v0/app/geo/app/prompts/page.tsx` |
| Objetivo | Gestionar prompts monitoreados por proyecto y motor |
| APIs | `GET /api/geo/projects`, `GET /api/geo/prompts?project_id=...`, `POST /api/geo/prompts`, `PATCH /api/geo/prompts`, `DELETE /api/geo/prompts`, `POST /api/geo/prompts/run` |

## Campos del modal de prompt

| Campo | Uso |
|---|---|
| Texto del prompt | Pregunta que se monitorea |
| Categoría | Product, comparison, recommendation, alternative, etc. según UI |
| Motores IA | ChatGPT, Gemini, Perplexity, AI Overviews |
| País | Contexto geográfico |
| Idioma | Idioma del prompt |
| Proyecto | Proyecto asociado |
| Estado | Activo o pausado |

## Acciones verificadas

- Add Prompt.
- Editar.
- Duplicar.
- Eliminar.
- Activar/pausar.
- Ejecutar ahora.
- Ver respuestas.
- Cambiar vista cards/table.
- Filtrar por categoría, estado o motor.

## Calidad del prompt

La UI evalúa calidad del prompt en tres niveles:

| Nivel | Condición general |
|---|---|
| Alta | Intención clara y específica |
| Media | Se entiende, pero puede interpretarse con criterios distintos |
| Baja | Muy amplia o ambigua |

Si es Media o Baja, muestra advertencia y versión sugerida. El prompt original no se reemplaza automáticamente.

## Ejecución inmediata

`POST /api/geo/prompts/run` ejecuta un prompt guardado contra motores configurados y guarda resultados en metadata del prompt (`last_run_results`).

---

# 11. Competidores

| Campo | Detalle |
|---|---|
| URL | `/geo/app/competitors` |
| Archivo | `GEO/app/competitors/page.tsx` |
| Objetivo | Analizar competidores y benchmark GEO |
| Campos modal | Nombre, dominio, país opcional, industria opcional |
| Acciones | Add Competitor, Filter, Run Again, Start Monitoring, Delete |
| APIs | `GET /api/geo/competitors/insights`, `POST /api/geo/competitors`, `POST /api/geo/automations`, `DELETE /api/geo/competitors/[id]` |

Interpretación:

- Si hay muestra competitiva, BOTZ GEO puede mostrar competidores mencionados.
- Si no hay `competitive_results`, debe tratarse como `Sin muestra competitiva`.
- No se debe concluir que un competidor “ganó” sin evidencia de prompts comparativos.

---

# 12. Plan De Acción Y Recomendaciones

## 12.1 Plan de acción

| Campo | Detalle |
|---|---|
| URL | `/geo/app/projects/[projectId]/recommendations` |
| Archivo | `app/geo/app/projects/[projectId]/recommendations/page.tsx` |
| Objetivo | Mostrar acciones priorizadas y generar entregables |
| API | `GET /api/geo/projects/[projectId]/action-plan?locale=...` |
| Acciones | Back project, Run GEO Audit si no hay plan, Generate deliverable, copiar, descargar Markdown, descargar PDF, abrir reporte premium |

## Datos reales del action plan

`GET /api/geo/projects/[projectId]/action-plan` devuelve:

- `project`.
- `latest_audit`.
- `previous_audit`.
- `crawl_evidence`.
- `competitive_insights`.
- `execution_framework`.
- `actions`.
- `content_opportunities`.

## Acciones generadas por backend

El backend genera hasta 6 acciones ordenadas por prioridad. Categorías encontradas:

| ID/categoría | Condición general |
|---|---|
| `homepage-ai-positioning` | Visibilidad espontánea menor a 60 |
| `comparison-page` | Hay muestra competitiva y competidores válidos |
| `industry-landing` | Visibilidad espontánea menor a 70 |
| `competitive-evidence-gap` | Existe top competitor con evidencia |
| `faq-schema` | Siempre se agrega |
| `authority-proof` | Citaciones bajas o citation coverage menor a 50 |

Cada acción incluye:

- Problema/título.
- Descripción.
- Por qué importa.
- Prioridad.
- Impacto estimado.
- Dificultad.
- Tipo.
- Páginas afectadas.
- Acción sugerida.
- Entregables.
- Métrica que mejora.
- Lift estimado.
- Tiempo estimado.
- Evidencia.

## 12.2 Reporte premium del plan

| Campo | Detalle |
|---|---|
| URL | `/geo/app/projects/[projectId]/recommendations/report` |
| Objetivo | Reporte imprimible/exportable del plan GEO |
| Acciones | Back to plan, Export PDF, Print, selector ES/EN |
| API | `GET /api/geo/projects/[projectId]/action-plan?locale=...` |

---

# 13. Reportes

| Campo | Detalle |
|---|---|
| URL | `/geo/app/reports` |
| Archivo | `GEO/app/reports/page.tsx` |
| Objetivo | Crear, listar, exportar y eliminar reportes GEO |
| APIs | `GET /api/geo/reports`, `GET /api/geo/audits`, `POST /api/geo/reports`, `DELETE /api/geo/reports?id=...` |
| Acciones | Generate Report, Monthly, Competitive, Snapshot, Export CSV, Filter, View history, Share/copy summary, Open report, Delete report, Set Automation |

## Tipos de reporte reales

`POST /api/geo/reports` construye `snapshot` según `report_type`:

| Tipo | `report_focus` | Secciones |
|---|---|---|
| `monthly` | `monthly_performance` | Resumen mensual, GEO Score, visibilidad espontánea, citations, prioridades |
| `competitive` | `competitive_analysis` | Win rate competitivo, competidores mencionados, brechas, acciones |
| default/snapshot | `quick_snapshot` | GEO Score, visibilidad espontánea, win rate competitivo, citation coverage |

## Reglas verificadas

- Solo genera reportes sobre auditorías completadas.
- Si no hay auditorías completadas, responde error.
- Inserta en tabla `reports` con `status: ready`.
- Registra uso `report_exported`.

---

# 14. Automatizaciones

| Campo | Detalle |
|---|---|
| URL | `/geo/app/automations` |
| Fuente | `GEO/components/page.tsx` según mapeo |
| Objetivo | Programar auditorías/reportes/monitoreo GEO |
| APIs | `GET /api/geo/projects`, `GET /api/geo/automations`, `POST /api/geo/automations`, `PATCH /api/geo/automations/action`, `DELETE /api/geo/automations/action?id=...`, `POST /api/geo/automations/run` |

## Campos del modal

| Campo | Valores verificados |
|---|---|
| Nombre | Texto |
| Proyecto | Proyecto existente |
| Frecuencia | daily, weekly, monthly |
| Motores IA | Lista de motores |
| Email destino | Texto/email |
| Enabled | Toggle activo/inactivo |

## Acciones

- Nueva automatización.
- Editar.
- Pausar/activar.
- Ejecutar ahora.
- Eliminar.
- Guardar.

Funcionamiento programado real en producción: `NO VERIFICADA` desde UI; existe backend y scheduler relacionado.

---

# 15. Billing, Uso Y Planes

| Campo | Detalle |
|---|---|
| URL | `/geo/app/billing` |
| Archivo | `app/geo/app/billing/page.tsx` |
| Objetivo | Mostrar plan, límites, consumo e historial |
| API | `GET /api/geo/usage` |
| Acciones | Back dashboard, Request plan upgrade/change, early access |

## Uso real verificado

`lib/geo/repositories/usage.repo.ts` maneja:

- `usage_events`.
- Suscripción `trial` por defecto si no existe.
- Límites de auditorías y prompts si columnas existen.
- Eventos como `geo_audit_created`, `prompt_used`, `report_exported`.

Planes comerciales y cobro real: `NO VERIFICADA` en esta revisión.

---

# 16. Settings

| Campo | Detalle |
|---|---|
| URL | `/geo/app/settings` |
| Archivo | `GEO/app/settings/page.tsx` |
| Objetivo | Configuración de perfil, empresa, notificaciones, API keys, billing y seguridad |
| Servicio verificado | `supabaseGeo.auth.getUser` |

## Campos visibles según mapeo

| Sección | Campos |
|---|---|
| Perfil | Nombre, apellido, email, idioma |
| Empresa | Nombre, dominio, industria, tamaño |
| Notificaciones | Switches |
| API Keys | Mostrar/copiar/regenerar/crear key |
| Seguridad | Passwords |

Persistencia real de todos los botones de Settings: `NO VERIFICADA`.

---

# 17. Help Center Y Asistente

| Campo | Detalle |
|---|---|
| URL | `/geo/app/help` |
| Archivo | `GEO/app/help/page.tsx` |
| Objetivo | Centro de ayuda, FAQ, tutoriales y soporte |
| Campos | Buscador visual |
| Acciones | Expandir FAQ, abrir asistente GEO vía evento `open-geo-assistant` |
| APIs | No fetch verificado |

Asistente GEO API:

| Endpoint | Uso |
|---|---|
| `POST /api/geo/assistant` | Responde preguntas sobre Botz GEO y temas permitidos de GEO |

---

# 18. Métricas Y Cálculos Reales

Esta sección se basa en `lib/geo/engines/scoring.ts` y `lib/geo/pipeline/audit-pipeline.base.ts`.

## 18.1 Resultado normalizado

Cada respuesta se normaliza como `NormalizedEngineResult` e incluye señales como:

- `engine`.
- `prompt`.
- `promptKind`.
- `brandMentioned`.
- `rankingPosition`.
- `won`.
- `lost`.
- `uniqueCitations`.
- `citationDomains`.
- `mode` (`live` o `fallback`).
- `quality_flags`.

## 18.2 Tipos de prompt

| Tipo | Uso |
|---|---|
| `spontaneous` | Prompt neutral donde la marca no necesariamente se nombra |
| `assisted` | Prompt donde la marca puede estar nombrada |
| `competitive` | Prompt comparativo frente a competidores |
| `citation` | Prompt orientado a fuentes/citas |

## 18.3 Fórmulas reales

### Porcentaje básico

```text
pct(part, total) = total > 0 ? min(100, round(part / total * 100)) : 0
```

### AI Visibility

En `scoreSnapshotV1`, `ai_visibility` se guarda como `discoveryBase`:

```text
discoveryBase = spontaneous.length > 0 ? spontaneousVisibility : visibility
ai_visibility = discoveryBase
```

### Visibilidad espontánea

```text
spontaneous_visibility = mentions en prompts spontaneous / total prompts spontaneous
```

### Visibilidad asistida

```text
assisted_visibility = mentions en prompts assisted / total prompts assisted
```

### Win rate competitivo

```text
competitive_visibility = wins en prompts competitive / total prompts competitive
```

### Citation coverage

```text
citation_coverage = prompts citation con uniqueCitations > 0 o brandMentioned / total prompts citation
```

### Citations count

```text
citations_count = suma de uniqueCitations de todos los resultados
```

### Citation unique domains

```text
citations_unique_domains = cantidad de dominios únicos citados
```

### Prompts won

```text
prompts_won = cantidad de resultados con won = true
```

### Prompts lost

```text
prompts_lost = cantidad de resultados con lost = true
```

### Loss penalty

```text
lossPenalty = min(20, round(promptsLost / promptsTotal * 20))
```

### Citation score

```text
si hay citation prompts:
  citationScore = citationCoverage
si no hay citation prompts:
  citationScore = min(100, round(citations / promptsTotal * 25))
```

### GEO Score

```text
geoScore = round(
  clamp(
    discoveryBase * 0.6
    + assistedVisibility * 0.1
    + competitiveVisibility * 0.15
    + citationScore * 0.15
    - lossPenalty,
    0,
    100
  )
)
```

## 18.4 Engine breakdown

Por motor se calcula:

| Campo | Cálculo |
|---|---|
| `prompts_total` | Total de resultados del motor |
| `spontaneous_total` | Prompts spontaneous del motor |
| `spontaneous_mentions` | Mentions en spontaneous |
| `assisted_total` | Prompts assisted |
| `assisted_mentions` | Mentions en assisted |
| `competitive_total` | Prompts competitive |
| `competitive_wins` | Wins competitive |
| `citation_total` | Prompts citation |
| `citation_hits` | Citation prompts con citas o brandMentioned |
| `mentions` | Resultados con brandMentioned |
| `citations` | Suma uniqueCitations |
| `prompts_won` | Resultados won |
| `prompts_lost` | Resultados lost |
| `avg_rank` | Promedio de rankingPosition disponible |
| `fallback_count` | Resultados fallback |
| `live_count` | Resultados live |

## 18.5 Quality flags

Se agregan contadores de:

- `low_confidence`.
- `no_citations`.
- `brand_not_found`.
- `competitor_dominant`.
- `fallback_used`.

## 18.6 Persistencia del resumen

Al completar auditoría, se actualiza `geo_audits` con:

- `status: completed`.
- `final_score`.
- `summary` JSON.
- `completed_at`.

El `summary` incluye:

- `geo_score`.
- `ai_visibility`.
- `citations_count`.
- `citations_unique_domains`.
- `prompts_won`.
- `prompts_lost`.
- `spontaneous_visibility`.
- `assisted_visibility`.
- `competitive_visibility`.
- `citation_coverage`.
- `total_results`.
- `spontaneous_results`.
- `assisted_results`.
- `competitive_results`.
- `citation_results`.
- `engine_breakdown`.
- `quality_flags_aggregate`.
- `semantic_analysis`.
- `evaluated_prompts`.
- `content_opportunities`.
- `recommendations`.
- `crawl_evidence`.
- `provider_metadata`.
- `normalizer_version`.

---

# 19. Workflows Reales

## 19.1 Crear auditoría desde cero

```text
Usuario completa formulario
  ↓
GET /api/geo/auth-debug
  ↓
POST /api/geo/projects
  ↓
POST /api/geo/audits
  ↓
Se crea geo_audits pending
  ↓
Se crea audit_jobs queued
  ↓
after() procesa job en background
  ↓
Detalle muestra running y refresca cada 5s
  ↓
Auditoría completed o failed
```

## 19.2 Generación de prompts de auditoría

`buildBasePrompts(ctx)` genera templates por idioma.

Español:

```text
¿Cuáles son los mejores proveedores de {industria} en {país}?
¿Qué marca es más citada para soluciones de {industria}?
¿Qué empresa recomiendas para {industria} y por qué?
Encuentra fuentes confiables que mencionen {dominio}.
Compara {marca} vs {competidores} como proveedores de {industria} en {país}.
```

Inglés:

```text
What are the best {industry} providers in {country}?
Which brand is most cited for {industry} solutions?
What company do you recommend for {industry} and why?
Find trusted sources mentioning {domain}.
Compare {brand} vs {competitors} as {industry} providers in {country}.
```

Reglas verificadas:

- Máximo 3 competidores en prompt builder.
- Excluye competidor si es la misma entidad que el proyecto.
- Repite templates por cada motor seleccionado.

## 19.3 Ejecución de motores

`runRealAnalysisWithFallback`:

- Resuelve providers por engines.
- Limita prompts por motor con `GEO_MAX_PROMPTS_PER_ENGINE`, default 4.
- Ejecuta en concurrencia controlada con `GEO_ENGINE_CONCURRENCY`, default 6.
- Si un provider no está configurado, crea resultado fallback.
- Si un provider falla, crea resultado fallback con error.

## 19.4 Crawling

`runCrawlerWithBudget`:

- Usa `crawl_depth`.
- Calcula `maxPages = max(3, min(10, depth * 3))`.
- Timeout de crawler: 10 segundos.
- Persiste `crawled_pages` si hay resultados.

## 19.5 Reportes

```text
Usuario solicita reporte
  ↓
POST /api/geo/reports
  ↓
Busca última auditoría completed del proyecto
  ↓
Construye snapshot según report_type
  ↓
Inserta reports status ready
  ↓
Registra usage_event report_exported
```

---

# 20. Buenas Prácticas Operativas

## Qué hacer

- Configurar industria correcta antes de auditar.
- Seleccionar país correcto.
- Usar idioma correcto.
- Agregar competidores reales.
- Revisar si el detalle está `running` antes de interpretar resultados.
- No interpretar `Sin muestra` como fracaso si no hubo prompts de ese tipo.
- Revisar evidencia por prompt.
- Revisar fuentes/citations solo cuando existan en `ai_answers.citations`.
- Repetir auditoría tras aplicar cambios reales.

## Qué no hacer

- No usar una industria genérica si la empresa es e-commerce, retail, salud, etc.
- No agregar competidores de otra categoría.
- No concluir rendimiento competitivo sin `competitive_results > 0`.
- No tomar `fallback` como respuesta real del motor.
- No asumir que AI Overviews siempre devuelve un bloque generativo real.
- No repetir auditorías sin cambiar contenido o autoridad.

## Errores comunes reales

| Error | Consecuencia |
|---|---|
| Industria mal configurada | Prompts preguntan por una categoría incorrecta |
| Idioma incorrecto | Prompts salen en idioma no esperado |
| Competidores irrelevantes | Comparativas incoherentes |
| API key faltante | Provider queda fallback/error |
| Auditoría en running | Resultados aún no deben interpretarse |
| Gemini timeout | Resultado fallback con error de abort |

---

# 21. Glosario Real

| Término | Definición basada en código |
|---|---|
| Project | Marca configurada con dominio, país, idioma, industria y goal |
| Audit | Ejecución GEO asociada a proyecto |
| Audit Job | Trabajo de procesamiento con estado queued/running/completed/failed |
| Engine | Motor IA: openai, gemini, perplexity, ai_overviews |
| Prompt | Pregunta enviada a un motor |
| Prompt Kind | spontaneous, assisted, competitive, citation |
| Normalized Result | Resultado procesado con marca, ranking, citas y flags |
| GEO Score | Score calculado en `scoreSnapshotV1` |
| AI Visibility | Discovery base: spontaneous visibility o visibility general |
| Citation Coverage | Cobertura de prompts citation con fuentes o marca |
| Competitive Visibility | Wins en prompts competitive sobre total competitive |
| Fallback | Resultado no-live por provider no configurado o error |
| Crawled Pages | Páginas rastreadas del sitio auditado |
| Action Plan | Acciones generadas desde latest audit y contexto |
| Report Snapshot | Snapshot guardado en tabla reports |

---

# 22. Preguntas Frecuentes Operativas

1. **¿Dónde creo una auditoría?**  
En `/geo/app/audits/new`.

2. **¿Qué campos exige una auditoría?**  
Marca, website y al menos un motor IA.

3. **¿Qué pasa al iniciar auditoría?**  
Se crea proyecto, se crea auditoría, se crea job y se procesa en background.

4. **¿Por qué veo “Auditoría en procesamiento”?**  
Porque el job está `pending`, `queued` o `running` y aún no existe `completed_at`.

5. **¿Cada cuánto se actualiza el detalle?**  
Cada 5 segundos.

6. **¿Qué significa failed?**  
El job falló y debe revisarse `error_message` o `failed_reason`.

7. **¿Qué motores puedo seleccionar?**  
OpenAI/ChatGPT, Gemini, Perplexity y AI Overviews.

8. **¿Qué pasa si un motor no está configurado?**  
El resultado puede quedar como fallback con razón de configuración.

9. **¿Dónde veo respuestas por prompt?**  
En detalle de auditoría o en modal “Ver respuestas” dentro de Prompts.

10. **¿Dónde gestiono prompts manuales?**  
En `/geo/app/prompts` o `/geo/app/projects/[projectId]/prompts`.

11. **¿El sistema modifica automáticamente mi prompt si es malo?**  
No. Muestra advertencia y sugerencia, pero no reemplaza automáticamente.

12. **¿Dónde veo competidores?**  
En `/geo/app/competitors` y en el hub del proyecto.

13. **¿Dónde agrego competidores?**  
En Competitors o en el hub del proyecto.

14. **¿Cómo se calcula GEO Score?**  
Con discoveryBase 60%, assisted 10%, competitive 15%, citation score 15%, menos penalty por pérdidas.

15. **¿Qué es discoveryBase?**  
Visibilidad espontánea si hay prompts spontaneous; si no, visibilidad general.

16. **¿Por qué win rate competitivo aparece “Sin muestra”?**  
Porque no hay `competitive_results`.

17. **¿Dónde están los reportes?**  
En `/geo/app/reports`.

18. **¿Qué tipos de reporte existen?**  
Monthly, Competitive y Snapshot/default.

19. **¿Puedo generar reporte sin auditoría completed?**  
No. La API responde error si no hay auditoría completada.

20. **¿Dónde veo el plan de acción?**  
En `/geo/app/projects/[projectId]/recommendations`.

21. **¿Qué acciones genera el plan?**  
Home positioning, comparison page, industry landing, competitive evidence, FAQ/schema, authority proof.

22. **¿Dónde veo reporte premium imprimible?**  
En `/geo/app/projects/[projectId]/recommendations/report`.

23. **¿Dónde veo oportunidades de contenido?**  
En `/geo/app/projects/[projectId]/content-opportunities`.

24. **¿Dónde veo fixes técnicos?**  
En `/geo/app/projects/[projectId]/technical-fixes`.

25. **¿Dónde veo impacto?**  
En `/geo/app/projects/[projectId]/impact`.

26. **¿Dónde veo billing?**  
En `/geo/app/billing`.

27. **¿Dónde veo settings?**  
En `/geo/app/settings`.

28. **¿Settings guarda todos los cambios?**  
NO VERIFICADA.

29. **¿Dónde está help center?**  
En `/geo/app/help`.

30. **¿Hay asistente GEO?**  
Sí, existe `POST /api/geo/assistant` y un evento UI `open-geo-assistant`.

31. **¿Qué significa fallback?**  
Que no hubo respuesta live válida del provider.

32. **¿Qué significa citations_count?**  
Suma de `uniqueCitations` en resultados normalizados.

33. **¿Qué significa engine coverage?**  
NO VERIFICADA como métrica con ese nombre exacto; se puede inferir de engines y engine_breakdown.

34. **¿Qué significa share of voice?**  
NO VERIFICADA como métrica calculada con ese nombre exacto en `scoring.ts`.

35. **¿Qué significa sentiment?**  
Existe `semantic_analysis.sentiment` y brand_mentions sentiment, pero fórmula exacta visible en UI no está completamente documentada aquí.

36. **¿Qué significa recommendation rate?**  
NO VERIFICADA como métrica con ese nombre exacto.

37. **¿Cómo se generan prompts de auditoría?**  
Por idioma, industria, país, dominio y competidores.

38. **¿Cuántos competidores usa el prompt builder?**  
Hasta 3.

39. **¿Cuántos prompts por motor usa?**  
Default 4 por motor vía `GEO_MAX_PROMPTS_PER_ENGINE`.

40. **¿Corre prompts en paralelo?**  
Sí, con `GEO_ENGINE_CONCURRENCY`, default 6.

41. **¿AI Overviews usa Google directo?**  
Usa SerpApi (`https://serpapi.com/search.json`).

42. **¿Gemini puede usar Vertex?**  
Sí, si `GEMINI_PROVIDER=vertex` y credenciales están configuradas.

43. **¿Dónde se guardan respuestas IA?**  
En `ai_queries` y `ai_answers` vía pipeline.

44. **¿Dónde se guardan menciones de marca?**  
En `brand_mentions`.

45. **¿Dónde se guardan menciones de competidores?**  
En `competitor_mentions`.

46. **¿Dónde se guardan páginas crawleadas?**  
En `crawled_pages`.

47. **¿Qué pasa si crawler falla?**  
Se registra error no crítico y sigue con páginas vacías.

48. **¿Qué pasa si recommendations insert falla?**  
Se registra como error no crítico.

49. **¿Qué pasa si engine evidence falla?**  
Se registra error no crítico.

50. **¿Hay rutas legacy?**  
Sí: `/geo/audit/[id]` y `/geo/app/audits/detail?id=...` redirigen.

---

# 23. Checklist De Capacitación

## Para onboarding de un usuario nuevo

| Paso | Validado |
|---|---|
| Crear cuenta en `/geo/register` | ☐ |
| Iniciar sesión en `/geo/login` | ☐ |
| Entrar a `/geo/app` | ☐ |
| Crear proyecto con industria correcta | ☐ |
| Agregar competidores reales | ☐ |
| Ejecutar auditoría desde `/geo/app/audits/new` | ☐ |
| Esperar estado completed | ☐ |
| Abrir detalle de auditoría | ☐ |
| Revisar prompts evaluados | ☐ |
| Revisar GEO Score y métricas | ☐ |
| Revisar plan de acción | ☐ |
| Generar entregable o reporte | ☐ |
| Aplicar mejoras | ☐ |
| Ejecutar nueva auditoría | ☐ |

## Para capacitación de agencia

| Tema | Dominado |
|---|---|
| Diferencia entre proyecto y auditoría | ☐ |
| Configuración correcta de industria | ☐ |
| Interpretación de estado running/completed/failed | ☐ |
| Lectura de evidence por prompt | ☐ |
| Lectura de engine breakdown | ☐ |
| Interpretación de competitive sample | ☐ |
| Uso de action plan | ☐ |
| Generación de reportes | ☐ |
| Gestión de prompts manuales | ☐ |
| Gestión de competidores | ☐ |
