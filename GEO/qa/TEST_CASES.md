# BOTZ GEO QA Test Cases

Scope: GEO only. These cases validate diagnosis, evidence, execution deliverables, reports, and guardrails without touching other Botz projects.

## Critical Guardrails

- Do not change GEO Score algorithm.
- Do not add new metrics.
- Do not modify dashboard structure outside GEO.
- Do not use fake data as real.
- Do not invent claims, clients, rankings, awards, integrations, or performance results.
- If evidence is missing, show a clear warning.

## Smoke Tests

1. Build passes
   - Run: `npm run build`
   - Expected: Next.js compiles successfully.

2. GEO static guardrails pass
   - Run: `node GEO/qa/smoke-check.mjs`
   - Expected: all checks pass.

## Audit Flow

1. Create project with valid website
   - Input: company name, website URL, industry, country, language, competitors.
   - Expected: project saves, competitors attach to project, initial prompts exist.

2. Run audit with configured engines
   - Expected: audit completes or fails with visible error.
   - Expected: no placeholder score if engines are unavailable.
   - Expected: `GEO Score`, spontaneous visibility, assisted visibility, competitive win rate, and citation coverage remain consistent.

3. Crawl evidence
   - Expected: audit attempts same-domain crawl, maximum 10 pages.
   - Expected: if crawl succeeds, Action Plan shows pages and words read.
   - Expected: if crawl fails, audit still completes and Action Plan shows a clear warning.

4. Evidence persistence
   - Expected: prompt evidence is available through stored AI queries/answers.
   - Expected: brand mentions and competitor mentions are stored when available.
   - Expected: crawled pages are best-effort and non-blocking.

## Action Plan Evidence

1. Evidence panel appears
   - Open: `/geo/app/projects/[projectId]/recommendations`.
   - Expected: shows crawled pages, crawled words, and GEO change vs previous audit when available.

2. Each action has evidence
   - Expected: action cards include “Evidencia detrás de esta acción”.
   - Expected: evidence references audit score, crawl result, previous audit delta, competitor signals, or citations when relevant.

3. No baseline case
   - Use a project with only one completed audit.
   - Expected: UI shows “Sin baseline” or equivalent, not fabricated deltas.

4. Previous audit comparison
   - Use a project with at least two completed audits.
   - Expected: delta values appear and can be positive, zero, or negative.

## Deliverable Generator

1. Drawer opens
   - Click `Generar entregable` on any action.
   - Expected: right-side drawer opens, dark theme preserved.

2. Editable content
   - Edit text in drawer.
   - Expected: changes remain while drawer is open.

3. Original action context
   - Expected: drawer shows original action, expected impact, difficulty, and potential GEO Score lift.

4. Evidence used
   - Expected: drawer shows evidence used for the draft.

5. Missing context warning
   - Use project with missing industry/business goal or action with no affected pages.
   - Expected: visible warning that the draft uses limited audit/action data.

6. Copy
   - Click `Copiar`.
   - Expected: markdown content is copied to clipboard.

7. Markdown download
   - Click `Markdown`.
   - Expected: `.md` file downloads with generated content.

8. PDF download
   - Click `PDF`.
   - Expected: PDF downloads with the edited draft content.

## Deliverable Types

1. Landing action
   - Expected sections: Hero, Problem, Solution, Benefits, Use Cases, GEO FAQs, CTA.

2. Comparison action
   - Expected sections: Title, Introduction, Comparison Table, Differentiators, Use Cases, FAQs, CTA.

3. Alternative action
   - Expected sections: Alternative List, BOTZ/brand advantages, When to choose, FAQs, CTA.

4. Content action
   - Expected sections: Title, Outline, Initial Text, FAQs, CTA.

5. FAQ action
   - Expected sections: suggested questions and AI-optimized answers.

6. Generic fallback
   - Expected: structured execution draft, not empty content.

## Reports

1. Generate monthly report
   - Expected: report list shows monthly focus and sections.
   - Expected: premium report opens with monthly title and monthly-oriented content.

2. Generate competitive report
   - Expected: report list shows competitive focus and sections.
   - Expected: premium report opens with competitive title and competitive-oriented content.

3. Generate snapshot report
   - Expected: report list shows snapshot focus and sections.
   - Expected: premium report opens as shorter snapshot, not same long action-plan report.

4. Delete report
   - Click trash button.
   - Expected: report disappears from list and API deletes only owned report.

## Anti-Hallucination Checks

1. No fake clients
   - Expected: deliverables do not invent client names or case studies.

2. No fake numbers
   - Expected: deliverables do not invent revenue, conversion, traffic, or ranking numbers.

3. No unsupported superlatives
   - Expected: avoid “best”, “leader”, “number one” unless evidence exists.

4. Clear source boundaries
   - Expected: UI separates audit evidence, crawl evidence, competitor evidence, and recommendations.

## Success Validation

1. Baseline
   - Run audit before implementing a deliverable.
   - Record current GEO Score, spontaneous visibility, competitive win rate, and citation coverage.

2. Publish one deliverable
   - Publish one landing/comparison/FAQ/content asset.

3. Re-audit after indexing window
   - Run a new audit with same project and prompt mix.

4. Compare deltas
   - Expected: Action Plan shows before/after delta.
   - Expected: if no improvement, action remains inconclusive or needs revision, not falsely marked successful.
