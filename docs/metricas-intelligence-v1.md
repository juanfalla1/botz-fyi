# Metricas Intelligence v1 (Universal)

Esta iteracion agrega un slice vertical universal con ingesta flexible, perfilado, mapeo semantico inicial, modelo canonico minimo, SQL seguro v1, analisis de variaciones y alertas.

## Endpoints implementados

- `POST /api/uploads` (multipart `file`, opcional `workspace_id`)
- `GET /api/uploads/:id/status`
- `GET /api/datasets`
- `GET /api/datasets/:id/profile`
- `POST /api/datasets/:id/map-schema`
- `POST /api/datasets/:id/build-model`
- `GET /api/metrics/catalog`
- `POST /api/metrics/query`
- `POST /api/sql/query`
- `GET /api/analysis/variance`
- `GET /api/analysis/drivers`
- `GET /api/analysis/mix`
- `GET /api/analysis/price-volume`
- `POST /api/insights/generate`
- `GET /api/alerts`
- `POST /api/alerts/rules`

## Notas tecnicas

- Almacenamiento v1 en `.data/intelligence-v1/db.json` para acelerar entrega end-to-end.
- Parser universal soporta `xlsx/xls/csv/tsv` con inferencia basica de encabezados, delimitador y mapeo semantico.
- Se crean hechos canonicos minimos (`facts_sales`) al ejecutar `build-model`.
- SQL v1 es seguro y acotado: soporta patrones de consulta frecuentes y fallback paginado.

## Ejemplo rapido

1. `POST /api/uploads` con un archivo de ventas.
2. Consultar `dataset_id` en respuesta.
3. `POST /api/datasets/:id/build-model`.
4. `GET /api/analysis/variance?dataset_id=...&dimension=category&from_month=2026-01&to_month=2026-02`.
