export function extractModelLikeTokens(text: string, normalizeCatalogQueryText: (value: string) => string): string[] {
  return Array.from(
    new Set(
      normalizeCatalogQueryText(text || "")
        .split(/[^a-z0-9]+/i)
        .map((x) => x.trim())
        .filter((x) => x.length >= 3)
        .filter((x) => /\d/.test(x))
    )
  );
}

export function splitModelToken(token: string, normalizeCatalogQueryText: (value: string) => string): { letters: string; digits: string } {
  const t = normalizeCatalogQueryText(String(token || "")).replace(/[^a-z0-9]/g, "");
  const letters = (t.match(/^[a-z]+/) || [""])[0];
  const digits = (t.match(/\d+/g) || []).join("");
  return { letters, digits };
}

export function pickBestCatalogProduct(args: {
  text: string;
  rows: any[];
  normalizeCatalogQueryText: (value: string) => string;
  normalizeText: (value: string) => string;
  extractModelLikeTokens: (value: string) => string[];
}): any | null {
  const inbound = args.normalizeCatalogQueryText(args.text);
  const modelTokens = args.extractModelLikeTokens(inbound);
  const terms = Array.from(
    new Set(
      inbound
        .split(/[^a-z0-9]+/i)
        .map((x) => x.trim())
        .filter((x) => x.length >= 2)
        .filter((x) => !["quiero", "cotizar", "cotizacion", "marca", "cliente", "cantidad", "trm", "hoy", "enviame", "whatsapp", "pdf", "producto"].includes(x))
    )
  );

  let best: { row: any; score: number } | null = null;
  for (const row of args.rows || []) {
    const rowName = args.normalizeText(String(row?.name || ""));
    const hay = args.normalizeText(`${row?.name || ""} ${row?.brand || ""} ${row?.category || ""}`);
    const inboundCompact = inbound.replace(/\s+/g, "");
    const nameCompact = rowName.replace(/\s+/g, "");
    const inboundAlphaNum = inbound.replace(/[^a-z0-9]+/g, "");
    const nameAlphaNum = rowName.replace(/[^a-z0-9]+/g, "");
    let score = 0;
    if (rowName && inbound.includes(rowName)) score += 10;
    if (nameCompact && inboundCompact.includes(nameCompact)) score += 8;
    if (nameAlphaNum && inboundAlphaNum.includes(nameAlphaNum)) score += 14;
    for (const token of modelTokens) {
      if (hay.includes(token)) score += 10;
    }
    for (const term of terms) {
      if (hay.includes(term)) score += /^\d+$/.test(term) ? 3 : 2;
    }
    if (!best || score > best.score) best = { row, score };
  }

  if (!best || best.score < 4) return null;
  return best.row;
}

export function findExactModelProduct(args: {
  text: string;
  rows: any[];
  normalizeCatalogQueryText: (value: string) => string;
  catalogSubcategory: (row: any) => string;
  extractModelLikeTokens: (value: string) => string[];
  splitModelToken: (value: string) => { letters: string; digits: string };
}): any | null {
  const inbound = args.normalizeCatalogQueryText(args.text || "");
  const tokens = args.extractModelLikeTokens(inbound);
  if (!tokens.length) return null;
  const inboundCompact = inbound.replace(/[^a-z0-9]+/g, "");

  let best: { row: any; score: number } | null = null;
  for (const row of args.rows || []) {
    const rowName = args.normalizeCatalogQueryText(String(row?.name || ""));
    const hay = args.normalizeCatalogQueryText(`${row?.name || ""} ${row?.brand || ""} ${row?.category || ""} ${args.catalogSubcategory(row)}`);
    const rowCompact = rowName.replace(/[^a-z0-9]+/g, "");
    let score = 0;

    if (rowCompact && inboundCompact.includes(rowCompact)) score += 18;
    if (rowName && inbound.includes(rowName)) score += 12;

    const rowModelTokens = args.extractModelLikeTokens(rowName);
    for (const t of tokens) {
      const nt = args.normalizeCatalogQueryText(t);
      if (hay.includes(nt)) {
        score += 10;
        continue;
      }
      const tt = args.splitModelToken(nt);
      for (const rtRaw of rowModelTokens) {
        const rt = args.splitModelToken(rtRaw);
        if (!tt.letters || !rt.letters) continue;
        if (tt.letters === rt.letters && tt.digits && rt.digits && rt.digits.includes(tt.digits)) {
          score += 8;
          break;
        }
      }
    }

    if (!best || score > best.score) best = { row, score };
  }
  if (!best || best.score < 8) return null;
  return best.row;
}

