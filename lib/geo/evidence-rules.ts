export function normalizeEvidenceText(value: string) {
  return String(value || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9.\s-]/g, " ").replace(/\s+/g, " ").trim()
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function targetTermsForEvidence(input: { prompt: string; companyName?: string | null; websiteUrl?: string | null; projectNames?: string[] }) {
  const projectTerms = (input.projectNames ?? []).flatMap((project) => {
    const normalized = normalizeEvidenceText(project)
    const root = normalized.split(/[.\s-]/)[0] ?? ""
    return [normalized, root]
  })
  const company = normalizeEvidenceText(input.companyName ?? "")
  const companyRoot = company.split(/[.\s-]/)[0] ?? ""
  const websiteDomain = String(input.websiteUrl ?? "").replace(/^https?:\/\//i, "").replace(/^www\./i, "").split(/[/?#]/)[0].toLowerCase()
  const promptDomains = Array.from(input.prompt.matchAll(/(?:https?:\/\/)?(?:www\.)?([a-z0-9.-]+\.[a-z]{2,})/gi)).flatMap((match) => {
    const domain = match[1].toLowerCase().replace(/^www\./, "")
    return [domain, domain.split(".")[0] ?? ""]
  })
  return Array.from(new Set([
    ...projectTerms,
    company,
    companyRoot,
    websiteDomain,
    websiteDomain.split(".")[0] ?? "",
    ...promptDomains,
  ].filter((term) => term.length >= 3)))
}

function answerContainsWebsiteDomain(input: { answerText: string; websiteUrl?: string | null }) {
  const websiteDomain = String(input.websiteUrl ?? "").replace(/^https?:\/\//i, "").replace(/^www\./i, "").split(/[/?#]/)[0].toLowerCase()
  if (!websiteDomain || !websiteDomain.includes(".")) return false
  return normalizeEvidenceText(input.answerText).includes(websiteDomain)
}

export function hasValidExternalCitationEvidence(input: { answerText: string; websiteUrl?: string | null; externalCitationCount?: number }) {
  if ((input.externalCitationCount ?? 0) <= 0) return false
  const text = normalizeEvidenceText(input.answerText)
  if (!text || !answerContainsWebsiteDomain(input)) return false
  const negativeCitationAnswer = /no encontr[eé]|no encontr[oó]|no hay menciones|no existen menciones|ninguna fuente externa|no external|did not find|could not find|no reliable external/i.test(input.answerText)
  if (negativeCitationAnswer) return false
  const homonymOrMarketData = /\b(global x|robotics artificial intelligence etf|etf|acciones|cotizacion|cotizaci[oó]n|stock|ticker|funds botz|otra marca distinta)\b/i.test(text)
  if (homonymOrMarketData) return false
  return true
}

export function answerContainsTarget(input: { prompt: string; answerText: string; companyName?: string | null; websiteUrl?: string | null; projectNames?: string[] }) {
  const text = normalizeEvidenceText(input.answerText)
  if (!text) return false
  return targetTermsForEvidence(input).some((term) => new RegExp(`(^|\\W)${escapeRegExp(term)}(?=$|\\W)`, "i").test(text))
}

export function answerHasPositiveTargetContext(input: { prompt: string; answerText: string; companyName?: string | null; websiteUrl?: string | null; projectNames?: string[] }) {
  const text = normalizeEvidenceText(input.answerText)
  if (!text) return false
  for (const term of targetTermsForEvidence(input)) {
    const index = text.indexOf(term)
    if (index < 0) continue
    const snippet = text.slice(Math.max(0, index - 90), Math.min(text.length, index + term.length + 140))
    const weakReference = /\b(alternativas?\s+a|alternatives?\s+to|competidores?\s+(?:o\s+)?alternativas?\s+a|competitors?\s+(?:or\s+)?alternatives?\s+to|en\s+lugar\s+de|instead\s+of|similar\s+a|similar\s+to|no\s+(?:aparece|menciona|recomienda)|not\s+(?:mentioned|recommended))\b/.test(snippet)
    if (weakReference) continue
    const positiveSignal = /\b(opci[oó]n|recomienda|recomendado|recomendar[ií]a|proveedor|plataforma|soluci[oó]n|fuerte|destaca|validar|fortalezas?|ideal|fant[aá]stica|leader|leading|recommended|recommend|provider|platform|solution|strong|stands?\s+out|good\s+fit|best\s+fit|strengths?|validate)\b/.test(snippet)
    const listSignal = text.split(/\n|\s{2,}/).some((line) => new RegExp(`^\\s*(?:\\d+[.)]\\s*)?${escapeRegExp(term)}(?=$|\\W)`, "i").test(line))
    if (positiveSignal || listSignal) return true
  }
  return false
}

export function isPositiveBrandEvidence(input: { prompt: string; answerText: string; rawMentioned?: boolean; promptKind?: string | null; companyName?: string | null; websiteUrl?: string | null; projectNames?: string[]; externalCitationCount?: number }) {
  if (!input.rawMentioned) return false
  const kind = String(input.promptKind ?? "").toLowerCase()
  if (kind.includes("citation") || kind.includes("trust")) return hasValidExternalCitationEvidence(input)
  if (kind.includes("assisted")) return answerContainsWebsiteDomain(input) && answerHasPositiveTargetContext(input)
  return answerContainsTarget(input) && answerHasPositiveTargetContext(input)
}
