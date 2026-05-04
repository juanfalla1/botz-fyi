export function pickCatalogByVariantText(args: {
  text: string;
  catalogRows: any[];
  variantRows: any[];
  forcedCategory?: string;
  normalizeText: (v: string) => string;
  detectCatalogCategoryIntent: (text: string) => string;
  scopeCatalogRows: (rows: any[], category: string) => any[];
  extractCatalogTerms: (text: string) => string[];
  extractModelLikeTokens: (text: string) => string[];
  normalizeCatalogQueryText: (text: string) => string;
}): any | null {
  const requestedCategory = args.normalizeText(String(args.forcedCategory || args.detectCatalogCategoryIntent(args.text) || ""));
  const scopedCatalog = requestedCategory ? args.scopeCatalogRows(args.catalogRows || [], requestedCategory) : (args.catalogRows || []);
  const sourceCatalog = scopedCatalog.length ? scopedCatalog : (args.catalogRows || []);
  if (!sourceCatalog.length || !Array.isArray(args.variantRows) || !args.variantRows.length) return null;

  const byCatalogId = new Map<string, any>();
  for (const row of sourceCatalog) {
    const id = String(row?.id || "").trim();
    if (id) byCatalogId.set(id, row);
  }
  if (!byCatalogId.size) return null;

  const terms = args.extractCatalogTerms(args.text);
  const modelTokens = args.extractModelLikeTokens(args.text);
  const compactInbound = args.normalizeCatalogQueryText(args.text).replace(/[^a-z0-9]+/g, "");

  let best: { row: any; score: number } | null = null;
  for (const variant of args.variantRows) {
    const catalogId = String((variant as any)?.catalog_id || "").trim();
    const row = byCatalogId.get(catalogId);
    if (!row) continue;

    const attrs = (variant as any)?.attributes && typeof (variant as any).attributes === "object"
      ? Object.values((variant as any).attributes as Record<string, any>).map((v) => String(v || "")).join(" ")
      : String((variant as any)?.attributes || "");

    const blob = `${(variant as any)?.sku || ""} ${(variant as any)?.variant_name || ""} ${(variant as any)?.range_text || ""} ${attrs} ${row?.name || ""}`;
    const hay = args.normalizeCatalogQueryText(blob);
    const hayCompact = hay.replace(/[^a-z0-9]+/g, "");

    let score = 0;
    if (modelTokens.length) {
      const modelMatches = modelTokens.filter((t) => hay.includes(t));
      if (!modelMatches.length) continue;
      score += modelMatches.length * 10;
      if (modelMatches.some((t) => hayCompact.includes(t))) score += 4;
    }

    if (compactInbound && hayCompact && compactInbound.includes(hayCompact)) score += 6;
    if (compactInbound && hayCompact && hayCompact.includes(compactInbound)) score += 6;
    for (const term of terms) if (hay.includes(term)) score += 3;
    if (!modelTokens.length && terms.length && score < Math.min(6, terms.length * 3)) continue;
    if (!best || score > best.score) best = { row, score };
  }

  return best?.row || null;
}

export function isProductLookupIntent(text: string, normalizeText: (v: string) => string): boolean {
  const t = normalizeText(text || "");
  if (!t) return false;
  return /(tienen|tienes|tiene|manejan|venden|disponible|disponibilidad|hay|referencia|modelo|explorer|adventurer|balanza|analizador|centrifuga)/.test(t);
}

export function isStrictCatalogIntent(args: {
  text: string;
  normalizeText: (v: string) => string;
  isProductLookupIntent: (text: string) => boolean;
  isPriceIntent: (text: string) => boolean;
  isRecommendationIntent: (text: string) => boolean;
  isTechnicalSheetIntent: (text: string) => boolean;
  isProductImageIntent: (text: string) => boolean;
  detectCatalogCategoryIntent: (text: string) => string;
}): boolean {
  const t = args.normalizeText(args.text || "");
  if (!t) return false;
  return args.isProductLookupIntent(t) || args.isPriceIntent(t) || args.isRecommendationIntent(t) || args.isTechnicalSheetIntent(t) || args.isProductImageIntent(t) || Boolean(args.detectCatalogCategoryIntent(t));
}

export function isCategoryFollowUpIntent(text: string, normalizeText: (v: string) => string): boolean {
  const t = normalizeText(text || "");
  if (!t) return false;
  return /^(cuales|cu[aá]les|que tienen|que mas tienen|de cual|de cuales|muestrame|muestrame mas|dame una|damela|dámela|quiero esa|quiero ese|esa|ese)\b/.test(t);
}

export function isConsistencyChallengeIntent(text: string, normalizeText: (v: string) => string): boolean {
  const t = normalizeText(text || "");
  if (!t) return false;
  return /(arriba me dij|me dijiste|te contradices|contradic|eso no coincide|no coincide|pero dijiste)/.test(t);
}
