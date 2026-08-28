# BOTZ Marketing Command Center Architecture

Status: Phase 1 implementation baseline

## 1. Product boundary

BOTZ Marketing Command Center is a tenant-native module that joins paid media,
web analytics, leads, CRM outcomes, revenue attribution, alerts and AI-assisted
analysis. It is not a replacement interface for Meta Ads Manager or Google Ads.
Its primary job is to answer, for one authorized tenant:

1. How much are we investing?
2. Which channels and campaigns receive the investment?
3. How many leads and qualified opportunities are generated?
4. What does each lead and customer cost?
5. Which campaigns produce customers and revenue?
6. Where is performance deteriorating or budget being wasted?

The initial UI lives under `/start/marketing`, uses the existing `/start`
authentication provider, and must never use the separate Agents or GEO Supabase
sessions.

## 2. Reference repository audit

### google-meta-ads-ga4-mcp

Reviewed commit: `eb87b027ebbc62844c06116a3b1071b83567e3a5`

License: MIT. The repository contains documentation and configuration examples,
not the advertised MCP implementation. It has no runtime, source code, OAuth
implementation, API clients, schemas, tests or deployable server.

Patterns retained as requirements inspiration:

- Account discovery before reporting or mutation.
- Provider-specific capability namespaces.
- Small domain-oriented tools rather than an unrestricted generic API proxy.
- GAQL as an expert escape hatch with strict read-only controls.
- Cross-platform comparison through a normalized data contract.
- Scheduled reports and alerts as separate orchestration jobs.

Not reused:

- Branding, interface, remote endpoint claims or videos.
- Security claims that cannot be verified from source.
- Client configurations with unresolved endpoints.
- The broad 165-tool catalog as a single agent context.

### full-funnel-ai-analytics

Reviewed default branch snapshot cloned on 2026-08-14.

License: software is MIT. Bundled Olist data is CC BY-NC-SA 4.0 and is not
suitable for commercial BOTZ use. No data, trained model, generated dashboard,
golden metric output or Olist-derived artifact is reused.

Patterns reimplemented independently:

- Source -> staging -> normalized fact -> metric layer separation.
- Ratio-of-sums metrics with divide-by-zero protection.
- Explicit reporting windows and comparison-period metadata.
- Deterministic demo fixtures and metric drift tests.
- Small typed tools for agent access to governed metrics.
- Separate freshness, sync-health and metric-anomaly checks.

Not reused:

- Streamlit UI, static dashboards, mock data, ML model or warehouse scripts.
- Attribution SQL with non-conserving time-decay weights.
- Unauthenticated MCP/FastAPI services.
- Local plaintext credential storage or arbitrary SQL execution.

## 3. BOTZ-native architecture

```text
Google OAuth       Meta OAuth       GA4 OAuth       BOTZ CRM
     |                 |                |               |
     +------- encrypted tenant connections ------------+
                              |
                     provider account grants
                              |
               scheduled sync jobs + webhooks
                              |
        raw provider payloads (short retention, encrypted)
                              |
                   normalized daily facts
                              |
      campaign metrics + funnel events + attribution touches
                              |
               governed metric/query service
                    /                    \
             dashboard APIs         AI read tools
                    |                    |
            Command Center       recommendations
                                      |
                       mutation request + confirmation
                                      |
                              provider adapter
```

### Module boundaries

- UI: `app/start/marketing/`
- Authenticated APIs: `app/api/marketing/`
- Provider adapters and domain logic: `lib/marketing/`
- Schema: `supabase/migrations/030_create_marketing_command_center.sql`
- Scheduled jobs: `app/api/cron/marketing-*` in Phase 2
- Meta lead webhook: `app/api/marketing/meta/webhook` in Phase 3

## 4. Tenant isolation

Every persisted marketing row has a non-null UUID `tenant_id`. A provider
connection is unique per tenant/provider/external account. Provider account
discovery does not automatically grant access to all accounts available to an
agency identity; explicit account grants are required.

API rules:

1. Authenticate the Supabase bearer token.
2. Resolve tenant server-side using `assertTenantAccess`.
3. Reject a requested tenant that does not match the active membership.
4. Check a marketing permission for sensitive reads and every mutation.
5. Query by the resolved tenant even when using the service-role client.
6. Write an audit event for connection, export, AI and mutation operations.

Recommended permission flags:

- `view_marketing_command_center`
- `view_marketing_financials`
- `manage_marketing_integrations`
- `manage_marketing_campaigns`
- `approve_marketing_mutations`

The existing broad roles remain unchanged in Phase 1. Marketing access is added
through permissions rather than introducing another global role.

## 5. Credential and OAuth security

OAuth access and refresh tokens are never returned to the browser and never
stored as plaintext. The database stores ciphertext, IV/nonce, key version,
scopes and expiry only. Encryption and decryption occur server-side through a
versioned envelope-encryption service backed by the deployment secret manager.

Required OAuth controls:

- Authorization Code + PKCE where supported.
- Signed, short-lived `state` containing tenant, actor and provider intent.
- Exact callback URI allowlist.
- Incremental provider scopes.
- Refresh rotation and revocation handling.
- Explicit provider-account selection after OAuth.
- Meta Business and Google MCC account allowlists.
- Reauthorization state and sync-health alerts.

No credential migration is applied until an encryption key and rotation runbook
exist in each deployment environment.

## 6. Canonical data model

