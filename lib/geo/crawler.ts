export type CrawledPage = {
  url: string
  title: string | null
  description: string | null
  content: string
  status_code: number
  word_count: number
  metadata: Record<string, unknown>
}

export async function runCrawler(baseUrl: string, maxPages = 10): Promise<CrawledPage[]> {
  const start = normalizeStartUrl(baseUrl)
  if (!start) return []
  const origin = new URL(start).origin
  const queue = [start]
  const seen = new Set<string>()
  const pages: CrawledPage[] = []
  const limit = Math.max(1, Math.min(maxPages, 10))

  while (queue.length > 0 && pages.length < limit) {
    const url = queue.shift()
    if (!url || seen.has(url)) continue
    seen.add(url)
    const page = await fetchPage(url).catch(() => null)
    if (!page) continue
    pages.push(page)
    if (pages.length >= limit) break
    const links = Array.isArray(page.metadata.links) ? page.metadata.links.map(String) : []
    for (const link of links) {
      if (!seen.has(link) && !queue.includes(link) && queue.length < limit * 2) queue.push(link)
    }
  }

  return pages
}

async function fetchPage(url: string): Promise<CrawledPage | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 7000)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": "BotzGEO/1.0 (+https://geo.botz.fyi)" },
      redirect: "follow",
    })
    const contentType = res.headers.get("content-type") || ""
    if (!contentType.includes("text/html")) return null
    const html = await res.text()
    const text = htmlToText(html).slice(0, 12000)
    return {
      url,
      title: extractMeta(html, /<title[^>]*>([\s\S]*?)<\/title>/i),
      description: extractMeta(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i),
      content: text,
      status_code: res.status,
      word_count: text.split(/\s+/).filter(Boolean).length,
      metadata: {
        content_type: contentType,
        crawled_with: "botz_fetch_limited_v1",
        links: extractLinks(html, url, new URL(url).origin),
      },
    }
  } finally {
    clearTimeout(timeout)
  }
}

function normalizeStartUrl(value: string) {
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`)
    url.hash = ""
    return url.toString().replace(/\/$/, "")
  } catch {
    return null
  }
}

function extractLinks(htmlText: string, currentUrl: string, origin: string) {
  const links = new Set<string>()
  const matches = htmlText.matchAll(/href=["']([^"'#]+)["']/gi)
  for (const match of matches) {
    try {
      const url = new URL(match[1], currentUrl)
      if (url.origin !== origin) continue
      if (!["http:", "https:"].includes(url.protocol)) continue
      if (/\.(pdf|png|jpe?g|gif|webp|svg|zip|xlsx?|docx?|pptx?)$/i.test(url.pathname)) continue
      url.hash = ""
      url.search = ""
      links.add(url.toString().replace(/\/$/, ""))
    } catch {
      continue
    }
  }
  return Array.from(links).slice(0, 20)
}

function extractMeta(html: string, pattern: RegExp) {
  const value = html.match(pattern)?.[1]
  return value ? decodeHtml(value).trim().slice(0, 300) : null
}

function htmlToText(html: string) {
  return decodeHtml(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}
