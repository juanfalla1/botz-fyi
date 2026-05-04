export type ProductOption = {
  code: string;
  rank: number;
  id: string;
  name: string;
  raw_name: string;
  category: string;
  base_price_usd: number;
};

export type FamilyOption = {
  code: string;
  rank: number;
  key: string;
  label: string;
  count: number;
};

export function catalogReferenceCode(row: any): string {
  const source = row?.source_payload && typeof row.source_payload === "object" ? row.source_payload : {};
  const fromSource = String(source?.product_code || source?.sap || source?.numero_modelo || "").trim();
  if (fromSource) return fromSource;
  const fromName = String(row?.name || "").trim().match(/\b([A-Z]{1,4}\d+[A-Z0-9\/-]*)\b/);
  if (fromName?.[1]) return fromName[1];
  return "";
}

export function prettifyCatalogLabel(raw: string): string {
  const txt = String(raw || "").replace(/\s+/g, " ").trim();
  if (!txt) return "";
  const alpha = (txt.match(/[a-zA-Z]/g) || []).length;
  const upper = (txt.match(/[A-Z]/g) || []).length;
  const mostlyUpper = alpha > 8 && (upper / Math.max(1, alpha)) >= 0.72;
  if (!mostlyUpper) return txt;
  const lower = txt.toLowerCase();
  const titled = lower.replace(/\b([a-záéíóúñ][a-záéíóúñ0-9\/-]*)\b/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
  return titled
    .replace(/\bDe\b/g, "de")
    .replace(/\bY\b/g, "y")
    .replace(/\bCon\b/g, "con")
    .replace(/\bPara\b/g, "para");
}

export function dedupeOptionSpecSegments(text: string, normalizeText: (value: string) => string): string {
  const raw = String(text || "").trim();
  if (!raw.includes("|")) return raw;
  const parts = raw.split("|").map((p) => String(p || "").trim()).filter(Boolean);
  if (parts.length <= 1) return raw;
  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    const key = normalizeText(part).replace(/\s+/g, " ").trim();
    const specKey = key.startsWith("gama:")
      ? "gama"
      : key.startsWith("cap:")
        ? "cap"
        : key.startsWith("res:")
          ? "res"
          : key.startsWith("entrega:")
            ? "entrega"
            : "";
    const dedupeKey = specKey || key;
    if (!dedupeKey || seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    out.push(part);
  }
  return out.join(" | ");
}

export function gamaLabelForModelName(name: string, normalizeText: (value: string) => string): string {
  const n = normalizeText(String(name || "")).replace(/[^a-z0-9]/g, "");
  if (!n) return "";
  if (/^exp(1203|125d|225d)ad$/.test(n)) return "premium";
  if (/^exp(223|423|623|224|324)ad$/.test(n)) return "avanzada";
  if (/^px\d/.test(n)) return "esencial";
  if (/^vx\d/.test(n)) return "intermedia";
  if (/^ax\d/.test(n)) return "intermedia";
  if (/^exr\d/.test(n)) return "avanzada";
  if (/^exp\d+ad$/.test(n)) return "avanzada";
  if (/^exp\d/.test(n)) return "premium";
  if (/^r31p\d|^rc31p\d/.test(n)) return "basica";
  if (/^r71md\d/.test(n)) return "media";
  if (/^r71mhd\d/.test(n)) return "alta";
  if (/^sjx\d/.test(n)) return "esencial";
  if (/^spx\d/.test(n)) return "intermedia";
  if (/^stx\d/.test(n)) return "avanzada";
  return "";
}

export function optionDisplayName(args: {
  row: any;
  humanCatalogName: (value: string) => string;
  normalizeText: (value: string) => string;
}): string {
  const base = args.humanCatalogName(String(args.row?.name || "").trim()) || String(args.row?.name || "").trim();
  const clean = prettifyCatalogLabel(base).replace(/\s*\+\s*/g, " + ").trim();
  const code = catalogReferenceCode(args.row);
  const out = code && !args.normalizeText(clean).includes(args.normalizeText(code))
    ? `${code} - ${clean}`
    : clean;
  return out.length > 88 ? `${out.slice(0, 85)}...` : out;
}

export function buildNumberedProductOptions(args: {
  rows: any[];
  maxItems?: number;
  extractRowTechnicalSpec: (row: any) => { capacityG: number; readabilityG: number };
  formatSpecNumber: (value: number) => string;
  deliveryLabelForRow: (ctx: { row: any; catalogReferenceCode: (row: any) => string }) => string;
  humanCatalogName: (value: string) => string;
  normalizeText: (value: string) => string;
}): ProductOption[] {
  const list = Array.isArray(args.rows) ? args.rows : [];
  const out: ProductOption[] = [];
  const seen = new Set<string>();
  const maxItems = Math.max(1, Number(args.maxItems || 5));
  for (const row of list) {
    const baseName = optionDisplayName({ row, humanCatalogName: args.humanCatalogName, normalizeText: args.normalizeText });
    const spec = args.extractRowTechnicalSpec(row);
    const specParts: string[] = [];
    const gama = gamaLabelForModelName(String(row?.name || ""), args.normalizeText);
    if (gama) specParts.push(`Gama: ${gama}`);
    if (spec.capacityG > 0) specParts.push(`Cap: ${args.formatSpecNumber(spec.capacityG)} g`);
    if (spec.readabilityG > 0) specParts.push(`Res: ${args.formatSpecNumber(spec.readabilityG)} g`);
    const delivery = args.deliveryLabelForRow({ row, catalogReferenceCode });
    if (delivery) specParts.push(`Entrega: ${delivery}`);
    const suffix = specParts.length ? ` | ${specParts.join(" | ")}` : "";
    const name = dedupeOptionSpecSegments(`${baseName}${suffix}`, args.normalizeText).slice(0, 140);
    if (!name) continue;
    const key = String(row?.id || "").trim() || args.normalizeText(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const rank = out.length + 1;
    if (rank > maxItems) break;
    const code = String(rank);
    out.push({
      code,
      rank,
      id: String(row?.id || "").trim(),
      name,
      raw_name: String(row?.name || "").trim() || name,
      category: String(row?.category || "").trim(),
      base_price_usd: Number(row?.base_price_usd || 0),
    });
  }
  return out;
}

export function resolvePendingProductOption(args: {
  text: string;
  optionsRaw: any;
  normalizeText: (value: string) => string;
  extractModelLikeTokens: (value: string) => string[];
  splitModelToken: (value: string) => { letters: string; digits: string };
  extractCatalogTerms: (value: string) => string[];
}): ProductOption | null {
  const tRaw = String(args.text || "").trim();
  const t = args.normalizeText(tRaw);
  if (!t) return null;
  const options = (Array.isArray(args.optionsRaw) ? args.optionsRaw : [])
    .map((o: any) => ({
      code: String(o?.code || "").trim().toUpperCase(),
      rank: Number(o?.rank || 0),
      id: String(o?.id || "").trim(),
      name: String(o?.name || "").trim(),
      raw_name: String(o?.raw_name || o?.name || "").trim(),
      category: String(o?.category || "").trim(),
      base_price_usd: Number(o?.base_price_usd || 0),
    }))
    .filter((o: any) => o.name);
  if (!options.length) return null;

  const firstToken = String(tRaw).trim().split(/\s+/)[0] || "";
  const firstTokenClean = firstToken.replace(/[^a-z0-9]/gi, "").toUpperCase();
  const codeMatch = t.match(/(?:^|\b)(?:opcion|codigo|código|letra)\s*([a-z])\b/i) || t.match(/^\s*([a-z])\s*$/i);
  const numMatch = t.match(/(?:^|\b)(?:opcion|numero|número|#)\s*([1-9])\b/i) || t.match(/^\s*([1-9])(?:\s|$)/i);
  const code = String(codeMatch?.[1] || "").toUpperCase();
  const rank = Number(numMatch?.[1] || 0);
  if (!code && !rank && /^[A-Z]$/.test(firstTokenClean)) {
    const byLeadingCode = options.find((o: any) => o.code === firstTokenClean);
    if (byLeadingCode) return byLeadingCode;
  }
  if (!code && !rank && /^[1-9]$/.test(firstTokenClean)) {
    const byLeadingRank = options.find((o: any) => o.rank === Number(firstTokenClean));
    if (byLeadingRank) return byLeadingRank;
  }
  if (code) {
    const byCode = options.find((o: any) => o.code === code);
    if (byCode) return byCode;
  }
  if (rank > 0) {
    const byRank = options.find((o: any) => o.rank === rank);
    if (byRank) return byRank;
  }

  for (const option of options) {
    const nameNorm = args.normalizeText(option.name);
    if (nameNorm && t.includes(nameNorm)) return option;
    const modelTokens = args.extractModelLikeTokens(option.name);
    if (modelTokens.some((tk) => t.includes(args.normalizeText(tk)))) return option;
    const inboundModelTokens = args.extractModelLikeTokens(tRaw);
    if (inboundModelTokens.length && modelTokens.length) {
      const hasModelNearMatch = inboundModelTokens.some((rawIn) => {
        const inTok = args.splitModelToken(rawIn);
        if (!inTok.letters || !inTok.digits) return false;
        return modelTokens.some((rawOpt) => {
          const optTok = args.splitModelToken(rawOpt);
          if (!optTok.letters || !optTok.digits) return false;
          if (inTok.letters !== optTok.letters) return false;
          if (inTok.digits === optTok.digits) return true;
          if (optTok.digits.startsWith(inTok.digits) || inTok.digits.startsWith(optTok.digits)) return true;
          const inNoZero = inTok.digits.replace(/0/g, "");
          const optNoZero = optTok.digits.replace(/0/g, "");
          return inNoZero.length >= 2 && inNoZero === optNoZero;
        });
      });
      if (hasModelNearMatch) return option;
    }
    const terms = args.extractCatalogTerms(option.name).filter((term) => term.length >= 5).slice(0, 6);
    const hits = terms.reduce((acc, term) => (t.includes(term) ? acc + 1 : acc), 0);
    if (hits >= Math.min(2, Math.max(1, terms.length))) return option;
  }

  return null;
}

export function resolvePendingProductOptionStrict(text: string, optionsRaw: any): ProductOption | null {
  const tRaw = String(text || "").trim();
  if (!tRaw) return null;
  const options = (Array.isArray(optionsRaw) ? optionsRaw : [])
    .map((o: any) => ({
      code: String(o?.code || "").trim().toUpperCase(),
      rank: Number(o?.rank || 0),
      id: String(o?.id || "").trim(),
      name: String(o?.name || "").trim(),
      raw_name: String(o?.raw_name || o?.name || "").trim(),
      category: String(o?.category || "").trim(),
      base_price_usd: Number(o?.base_price_usd || 0),
    }))
    .filter((o: any) => o.name);
  if (!options.length) return null;

  const codeMatch =
    tRaw.match(/^\s*([a-z])\s*$/i) ||
    tRaw.match(/^\s*(?:opcion|opción|letra|codigo|código)\s*[:\-]?\s*([a-z])\s*$/i);
  const numMatch =
    tRaw.match(/^\s*([1-9]\d?)\s*$/i) ||
    tRaw.match(/^\s*(?:opcion|opción|numero|número|#)\s*[:\-]?\s*([1-9]\d?)\s*$/i);
  const code = String(codeMatch?.[1] || "").toUpperCase();
  const rank = Number(numMatch?.[1] || 0);

  if (code) {
    const byCode = options.find((o: any) => o.code === code);
    if (byCode) return byCode;
  }
  if (rank > 0) {
    const byRank = options.find((o: any) => o.rank === rank);
    if (byRank) return byRank;
  }
  return null;
}

export function familyLabelFromRow(row: any, normalizeText: (value: string) => string): string {
  const source = row?.source_payload && typeof row.source_payload === "object" ? row.source_payload : {};
  const family = String(source?.family || source?.familia || "").trim();
  const categoryNorm = normalizeText(String(row?.category || ""));
  const subNorm = normalizeText(String(source?.subcategory || "").trim());
  if (family) {
    if (
      (categoryNorm === "basculas" || subNorm.startsWith("basculas") || subNorm.startsWith("plataformas") || subNorm.startsWith("indicadores")) &&
      /balanzas?/.test(normalizeText(family))
    ) {
      return "Bascula industriales";
    }
    return family;
  }
  const sub = subNorm;
  if (sub) {
    const mapped: Record<string, string> = {
      balanzas_semimicro: "Balanza Semi - Micro",
      balanzas_analiticas: "Balanza Analitica",
      balanzas_semianaliticas: "Balanza Semi - Analitica",
      balanzas_precision: "Balanza Precisión",
      balanzas_conteo: "Balanzas Contadoras",
      balanzas_mesa: "Balanzas industriales",
      basculas_mesa: "Bascula industriales",
      basculas_piso: "Bascula industriales",
      basculas_lavables: "Bascula industriales",
      plataformas: "Bascula industriales",
      plataformas_lavables: "Bascula industriales",
      indicadores: "Bascula industriales",
      indicadores_lavables: "Bascula industriales",
      analizador_humedad: "Analizador de humedad",
    };
    if (mapped[sub]) return mapped[sub];
  }
  return "";
}

export function buildNumberedFamilyOptions(rows: any[], normalizeText: (value: string) => string, maxItems = 8): FamilyOption[] {
  const map = new Map<string, { key: string; label: string; count: number }>();
  const rowList = Array.isArray(rows) ? rows : [];
  const balanzasOnly = rowList.length > 0 && rowList.every((row: any) => {
    const c = normalizeText(String(row?.category || ""));
    return c === "balanzas" || c.startsWith("balanzas_");
  });
  const canonicalBalanzasFamilyLabel = (label: string): string => {
    const t = normalizeText(label);
    if (!t) return "";
    if (t.includes("portatil")) return "Balanzas industriales";
    if (t.includes("semimicro") || t.includes("semi micro")) return "Balanza Semi - Micro";
    if (t.includes("semi") && t.includes("analit")) return "Balanza Semi - Analitica";
    if (t.includes("analit")) return "Balanza Analitica";
    if (t.includes("precis")) return "Balanza Precisión";
    if (t.includes("contadora") || t.includes("conteo")) return "Balanzas Contadoras";
    if (t.includes("industrial") || t.includes("mesa")) return "Balanzas industriales";
    return label;
  };
  for (const row of rowList) {
    const rawLabel = familyLabelFromRow(row, normalizeText);
    const label = balanzasOnly ? canonicalBalanzasFamilyLabel(rawLabel) : rawLabel;
    const key = normalizeText(label);
    if (!key) continue;
    if (["balanzas", "basculas", "general"].includes(key)) continue;
    const prev = map.get(key) || { key, label, count: 0 };
    prev.count += 1;
    if (!prev.label || prev.label.length > label.length) prev.label = label;
    map.set(key, prev);
  }
  const preferredBalanzasOrder = [
    "balanza semi - micro",
    "balanza analitica",
    "balanza semi - analitica",
    "balanza precision",
    "balanzas industriales",
    "balanzas contadoras",
  ].map((x) => normalizeText(x));
  const orderIndex = (label: string) => {
    const idx = preferredBalanzasOrder.indexOf(normalizeText(label));
    return idx >= 0 ? idx : 999;
  };

  return Array.from(map.values())
    .sort((a, b) => {
      if (balanzasOnly) {
        const ai = orderIndex(a.label);
        const bi = orderIndex(b.label);
        if (ai !== bi) return ai - bi;
      }
      return b.count - a.count || a.label.localeCompare(b.label);
    })
    .slice(0, maxItems)
    .map((x, i) => ({ code: String.fromCharCode(65 + i), rank: i + 1, key: x.key, label: x.label, count: x.count }));
}

export function resolvePendingFamilyOption(text: string, optionsRaw: any, normalizeText: (value: string) => string): FamilyOption | null {
  const options = (Array.isArray(optionsRaw) ? optionsRaw : [])
    .map((o: any) => ({
      code: String(o?.code || "").toUpperCase(),
      rank: Number(o?.rank || 0),
      key: String(o?.key || "").trim(),
      label: String(o?.label || "").trim(),
      count: Number(o?.count || 0),
    }))
    .filter((o: any) => o.code && o.rank > 0 && o.key);
  if (!options.length) return null;
  const t = normalizeText(String(text || "").trim());
  if (!t) return null;
  const byDirect = options.find((o: any) => t === normalizeText(o.code) || t === String(o.rank));
  if (byDirect) return byDirect;
  const byMention = options.find((o: any) => normalizeText(o.label).includes(t) || t.includes(normalizeText(o.label)));
  if (byMention) return byMention;

  const tTerms = t
    .split(/[^a-z0-9]+/i)
    .map((x) => x.trim())
    .filter((x) => x.length >= 4)
    .filter((x) => !["dije", "dijiste", "quiero", "busco", "tengo", "tienes", "familia", "elige", "opcion"].includes(x));
  if (!tTerms.length) return null;

  let best: any = null;
  for (const o of options) {
    const labelTerms = normalizeText(String(o.label || ""))
      .split(/[^a-z0-9]+/i)
      .map((x) => x.trim())
      .filter((x) => x.length >= 4);
    const hits = tTerms.filter((tt) => labelTerms.some((lt) => lt.includes(tt) || tt.includes(lt))).length;
    if (!best || hits > best.hits) best = { o, hits };
  }
  return best && best.hits > 0 ? best.o : null;
}

export function inferFamilyFromUseCase(text: string, optionsRaw: any, normalizeText: (value: string) => string): FamilyOption | null {
  const options = (Array.isArray(optionsRaw) ? optionsRaw : [])
    .map((o: any) => ({
      code: String(o?.code || "").toUpperCase(),
      rank: Number(o?.rank || 0),
      key: String(o?.key || "").trim(),
      label: String(o?.label || "").trim(),
      count: Number(o?.count || 0),
    }))
    .filter((o: any) => o.code && o.rank > 0 && o.key);
  if (!options.length) return null;
  const t = normalizeText(String(text || ""));
  if (!t) return null;

  const wantsJewelryPrecision = /(oro|joyeria|joyeria|ley\s+de\s+oro|quilat|kilat|gramera|anillo|arete|cadena|gramos|gramo|mg|miligram)/.test(t);
  const wantsIndustrial = /(maquina|maquinas|bodega|industrial|plataforma|carga pesada)/.test(t);
  const wantsLab = /(laboratorio|farmacia|control de calidad|formulacion|formulación|microbiologia|analis|investigacion)/.test(t);

  const rankByHints = (o: any) => {
    const l = normalizeText(String(o?.label || ""));
    let score = 0;
    if (wantsJewelryPrecision) {
      if (/joyeria|jewelry/.test(l)) score += 8;
      if (/analitica|semi\s*analitica|semi\s*micro/.test(l)) score += 6;
      if (/precision/.test(l)) score += 4;
    }
    if (wantsIndustrial) {
      if (/industrial|plataforma|basculas/.test(l)) score += 8;
    }
    if (wantsLab) {
      if (/analitica|semi\s*analitica|precision|laboratorio/.test(l)) score += 8;
      if (/micro|semi\s*micro/.test(l)) score += 4;
    }
    return score;
  };

  const best = options
    .map((o: any) => ({ o, score: rankByHints(o) }))
    .sort((a: any, b: any) => b.score - a.score || a.o.rank - b.o.rank)[0];

  return best && best.score > 0 ? best.o : null;
}

export function isOptionOnlyReply(text: string, normalizeText: (value: string) => string): boolean {
  const t = normalizeText(text || "");
  if (!t) return false;
  return /^(opcion\s*)?([a-z]|[1-9])$/.test(t) || /^(quiero|elijo|escojo)\s+(opcion\s*)?([a-z]|[1-9])$/.test(t);
}

export function extractPerProductQuantities(args: {
  text: string;
  products: Array<{ id: string; name: string }>;
  normalizeText: (value: string) => string;
  extractQuantity: (value: string) => number;
}): Record<string, number> {
  const result: Record<string, number> = {};
  const chunks = String(args.text || "")
    .split(/\n|;|\|/)
    .map((x) => x.trim())
    .filter(Boolean);

  for (const p of args.products || []) {
    const pName = args.normalizeText(String(p?.name || ""));
    const terms = pName
      .split(/[^a-z0-9]+/i)
      .map((x) => x.trim())
      .filter((x) => x.length >= 5)
      .slice(0, 6);

    for (const chunk of chunks) {
      const c = args.normalizeText(chunk);
      const hits = terms.reduce((acc, t) => (c.includes(t) ? acc + 1 : acc), 0);
      if (hits >= 2 || (pName && c.includes(pName))) {
        const qty = args.extractQuantity(chunk);
        if (qty > 0) {
          result[String(p.id)] = qty;
          break;
        }
      }
    }
  }

  return result;
}
