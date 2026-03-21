# Evolution Webhook V2 (FSM)

This project now runs a strict FSM flow behind the main Evolution webhook using feature flag:

- `WHATSAPP_USE_V2=true` (recommended)

The V2 FSM is currently executed from `app/api/agents/channels/evolution/webhook/route.ts` and is designed to be:

- Deterministic state transitions
- Catalog/price/datasheet DB-first
- Controlled fallbacks without hallucinations

## Supported flow

1. `idle`
2. `strict_need_spec`
3. `strict_need_industry`
4. `strict_choose_family`
5. `strict_choose_model`
6. `strict_choose_action`
7. `strict_quote_data`
8. `done`

## Switch

Set in `.env.local`:

`WHATSAPP_USE_V2=true`

Then restart/redeploy webhook runtime.
