export function extractQuantity(text: string): number {
  const t = String(text || "");
  const m1 = [...t.matchAll(/(?:\bcantidad\b|\bqty\b|\bx\b)\s*[:=]?\s*(\d{1,5})/gi)];
  if (m1.length) {
    const n = Number(m1[m1.length - 1]?.[1] || 1);
    return Math.max(1, Math.min(100000, n));
  }
  const m2 = [...t.matchAll(/\b(\d{1,5})\s*(?:unidad|unidades|equipos?|balanza|balanzas|bascula|basculas|pieza|piezas)\b/gi)];
  if (m2.length) {
    const n = Number(m2[m2.length - 1]?.[1] || 1);
    return Math.max(1, Math.min(100000, n));
  }
  return 1;
}

export function extractQuoteRequestedQuantity(args: {
  text: string;
  normalizeText: (text: string) => string;
  parseTechnicalSpecQuery: (text: string) => any;
}): number {
  const t = args.normalizeText(String(args.text || ""));
  if (!t) return 1;
  const hasTechnicalSpecPattern = Boolean(args.parseTechnicalSpecQuery(String(args.text || ""))) ||
    /\b\d+(?:[\.,]\d+)?\s*(?:mg|g|kg)\s*(?:x|×|\*|por)\s*\d+(?:[\.,]\d+)?\s*(?:mg|g|kg)\b/i.test(String(args.text || ""));
  if (hasTechnicalSpecPattern) {
    const hasExplicitUnitQty = /\b(?:cantidad|qty)\s*[:=]?\s*\d{1,5}\b/.test(t) ||
      /\b\d{1,4}\s*(?:unidad|unidades|equipo|equipos|balanza|balanzas|bascula|basculas|pieza|piezas)\b/.test(t);
    if (!hasExplicitUnitQty) return 1;
  }
  const m1 = t.match(/\b(?:de|por|para)\s*(\d{1,4})\s*(?:unidad|unidades|equipo|equipos|balanza|balanzas|bascula|basculas|pieza|piezas)?\b/);
  if (m1?.[1]) {
    const n = Number(m1[1]);
    if (Number.isFinite(n) && n > 0) return Math.max(1, Math.min(100000, n));
  }
  const m2 = t.match(/\b(\d{1,4})\s*(?:unidad|unidades|equipo|equipos|balanza|balanzas|bascula|basculas|pieza|piezas)\b/);
  if (m2?.[1]) {
    const n = Number(m2[1]);
    if (Number.isFinite(n) && n > 0) return Math.max(1, Math.min(100000, n));
  }
  const m3 = t.match(/\bcotiz(?:acion|ar)?\s*(?:de|por)?\s*(\d{1,4})\b/);
  if (m3?.[1]) {
    const n = Number(m3[1]);
    if (Number.isFinite(n) && n > 0) return Math.max(1, Math.min(100000, n));
  }
  return extractQuantity(args.text);
}

export function extractBundleOptionIndexes(text: string): number[] {
  const raw = String(text || "");
  if (!raw) return [];
  const numbers = [...raw.matchAll(/\b([1-9]\d?)\b/g)]
    .map((m) => Number(m?.[1] || 0))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (numbers.length < 2) return [];
  const hasSelectionSignal = /(cotiz|opcion|opciones|referencias?|\,|\;|\sy\s|\se\s|\/|\-)/i.test(raw);
  if (!hasSelectionSignal) return [];
  return numbers.filter((n, idx, arr) => arr.indexOf(n) === idx);
}

export function extractBundleSelectionFromCountCommand(text: string, normalizeText: (text: string) => string): { count: number; picks: number[] } | null {
  const raw = String(text || "");
  const t = normalizeText(raw);
  if (!/\bcotiz(?:ar|a|acion|ación)?\b/.test(t)) return null;
  const explicitPicks = extractBundleOptionIndexes(raw).slice(0, 3);
  const explicitSelectionIntent =
    /\bopcion(?:es)?\b/.test(t) ||
    /[,;]|\sy\s|\se\s|\//.test(t);
  if (explicitSelectionIntent && explicitPicks.length >= 2) {
    return { count: Math.min(3, explicitPicks.length), picks: explicitPicks };
  }

  const tokens = [...t.matchAll(/\b(\d{1,2}|dos|tres|cuatro|cinco|seis|siete|ocho)\b/g)].map((m) => String(m?.[1] || "").trim());
  if (!tokens.length) return null;
  const map: Record<string, number> = { dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8 };
  const firstNum = Number(tokens[0] ? (Number(tokens[0]) || map[tokens[0]] || 0) : 0);
  if (!firstNum || firstNum < 2) return null;

  const picks = explicitPicks
    .filter((n) => n !== firstNum)
    .slice(0, 3);
  return {
    count: Math.max(2, Math.min(3, firstNum)),
    picks,
  };
}

