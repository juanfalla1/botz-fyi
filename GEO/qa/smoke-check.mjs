import assert from "node:assert/strict"
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"

const root = process.cwd()

function read(path) {
  const file = resolve(root, path)
  assert.ok(existsSync(file), `Missing file: ${path}`)
  return readFileSync(file, "utf8")
}

const recommendations = read("app/geo/app/projects/[projectId]/recommendations/page.tsx")
const actionPlan = read("app/api/geo/projects/[projectId]/action-plan/route.ts")
const actionEngine = read("lib/geo/action-engine.ts")
const pipeline = read("lib/geo/pipeline/audit-pipeline.base.ts")
const crawler = read("lib/geo/crawler.ts")

assert.match(recommendations, /DeliverableDrawer/, "Deliverable drawer is missing")
assert.match(recommendations, /downloadMarkdown/, "Markdown export is missing")
assert.match(recommendations, /downloadDeliverablePdf/, "PDF export is missing")
assert.match(recommendations, /detectDeliverableKind/, "Deliverable type detection is missing")
assert.match(recommendations, /landingDeliverable/, "Landing deliverable template is missing")
assert.match(recommendations, /comparisonDeliverable/, "Comparison deliverable template is missing")
assert.match(recommendations, /alternativeDeliverable/, "Alternative deliverable template is missing")
assert.match(recommendations, /contentDeliverable/, "Content deliverable template is missing")
assert.match(recommendations, /faqDeliverable/, "FAQ deliverable template is missing")
assert.match(recommendations, /Evidencia usada|Evidence used/, "Evidence block in drawer is missing")
assert.match(recommendations, /Hay contexto limitado|Limited project context/, "Missing-context warning is missing")

assert.match(actionPlan, /previous_audit/, "Previous audit payload is missing")
assert.match(actionPlan, /crawl_evidence/, "Crawl evidence payload is missing")
assert.match(actionPlan, /evidenceFor/, "Action evidence builder is missing")

assert.match(actionEngine, /previousAuditSnapshot/, "Previous audit comparison helper is missing")
assert.match(actionEngine, /latestCrawlEvidence/, "Latest crawl evidence helper is missing")
assert.match(actionEngine, /crawled_pages/, "Crawled pages query is missing")

assert.match(pipeline, /runCrawlerWithBudget/, "Crawler budget wrapper is missing")
assert.match(pipeline, /persistCrawledPages/, "Crawled pages persistence is missing")
assert.match(pipeline, /crawl_evidence/, "Crawl evidence summary persistence is missing")

assert.match(crawler, /maxPages = 10/, "Crawler default limit should be 10 pages")
assert.match(crawler, /url\.origin !== origin/, "Crawler same-domain guard is missing")
assert.match(crawler, /AbortController/, "Crawler timeout guard is missing")
assert.match(crawler, /pdf\|png\|jpe\?g/, "Crawler file-type exclusion is missing")

console.log("GEO smoke checks passed")
