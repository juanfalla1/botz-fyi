import { normalizeDomain, uniqueStrings } from "@/lib/geo/engines/text-utils"

const URL_REGEX = /https?:\/\/[^\s)\]}>"']+/gi

export type CitationParseResult = {
  urls: string[]
  domains: string[]
  uniqueCitationCount: number
  uniqueDomainCount: number
}

function sanitizeUrl(url: string) {
  return url.replace(/[.,;!?]+$/, "")
}

export function parseCitations(text: string, rawCitations: string[] = []): CitationParseResult {
  const fromText = (text.match(URL_REGEX) ?? []).map(sanitizeUrl)
  const allUrls = uniqueStrings([...rawCitations.map(sanitizeUrl), ...fromText])

  const normalizedUrls = uniqueStrings(
    allUrls
      .map((u) => {
        try {
          const parsed = new URL(u)
          return `${parsed.protocol}//${parsed.host}${parsed.pathname}`.replace(/\/$/, "")
        } catch {
          return ""
        }
      })
      .filter(Boolean)
  )

  const domains = uniqueStrings(normalizedUrls.map((u) => normalizeDomain(u)).filter(Boolean))
  return {
    urls: normalizedUrls,
    domains,
    uniqueCitationCount: normalizedUrls.length,
    uniqueDomainCount: domains.length,
  }
}