export function pickBundleOptionSourceByIndexes(indexes: number[], sources: any[][]): any[] {
  const maxIdx = Math.max(0, ...indexes.map((n) => Number(n || 0)));
  for (const src of sources) {
    if (Array.isArray(src) && src.length >= Math.max(1, maxIdx)) return src;
  }
  for (const src of sources) {
    if (Array.isArray(src) && src.length) return src;
  }
  return [];
}

export function hasUniformQuantityHint(text: string, normalizeText: (text: string) => string): boolean {
  const t = normalizeText(text);
  return /(para todos|cada uno|cada producto|los 3|los tres)/.test(t) && /\d/.test(t);
}

export function shouldAutoQuote(args: {
  text: string;
  normalizeText: (text: string) => string;
  isMultiProductQuoteIntent: (text: string) => boolean;
}): boolean {
  const t = args.normalizeText(args.text);
  const asksQuote = /(cotiz|cotizacion|cotizar|presupuesto|precio)/.test(t);
  const asksDelivery = /(pdf|archivo|adjunt|enviame|enviame|enviame|whatsapp|trm)/.test(t);
  const asksMulti = args.isMultiProductQuoteIntent(t);
  return asksQuote && (asksDelivery || asksMulti);
}

export function asksQuoteIntent(text: string, normalizeText: (text: string) => string): boolean {
  const t = normalizeText(text || "");
  if (!t) return false;
  if (/(cotiz|cotizacion|cotizar)/.test(t)) return true;
  if (/\bpresupuesto\b/.test(t) && /(quier|necesit|haz|genera|envia|enviame|dame|cotiz)/.test(t)) return true;
  return false;
}

export function isQuoteStarterIntent(args: {
  text: string;
  normalizeText: (text: string) => string;
  asksQuoteIntent: (text: string) => boolean;
  hasConcreteProductHint: (text: string) => boolean;
}): boolean {
  const t = args.normalizeText(args.text);
  const asksQuote = args.asksQuoteIntent(t);
  const hasConcreteRef = args.hasConcreteProductHint(t) || /\b\d{2,}\b/.test(t) || /(explorer|adventurer|pioneer|scout|defender|valor|fron|modelo|referencia)/.test(t);
  return asksQuote && !hasConcreteRef;
}

export function hasReferencePronoun(text: string, normalizeText: (text: string) => string): boolean {
  const t = normalizeText(text || "");
  if (!t) return false;
  return /\b(de\s+esta|de\s+este|de\s+esa|de\s+ese|esta|este|esa|ese)\b/.test(t);
}

export function isConcreteQuoteIntent(args: {
  text: string;
  rememberedProductName?: string;
  normalizeText: (text: string) => string;
  asksQuoteIntent: (text: string) => boolean;
  hasConcreteProductHint: (text: string) => boolean;
  hasReferencePronoun: (text: string) => boolean;
}): boolean {
  const t = args.normalizeText(args.text || "");
  if (!args.asksQuoteIntent(t)) return false;
  if (args.hasConcreteProductHint(t)) return true;
  const hasRememberedProduct = Boolean(args.normalizeText(String(args.rememberedProductName || "")));
  if (!hasRememberedProduct) return false;
  if (args.hasReferencePronoun(t)) return true;
  return /\b(la|esta|esa)\s+cotizacion\b|^cotizacion\b|^la\s+cotizacion\b/.test(t);
}

export function hasBareQuantity(text: string, normalizeText: (text: string) => string): boolean {
  const t = normalizeText(text || "");
  return /\b\d{1,5}\b/.test(t) && /(unidad|unidades|equipo|equipos|balanza|balanzas|bascula|basculas|pieza|piezas|qty|cantidad|x\s*\d)/.test(t);
}
