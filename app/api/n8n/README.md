# BOTZ Job Hunter

Workflow n8n para buscar, extraer, validar y clasificar vacantes laborales con política fail-closed y certificación obligatoria de cero inglés.

## Archivos

- `botz-job-hunter.json`: workflow importable en n8n.
- `job_hunter_jobs.sql`: tabla Postgres/Supabase requerida.
- `README.md`: configuración necesaria.

## Variables de entorno

Configura estas variables en el entorno donde corre n8n:

- `SEARCH_API_URL`: endpoint del proveedor de búsqueda web.
- `SEARCH_API_KEY`: API key del proveedor de búsqueda web.
- `GOOGLE_CLOUD_PROJECT`: ID del proyecto Google Cloud.
- `GOOGLE_CLOUD_LOCATION`: región de Vertex AI.
- `GOOGLE_AGENT_ID`: ID del agente existente `BOTZ Job Validator`.
- `SECOND_VALIDATOR_URL`: endpoint del segundo validador independiente.
- `SECOND_VALIDATOR_API_KEY`: API key del segundo validador, si aplica.

## Credenciales n8n

- Configura una credencial Postgres para Supabase/Postgres y asígnala a los nodos Postgres del workflow.
- Configura una credencial Google OAuth2 con permisos para invocar Vertex AI y asígnala al nodo `GOOGLE AGENT VALIDATOR - BOTZ Job Validator`.
- No hay secretos incluidos en el JSON.

## Google Vertex AI

El workflow incluye un HTTP Request preparado para invocar un agente existente en Vertex AI usando:

`https://{{$env.GOOGLE_CLOUD_LOCATION}}-aiplatform.googleapis.com/v1/projects/{{$env.GOOGLE_CLOUD_PROJECT}}/locations/{{$env.GOOGLE_CLOUD_LOCATION}}/reasoningEngines/{{$env.GOOGLE_AGENT_ID}}:query`

Si tu agente `BOTZ Job Validator` está expuesto por otro endpoint oficial de Vertex AI, ajusta solo la URL del nodo manteniendo las variables indicadas.

## Regla crítica cero inglés

Una vacante solo puede quedar `READY_TO_APPLY` si ambas validaciones certifican:

- Se revisó la descripción completa.
- No se exige inglés.
- No se prefiere inglés.
- No se exige bilingüismo.
- No aparece nivel A1, A2, B1, B2, C1 o C2 asociado al inglés.
- Ambos validadores retornan `PASS`.

Si no se pudo leer la descripción completa o existe duda, el estado final es `NEEDS_REVIEW`.

## Estados

- `FOUND`
- `REJECTED`
- `VALIDATED`
- `READY_TO_APPLY`
- `NEEDS_REVIEW`
- `APPLIED`
- `ERROR`

## Uso

1. Ejecuta `job_hunter_jobs.sql` en tu base Postgres/Supabase.
2. Importa `botz-job-hunter.json` en n8n.
3. Asigna las credenciales Postgres y Google OAuth2 a los nodos correspondientes.
4. Configura las variables de entorno.
5. Activa el workflow.

El nodo `PLAYWRIGHT APPLY - PHASE 2` es solo placeholder. Esta versión no aplica automáticamente a vacantes.
