import { z } from "zod"

const DANGEROUS_TOKENS = new Set(["www", "http", "https", "ai", "app", "com", "net", "org"])
const DOMAIN_REGEX = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i

function normalizeAlias(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}

function normalizeDomainAlias(value: string) {
  return value.trim().toLowerCase().replace(/^www\./, "")
}

function dedupe(values: string[]) {
  return Array.from(new Set(values))
}

function sanitizeAliases(values: string[], min: number, max: number) {
  const normalized = dedupe(values.map(normalizeAlias).filter(Boolean))
  for (const value of normalized) {
    if (value.length < min || value.length > max) throw new Error(`Alias '${value}' length must be ${min}-${max}`)
    if (DANGEROUS_TOKENS.has(value)) throw new Error(`Alias '${value}' is not allowed`)
  }
  return normalized
}

function sanitizeDomains(values: string[]) {
  const normalized = dedupe(values.map(normalizeDomainAlias).filter(Boolean))
  for (const value of normalized) {
    if (value.length < 3 || value.length > 120) throw new Error(`Domain alias '${value}' length must be 3-120`)
    if (value.includes("/") || value.includes("?") || value.includes("#")) throw new Error(`Domain alias '${value}' cannot include path/query/hash`)
    if (value.startsWith("http://") || value.startsWith("https://")) throw new Error(`Domain alias '${value}' cannot include protocol`)
    if (!DOMAIN_REGEX.test(value)) throw new Error(`Domain alias '${value}' is invalid`)
    if (DANGEROUS_TOKENS.has(value)) throw new Error(`Domain alias '${value}' is not allowed`)
  }
  return normalized
}

function sanitizeStopwords(values: string[]) {
  const normalized = dedupe(values.map(normalizeAlias).filter(Boolean))
  for (const value of normalized) {
    if (value.length < 2 || value.length > 30) throw new Error(`Stopword '${value}' length must be 2-30`)
  }
  return normalized
}

export const projectAliasesPatchSchema = z
  .object({
    brand_aliases: z.array(z.string()).max(25).optional(),
    domain_aliases: z.array(z.string()).max(25).optional(),
    entity_stopwords: z.array(z.string()).max(50).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    try {
      const stopwords = sanitizeStopwords(data.entity_stopwords ?? [])
      const aliases = sanitizeAliases(data.brand_aliases ?? [], 3, 60)
      for (const alias of aliases) {
        if (stopwords.includes(alias)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Alias '${alias}' cannot equal a stopword`, path: ["brand_aliases"] })
        }
      }
      sanitizeDomains(data.domain_aliases ?? [])
    } catch (error) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: error instanceof Error ? error.message : "Invalid alias payload" })
    }
  })

export const competitorAliasesPatchSchema = z
  .object({
    aliases: z.array(z.string()).max(25).optional(),
    domain_aliases: z.array(z.string()).max(25).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    try {
      sanitizeAliases(data.aliases ?? [], 3, 60)
      sanitizeDomains(data.domain_aliases ?? [])
    } catch (error) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: error instanceof Error ? error.message : "Invalid alias payload" })
    }
  })

export function normalizeProjectAliasesPatch(input: z.infer<typeof projectAliasesPatchSchema>) {
  const patch: { brand_aliases?: string[]; domain_aliases?: string[]; entity_stopwords?: string[] } = {}
  if ("entity_stopwords" in input) patch.entity_stopwords = sanitizeStopwords(input.entity_stopwords ?? [])
  if ("brand_aliases" in input) patch.brand_aliases = sanitizeAliases(input.brand_aliases ?? [], 3, 60)
  if ("domain_aliases" in input) patch.domain_aliases = sanitizeDomains(input.domain_aliases ?? [])
  if (patch.brand_aliases && patch.entity_stopwords) {
    for (const alias of patch.brand_aliases) {
      if (patch.entity_stopwords.includes(alias)) throw new Error(`Alias '${alias}' cannot equal a stopword`)
    }
  }
  return patch
}

export function normalizeCompetitorAliasesPatch(input: z.infer<typeof competitorAliasesPatchSchema>) {
  const patch: { aliases?: string[]; domain_aliases?: string[] } = {}
  if ("aliases" in input) patch.aliases = sanitizeAliases(input.aliases ?? [], 3, 60)
  if ("domain_aliases" in input) patch.domain_aliases = sanitizeDomains(input.domain_aliases ?? [])
  return patch
}
