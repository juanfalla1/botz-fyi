# Bot Colombia Chef + Evolution API

Implementacion separada de Avanza. Este webhook no usa la logica de `webhook-v2` de Avanza/Ohaus.

## Endpoint

- Webhook: `/api/agents/channels/evolution/colombiachef/webhook`
- Health: `GET /api/agents/channels/evolution/colombiachef/webhook`

## Variables de entorno

Configura en tu `.env.local` o en Vercel:

```env
EVOLUTION_API_URL=
EVOLUTION_API_KEY=
COLOMBIACHEF_EVOLUTION_INSTANCE=
COLOMBIACHEF_CATALOG_PATH=./colombiachef_bot_data.json
COLOMBIACHEF_TEST_MODE=true
COLOMBIACHEF_ALLOWED_TEST_NUMBER=573154829949
```

## Comportamiento

- Si `COLOMBIACHEF_TEST_MODE=true`, solo responde al numero `COLOMBIACHEF_ALLOWED_TEST_NUMBER`.
- Categorias soportadas: Chaquetas, Pantalones, Delantales, Gorros, Combos, Accesorios, Promos.
- Responde con enlaces directos de producto y politicas cuando el usuario pregunta por envios/cambios.

## Conexion en Evolution

1. En Evolution, abre la instancia definida en `COLOMBIACHEF_EVOLUTION_INSTANCE`.
2. Configura el webhook para eventos de mensajes entrantes.
3. URL del webhook: `https://TU-DOMINIO/api/agents/channels/evolution/colombiachef/webhook`
4. Guarda y prueba con el numero `573154829949`.

## Prueba recomendada

Mensajes de prueba:

- `hola`
- `quiero chaquetas`
- `tienen promos`
- `politica de envios`
- `delantal negro talla m`
