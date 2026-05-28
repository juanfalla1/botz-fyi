# CRM Mock de prueba (para n8n)

Mock API para probar los workflows VITA sin depender del CRM real del cliente.

## Endpoints incluidos

- `GET /health`
- `GET /api/contacts/:contact_id/context`
- `POST /api/contacts/:contact_id/messages`
- `POST /api/contacts/:contact_id/tags`
- `PATCH /api/contacts/:contact_id/fields`
- `POST /api/contacts/:contact_id/mark-cold`
- `POST /api/contacts/:contact_id/mark-reactivated`
- `GET /api/eligibility/inactivity?cadence=24h|48h|72h`
- `GET /api/eligibility/inactivity/cold-transition`
- `GET /api/eligibility/reactivated-replied`
- `GET /api/eligibility/reactivation?cadence=60d|65d|70d`

## Uso local

```bash
cd app/api/n8n/mock-crm
npm install
npm start
```

Base URL local: `http://localhost:3000`

## Variables en n8n

En tu servicio de n8n (Render), configura:

- `CRM_BASE_URL` = URL del mock (ej. `https://tu-mock.onrender.com`)
- `CRM_API_KEY` = cualquier valor (ej. `test_key`)

Con eso los workflows pueden ejecutarse end-to-end en modo prueba.
