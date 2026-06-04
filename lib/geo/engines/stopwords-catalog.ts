import { normalizeText, uniqueStrings } from "@/lib/geo/engines/text-utils"

const STOPWORDS_BY_LANGUAGE: Record<"es" | "en" | "pt", string[]> = {
  es: [
    "de", "la", "el", "los", "las", "y", "o", "un", "una", "unos", "unas", "para", "por", "con", "sin", "en", "al", "del", "que", "como",
    "mejor", "mejores", "top", "empresa", "empresas", "servicio", "servicios", "solucion", "soluciones", "oficial",
  ],
  en: [
    "the", "and", "or", "a", "an", "for", "by", "with", "without", "in", "on", "to", "of", "best", "top", "company", "companies", "service", "services", "solution", "solutions", "official",
  ],
  pt: [
    "de", "da", "do", "das", "dos", "e", "ou", "um", "uma", "para", "por", "com", "sem", "em", "no", "na", "melhor", "melhores", "topo", "empresa", "empresas", "servico", "servicos", "solucao", "solucoes", "oficial",
  ],
}

export function getStopwordsForLanguage(language: string | null | undefined, projectStopwords: string[] = []) {
  const lang = (language ?? "").trim().toLowerCase()
  const safeLanguage: "es" | "en" | "pt" = lang === "es" || lang === "en" || lang === "pt" ? lang : "en"
  const base = STOPWORDS_BY_LANGUAGE[safeLanguage]
  const merged = uniqueStrings([...base, ...projectStopwords].map((x) => normalizeText(String(x))).filter(Boolean))
  return merged
}

export function getStopwordsCatalog() {
  return STOPWORDS_BY_LANGUAGE
}