export function findExplicitModelProducts(args: {
  text: string;
  rows: any[];
  normalizeCatalogQueryText: (value: string) => string;
  extractModelLikeTokens: (value: string) => string[];
  splitModelToken: (value: string) => { letters: string; digits: string };
  findExactModelProduct: (text: string, rows: any[]) => any | null;
  pickBestCatalogProduct: (text: string, rows: any[]) => any | null;
}): any[] {
  const inbound = args.normalizeCatalogQueryText(String(args.text || ""));
  const modelTokens = args.extractModelLikeTokens(inbound);
  if (!modelTokens.length) return [];
  const found: any[] = [];
  const seenIds = new Set<string>();
  for (const token of modelTokens) {
    const nt = args.normalizeCatalogQueryText(String(token || "")).replace(/[^a-z0-9]+/g, "");
    const strict = (args.rows || []).filter((row: any) => {
      const base = `${String(row?.name || "")} ${String(row?.slug || "")}`;
      const rowTokens = args.extractModelLikeTokens(base);
      if (!rowTokens.length) return false;
      return rowTokens.some((rtRaw) => {
        const rt = args.normalizeCatalogQueryText(String(rtRaw || "")).replace(/[^a-z0-9]+/g, "");
        if (!rt || !nt) return false;
        if (rt === nt) return true;
        const a = args.splitModelToken(rt);
        const b = args.splitModelToken(nt);
        return Boolean(a.letters && b.letters && a.letters === b.letters && a.digits && b.digits && (a.digits === b.digits || a.digits.startsWith(b.digits)));
      });
    });

    const candidate =
      (strict.length === 1 ? strict[0] : null) ||
      args.findExactModelProduct(token, strict.length ? strict : (args.rows || [])) ||
      args.pickBestCatalogProduct(token, strict.length ? strict : (args.rows || []));
    const id = String(candidate?.id || "").trim();
    if (!candidate || !id || seenIds.has(id)) continue;
    seenIds.add(id);
    found.push(candidate);
  }
  return found;
}

export function isFeatureQuestionIntent(text: string, normalizeCatalogQueryText: (value: string) => string): boolean {
  const t = normalizeCatalogQueryText(text || "");
  if (!t) return false;
  const hasMeasurementSpec = /\b\d+(?:[\.,]\d+)?\s*(?:mg|g|kg)\b/.test(t);
  return (
    /(que tenga|que tengan|tiene|tienen|incluye|incluyan|debe tener|caracteristic|especificacion|especificaciones)/.test(t) ||
    /(con\s+(calibracion|precision|resolucion|capacidad|bateria|usb|bluetooth|wifi|rs\s*232|ip\d{2}|pantalla|sensor|humedad|analitic|semi|micro|calibracion\s+externa|calibracion\s+interna))/.test(t) ||
    hasMeasurementSpec
  );
}

export function hasConcreteProductHint(args: {
  text: string;
  normalizeCatalogQueryText: (value: string) => string;
  extractModelLikeTokens: (value: string) => string[];
  extractCatalogTerms: (value: string) => string[];
}): boolean {
  const t = args.normalizeCatalogQueryText(args.text || "");
  if (!t) return false;

  if (args.extractModelLikeTokens(t).length > 0) return true;

  if (/\b(sjx|spx|stx|px\d{2,6}[a-z]?|ax\d{2,6}[a-z]?|mb\d{2,6}|st\d{2,6}|pr\d{2,6})\b/.test(t)) {
    return true;
  }

  const hasFamily = /\b(scout|pioneer|adventurer|explorer|defender|ranger|valor|frontier|starter)\b/.test(t);
  if (!hasFamily) return false;

  const generic = new Set(["balanza", "balanzas", "bascula", "basculas", "electroquimica", "analizador", "humedad", "equipo", "equipos", "laboratorio"]);
  const terms = args.extractCatalogTerms(t).filter((x) => !generic.has(x));
  return terms.length >= 2;
}