Core entities introduced by migration 030:

- `marketing_connections`: encrypted provider authorization metadata.
- `marketing_account_grants`: external accounts approved for one tenant.
- `marketing_sync_jobs`: cursors, windows, retries and health.
- `marketing_campaigns`: normalized campaign identity and current configuration.
- `marketing_campaign_daily`: daily spend and performance facts.
- `marketing_funnel_events`: lead, qualified, opportunity, customer and revenue events.
- `marketing_attribution_touches`: ordered touches linked to CRM leads/opportunities.
- `marketing_alerts`: metric, sync and high-value-lead alerts.
- `marketing_mutation_requests`: proposed campaign changes and confirmations.
- `marketing_audit_log`: append-only actor and system activity.

Currency values use `numeric`, timestamps use `timestamptz`, and provider payload
extensions use `jsonb`. Currency and account timezone are retained at the fact
grain; cross-currency totals are not shown until an explicit FX policy exists.

## 7. Metric contracts

Metrics are calculated from normalized facts, never by summing provider ratios.

```text
CTR = total_clicks / total_impressions
CPC = total_spend / total_clicks
CPM = total_spend * 1000 / total_impressions
CPL = total_spend / total_leads
Conversion Rate = total_conversions / total_clicks
CAC = total_spend / total_customers
ROAS = attributed_revenue / total_spend
ROI = (attributed_revenue - total_spend) / total_spend
```

All responses include:

- tenant ID
- requested and effective date range
- comparison range
- account timezone and currency
- source freshness by provider
- attribution model
- metric schema version

## 8. Lead capture and CRM identity

Meta Lead Ads webhooks are verified, acknowledged quickly and processed
idempotently. The provider lead ID is unique within tenant and provider. The
normalized event preserves campaign, ad set, ad, form, placement, UTMs and raw
provider identifiers before creating or linking a BOTZ CRM lead.

Identity precedence:

1. provider lead ID
2. first-party form submission ID
3. authenticated CRM contact
4. normalized email/phone hash within the same tenant

Cross-tenant matching is prohibited. PII is excluded from analytics facts and
AI prompts unless a permissioned workflow explicitly requires it.

## 9. Attribution

Phase 3 supports deterministic First Touch and Last Touch. Every touch has an
ordered position, timestamp, source, campaign and optional click IDs (`gclid`,
`gbraid`, `wbraid`, Meta click IDs and UTMs).

The interface is extensible to Linear, Position Based and Time Decay. Advanced
models must conserve 100% of each conversion's revenue and expose their window,
weights and confidence. Attribution is not presented as causal incrementality.

## 10. Campaign mutations

Read and write capabilities are separated. The AI agent and dashboard never call
a provider mutation directly.

```text
proposal -> policy validation -> user preview -> explicit confirmation
         -> queued mutation -> provider call -> before/after audit -> result
```

Budget changes include old value, new value, currency, effective date and impact
summary. High-value changes can require a second approver. Requests are
idempotent and expire if not confirmed. Phase 1 contains no live mutations.

## 11. AI agent boundary

The BOTZ Marketing Agent receives governed, tenant-scoped tools grouped by:

- overview metrics
- campaign performance
- funnel leakage
- attribution
- alerts and sync health
- mutation proposals

It cannot receive raw OAuth tokens, unrestricted SQL, generic provider fetches or
cross-tenant account listings. Every answer includes range, attribution model and
freshness. Every mutation remains a proposal until explicit confirmation.

## 12. Delivery phases

### Phase 1 - foundation and demo overview

- This architecture and non-applied schema migration.
- Normalized TypeScript metric contracts.
- Authenticated `/start/marketing` Command Center UI.
- Date filters, comparison state, funnel, channel performance and attribution demo.
- Clear demo-mode and disconnected-integration states.

### Phase 2 - read-only integrations

- Encrypted OAuth connection service.
- Google Ads reporting adapter with GAQL allowlist.
- Meta Insights adapter with async-report support.
- GA4 Data API adapter.
- Account grants, cursors, retries, rate limits and sync-health UI.

### Phase 3 - leads, CRM and attribution

- Meta webhook verification and idempotent lead ingestion.
- First-party UTM/click-ID capture.
- CRM lead/opportunity/revenue linkage.
- First Touch and Last Touch materialization.

### Phase 4 - governed campaign operations

- Campaign browsing and mutation proposals.
- Pause/resume and budget updates with confirmation.
- Audit trail, idempotency and optional dual approval.
- Provider-specific create workflows after policy review.

### Phase 5 - AI, alerts and advanced attribution

- Tenant-scoped Marketing Agent tools.
- Metric anomaly and sync alerts.
- Linear, Position Based and normalized Time Decay attribution.
- Scheduled reports and recommendation evaluation.

## 13. Phase 1 non-goals

- No real provider tokens or API calls.
- No production migration execution.
- No campaign creation, pause, resume or budget changes.
- No claim that demo metrics are customer data.
- No reuse of reference branding, interfaces, datasets or generated artifacts.

## 14. Verification gates

Before each later phase reaches production:

- tenant-isolation tests for every table and API
- provider contract fixtures and pagination tests
- metric golden tests and ratio-of-sums checks
- OAuth state, token rotation and revocation tests
- webhook signature and idempotency tests
- mutation confirmation and audit completeness tests
- AI tool permission, prompt-injection and data-leakage tests
- provider terms, app review and data-retention review
