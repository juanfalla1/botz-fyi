function normalizeText(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function toGrams(valueRaw: string, unitRaw: string): number {
  const raw = String(valueRaw || "").trim();
  if (!raw) return 0;

  let normalized = raw;
  if (/^[1-9]\d{0,2}(?:[\.,]\d{3})+$/.test(normalized)) {
    normalized = normalized.replace(/[\.,]/g, "");
  } else {
    normalized = normalized.replace(/,/g, ".");
  }

  const n = Number(normalized);
  if (!Number.isFinite(n) || n <= 0) return 0;
  const u = normalizeText(String(unitRaw || "g"));
  if (u === "mg") return n / 1000;
  if (u === "kg") return n * 1000;
  if (u === "gr" || u === "gramo" || u === "gramos") return n;
  return n;
}

export function parseLocalePositiveNumber(raw: string): number {
  const src = String(raw || "").trim();
  if (!src) return 0;
  let normalized = src;
  if (/^[1-9]\d{0,2}(?:[\.,]\d{3})+$/.test(normalized)) {
    normalized = normalized.replace(/[\.,]/g, "");
  } else {
    normalized = normalized.replace(/,/g, ".");
  }
  const n = Number(normalized);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n;
}

export function extractDimensionTripletMm(text: string): number[] | null {
  const t = normalizeText(String(text || "")).replace(/\s+/g, " ").trim();
  if (!t) return null;
  const m = t.match(/(\d+(?:[\.,]\d+)?)\s*(mm|cm)?\s*(?:x|por|×|✕|✖|\*)\s*(\d+(?:[\.,]\d+)?)\s*(mm|cm)?\s*(?:x|por|×|✕|✖|\*)\s*(\d+(?:[\.,]\d+)?)\s*(mm|cm)?/i);
  if (!m) return null;
  const a = parseLocalePositiveNumber(m[1]);
  const b = parseLocalePositiveNumber(m[3]);
  const c = parseLocalePositiveNumber(m[5]);
  if (!(a > 0) || !(b > 0) || !(c > 0)) return null;
  const unit = normalizeText(String(m[2] || m[4] || m[6] || "mm"));
  const factor = unit === "cm" ? 10 : 1;
  return [a * factor, b * factor, c * factor];
}

export function parseDimensionHint(text: string): { dimsMm: number[] } | null {
  const dims = extractDimensionTripletMm(text);
  if (!dims) return null;
  return { dimsMm: dims };
}

export function parseTechnicalSpecQuery(text: string): { capacityG: number; readabilityG: number } | null {
  const t = normalizeText(String(text || ""))
    .replace(/(\d)\s*[\.,]\s*(\d)/g, "$1.$2")
    .replace(/[×✕✖*]/g, "x")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return null;

  const primary = t.match(/(?:^|\s)(\d+(?:[\.,]\d+)?)\s*(mg|g|kg|gr|gramo|gramos)?\s*(?:x|por)\s*(\d+(?:[\.,]\d+)?)\s*(mg|g|kg|gr|gramo|gramos)?\b/i);
  const byKeywords = t.match(/(?:capacidad|cap|max)\D{0,20}(\d+(?:[\.,]\d+)?)\s*(mg|g|kg|gr|gramo|gramos)?\b.{0,80}(?:resolucion|resolucion\s+minima|precision|lectura\s+minima|readability)\D{0,20}(\d+(?:[\.,]\d+)?)\s*(mg|g|kg|gr|gramo|gramos)?\b/i);
  const m = primary || byKeywords;
  if (!m) return null;

  const capacityG = toGrams(m[1], m[2] || "g");
  const readabilityG = toGrams(m[3], m[4] || "g");
  if (!(capacityG > 0) || !(readabilityG > 0)) return null;
  return { capacityG: normalizeRequestedCapacityG(capacityG), readabilityG };
}

export function normalizeRequestedCapacityG(rawCapG: number): number {
  const cap = Number(rawCapG || 0);
  if (!(cap > 0)) return 0;
  const snapMap: Record<number, number> = {
    200: 220,
    300: 330,
    600: 620,
    3000: 3200,
    4000: 4200,
    5000: 5200,
    6000: 6200,
  };
  const rounded = Math.round(cap);
  return Number(snapMap[rounded] || cap);
}

export function parseLooseTechnicalHint(text: string): { capacityG?: number; readabilityG?: number } | null {
  const t = normalizeText(String(text || ""))
    .replace(/(\d)\s*[\.,]\s*(\d)/g, "$1.$2")
    .replace(/[×✕✖*]/g, "x")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return null;

  const strictPair = parseTechnicalSpecQuery(t);
  if (strictPair) return strictPair;

  let explicitReadabilityG = 0;
  const explicitReadToken =
    t.match(/(?:^|\s)(0(?:[\.,]\d+))\s*(mg|g|kg|gr|gramo|gramos)\b/i) ||
    t.match(/(?:^|\s)([\.,]\d+)\s*(mg|g|kg|gr|gramo|gramos)\b/i);
  if (explicitReadToken) {
    const raw = String(explicitReadToken[1] || "").replace(/^\./, "0.").replace(/^,/, "0.");
    const unit = String(explicitReadToken[2] || "g");
    const read = toGrams(raw, unit);
    if (read > 0 && read < 1) explicitReadabilityG = read;
  }

  const sigMap: Record<string, number> = {
    "1": 1,
    "2": 2,
    "3": 3,
    "4": 4,
    un: 1,
    una: 1,
    uno: 1,
    dos: 2,
    tres: 3,
    cuatro: 4,
  };
  const sig = t.match(/\b(1|2|3|4|un|una|uno|dos|tres|cuatro)\s*(cifra|cifras|decimal|decimales)\s*(significativa|significativas)?\b/i);
  if (sig) {
    const n = Number(sigMap[String(sig[1] || "").toLowerCase()] || 0);
    if (n >= 1 && n <= 4) {
      return { readabilityG: Number(Math.pow(10, -n).toFixed(8)) };
    }
  }

  const valuesForward = Array.from(t.matchAll(/(\d+(?:[\.,]\d+)?)\s*(mg|g|kg|gr|gramo|gramos)\b/gi))
    .map((m: any) => toGrams(String(m?.[1] || ""), String(m?.[2] || "g")))
    .filter((n: number) => Number.isFinite(n) && n > 0);
  const valuesReverse = Array.from(t.matchAll(/\b(mg|g|kg|gr|gramo|gramos)\s*[,:\- ]+\s*(\d+(?:[\.,]\d+)?)/gi))
    .map((m: any) => toGrams(String(m?.[2] || ""), String(m?.[1] || "g")))
    .filter((n: number) => Number.isFinite(n) && n > 0);
  const values = [...valuesForward, ...valuesReverse];
  if (!values.length) return null;

  const hasReadabilityKeyword = /(resolucion|precision|lectura\s*minima|division|divisiones|readability)/.test(t);
  const hasCapacityKeyword = /(capacidad|max|hasta|rango|alcance|de\s*\d+(?:[\.,]\d+)?\s*(mg|g|kg|gr|gramo|gramos))/.test(t);

  if (values.length >= 2) {
    const sorted = [...values].sort((a, b) => a - b);
    const maybeRead = sorted[0];
    const maybeCap = sorted[sorted.length - 1];
    if (maybeCap >= 1 && maybeRead > 0 && maybeCap / maybeRead >= 10) {
      return { capacityG: maybeCap, readabilityG: explicitReadabilityG > 0 ? explicitReadabilityG : maybeRead };
    }
  }

  const only = values[0];
  if (hasReadabilityKeyword) {
    if (only >= 1) return { capacityG: only };
    return { readabilityG: only };
  }
  if (hasCapacityKeyword && only >= 1) return { capacityG: only };
  if (only < 1) return { readabilityG: explicitReadabilityG > 0 ? explicitReadabilityG : only };
  if (explicitReadabilityG > 0 && only >= 1) return { capacityG: only, readabilityG: explicitReadabilityG };
  return { capacityG: only };
}

export function parseCapacityRangeHint(text: string): { minG: number; maxG: number } | null {
  const t = normalizeText(String(text || ""))
    .replace(/(\d)\s*[\.,]\s*(\d)/g, "$1.$2")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return null;

  const pairPatterns = [
    /(?:entre|rango|de)\s*(\d+(?:[\.,]\d+)?)\s*(mg|g|kg|gr|gramo|gramos)?\s*(?:a|y|-|hasta)\s*(\d+(?:[\.,]\d+)?)\s*(mg|g|kg|gr|gramo|gramos)?\b/i,
    /desde\s*(\d+(?:[\.,]\d+)?)\s*(mg|g|kg|gr|gramo|gramos)?\s*hasta\s*(\d+(?:[\.,]\d+)?)\s*(mg|g|kg|gr|gramo|gramos)?\b/i,
  ];
  for (const rx of pairPatterns) {
    const m = t.match(rx);
    if (!m) continue;
    const a = toGrams(m[1], m[2] || "g");
    const b = toGrams(m[3], m[4] || m[2] || "g");
    if (!(a > 0) || !(b > 0)) continue;
    const minG = Math.min(a, b);
    const maxG = Math.max(a, b);
    if (maxG > 0) return { minG, maxG };
  }

  let minG = 0;
  let maxG = 0;
  const minOnly = t.match(/(?:capacidad\s*)?(?:minima|minimo|desde|mayor\s+que|mas\s+de)\s*(\d+(?:[\.,]\d+)?)\s*(mg|g|kg|gr|gramo|gramos)\b/i);
  const maxOnly = t.match(/(?:capacidad\s*)?(?:maxima|maximo|hasta|menor\s+que|no\s+mas\s+de)\s*(\d+(?:[\.,]\d+)?)\s*(mg|g|kg|gr|gramo|gramos)\b/i);
  if (minOnly) minG = toGrams(minOnly[1], minOnly[2] || "g");
  if (maxOnly) maxG = toGrams(maxOnly[1], maxOnly[2] || "g");
  if (minG > 0 && maxG > 0) {
    const minV = Math.min(minG, maxG);
    const maxV = Math.max(minG, maxG);
    return { minG: minV, maxG: maxV };
  }
  if (minG > 0) return { minG, maxG: Number.POSITIVE_INFINITY };
  if (maxG > 0) return { minG: 0, maxG };
  return null;
}

export function parseExplicitCapacityHint(text: string): number {
  const t = normalizeText(String(text || ""))
    .replace(/(\d)\s*[\.,]\s*(\d)/g, "$1.$2")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return 0;
  const m = t.match(/\bcapacidad\D{0,20}(\d+(?:[\.,]\d+)?)\s*(mg|g|kg|gr|gramo|gramos)\b/i);
  if (!m) return 0;
  return toGrams(String(m[1] || ""), String(m[2] || "g"));
}

export function mergeLooseSpecWithMemory(
  prev: { capacityG?: number; readabilityG?: number },
  hint: { capacityG?: number; readabilityG?: number } | null
): { capacityG: number; readabilityG: number } {
  const prevCap = Number(prev?.capacityG || 0);
  const prevRead = Number(prev?.readabilityG || 0);
  let cap = Number(hint?.capacityG || 0);
  let read = Number(hint?.readabilityG || 0);

  if (prevCap > 0 && !(prevRead > 0) && cap > 0 && cap <= 1 && !(read > 0)) {
    read = cap;
    cap = 0;
  }
  if (prevRead > 0 && !(prevCap > 0) && read > 0 && !(cap > 0) && read >= 1) {
    cap = read;
    read = 0;
  }

  return {
    capacityG: cap > 0 ? normalizeRequestedCapacityG(cap) : normalizeRequestedCapacityG(prevCap),
    readabilityG: read > 0 ? read : prevRead,
  };
}

export function formatSpecNumber(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n >= 1) return String(Number(n.toFixed(3))).replace(/\.0+$/, "");
  if (n >= 0.01) return String(Number(n.toFixed(4))).replace(/\.0+$/, "");
  return String(Number(n.toFixed(6))).replace(/\.0+$/, "");
}

