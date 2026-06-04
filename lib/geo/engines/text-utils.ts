export function normalizeText(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s./:-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function normalizeDomain(input: string) {
  const cleaned = input.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0].toLowerCase().trim()
  return cleaned
}

export function escapeRegExp(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function tokenizeWords(input: string) {
  return normalizeText(input)
    .split(" ")
    .map((x) => x.trim())
    .filter((x) => x.length > 0)
}

export function uniqueStrings(input: string[]) {
  return Array.from(new Set(input.map((x) => x.trim()).filter(Boolean)))
}

export function buildEntityVariants(name: string, domain?: string | null) {
  const normName = normalizeText(name)
  const words = tokenizeWords(name)
  const variants = new Set<string>()
  if (normName) variants.add(normName)
  if (words.length >= 2) variants.add(words.join(" "))
  if (words.length >= 2) variants.add(words.slice(0, 2).join(" "))
  if (words.length >= 3) variants.add(words.slice(0, 3).join(" "))
  if (domain) {
    const d = normalizeDomain(domain)
    if (d) {
      variants.add(d)
      const root = d.split(".")[0]
      if (root && root.length >= 3) variants.add(root)
    }
  }
  return Array.from(variants)
}

export function countWordBoundaryMatches(haystack: string, needle: string) {
  if (!needle || needle.length < 2) return 0
  const regex = new RegExp(`(^|\\W)${escapeRegExp(needle)}(?=$|\\W)`, "gi")
  let count = 0
  while (regex.exec(haystack)) count += 1
  return count
}