export function formatDimensionTripletMm(dimsMm: number[]): string {
  const d = (Array.isArray(dimsMm) ? dimsMm : []).map((n) => Number(n || 0)).filter((n) => n > 0);
  if (d.length !== 3) return "dimensiones";
  return `${formatSpecNumber(d[0])} x ${formatSpecNumber(d[1])} x ${formatSpecNumber(d[2])} mm`;
}

export function inferFamilyFromReadability(readabilityG: number): { family: string; capacityHint: string } {
  const r = Number(readabilityG || 0);
  if (!(r > 0)) return { family: "balanzas", capacityHint: "200 g, 620 g o 3200 g" };
  if (r <= 0.0001) return { family: "Balanza Analítica", capacityHint: "120 g, 220 g o 320 g" };
  if (r <= 0.001) return { family: "Balanza Semi - Micro", capacityHint: "120 g, 220 g o 520 g" };
  if (r <= 0.01) return { family: "Balanza Precisión", capacityHint: "620 g, 1600 g, 3200 g o 6200 g" };
  if (r <= 0.1) return { family: "Balanzas Contadoras", capacityHint: "3 kg, 6 kg o 15 kg" };
  return { family: "Balanzas industriales", capacityHint: "15 kg, 30 kg o 60 kg" };
}

export function isTechnicalSpecQuery(text: string): boolean {
  return Boolean(parseTechnicalSpecQuery(text));
}
