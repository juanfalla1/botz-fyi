export function detectCalibrationPreference(text: string, normalizeText: (value: string) => string): "external" | "internal" | null {
  const t = normalizeText(text || "");
  if (!t) return null;
  if (/(calibracion\s+externa|externa\s+calibracion|pesa\s+patron|masa\s+patron|external\s+calibration)/.test(t)) return "external";
  if (/(calibracion\s+interna|interna\s+calibracion|autocal|ajuste\s+interno|internal\s+calibration)/.test(t)) return "internal";
  return null;
}

export function extractFeatureTerms(args: {
  text: string;
  extractCatalogTerms: (value: string) => string[];
  normalizeText: (value: string) => string;
  uniqueNormalizedStrings: (values: string[], max?: number) => string[];
}): string[] {
  const blacklist = new Set([
    "balanza", "balanzas", "bascula", "basculas", "equipo", "equipos", "producto", "productos", "categoria",
    "cotizar", "cotizacion", "presupuesto", "precio", "trm", "whatsapp", "catalogo", "referencia", "referencias",
    "modelo", "modelos", "tiene", "tienen", "tenga", "tengan", "incluye", "incluyan", "caracteristica", "caracteristicas",
    "especificacion", "especificaciones", "debe", "tener", "con", "busco", "necesito", "quiero", "ohaus",
    "mas", "otros", "otras", "otro", "que", "prodcuto", "prodcutos", "productod",
    "pesar", "cosas", "grandes", "grande", "pesado", "pesados", "pesada", "pesadas",
    "pequeño", "pequeños", "pequeña", "pequeñas", "pequeno", "pequenos", "pequena", "pequenas",
    "liviano", "livianos", "liviana", "livianas", "ligero", "ligeros", "ligera", "ligeras",
    "chico", "chicos", "chica", "chicas", "diminuto", "minusculo", "menudo",
    "necesito", "quiero", "busco", "algo", "mucho", "muy", "bien", "bastante",
    "alto", "alta", "bajo", "baja", "poca", "poco", "mayor", "menor",
  ]);
  const aliasMap: Record<string, string> = {
    tipo: "",
    tipos: "",
    clase: "",
    clases: "",
    balanza: "balanzas",
    balanzas: "balanzas",
    bascula: "basculas",
    basculas: "basculas",
    joyeria: "joyeria",
    "joyería": "joyeria",
    precision: "precision",
    "precisión": "precision",
    analitica: "analitica",
    "analítica": "analitica",
    semi: "semi",
    humedad: "humedad",
    plataforma: "plataforma",
  };
  const measurementTerms = Array.from(
    new Set(
      (String(args.text || "").toLowerCase().match(/\b\d+(?:[\.,]\d+)?\s*(?:g|kg|mg)\b/g) || [])
        .map((x) => x.replace(/\s+/g, "").replace(/,/g, "."))
    )
  );
  const normalized = args.extractCatalogTerms(args.text)
    .map((term) => {
      const key = args.normalizeText(term);
      if (!(key in aliasMap)) return key;
      return String(aliasMap[key] || "").trim();
    })
    .filter((term) => term && !blacklist.has(term));
  return args.uniqueNormalizedStrings([...normalized, ...measurementTerms], 10);
}

export function catalogFeatureSearchBlob(args: {
  row: any;
  normalizeCatalogQueryText: (value: string) => string;
  catalogSubcategory: (row: any) => string;
}): string {
  const payload = args.row?.source_payload && typeof args.row.source_payload === "object" ? args.row.source_payload : {};
  const specsJson = args.row?.specs_json;
  const specsJsonText = typeof specsJson === "string"
    ? specsJson
    : (specsJson ? JSON.stringify(specsJson) : "");
  return args.normalizeCatalogQueryText(
    [
      String(args.row?.name || ""),
      String(args.row?.brand || ""),
      String(args.row?.category || ""),
      String(args.catalogSubcategory(args.row) || ""),
      String(args.row?.summary || ""),
      String(args.row?.description || ""),
      String(args.row?.specs_text || ""),
      specsJsonText,
      JSON.stringify(payload || {}),
    ].join(" ")
  );
}

export function rowMatchesCalibrationPreference(args: {
  row: any;
  preference: "external" | "internal" | null;
  catalogFeatureSearchBlob: (row: any) => string;
}): boolean {
  if (!args.preference) return true;
  const hay = args.catalogFeatureSearchBlob(args.row);
  if (args.preference === "external") {
    return /(calibr\w*\s*(extern|manual)|external\s+calibration|pesa\s+patron|masa\s+patron)/.test(hay);
  }
  return /(calibr\w*\s*(intern|auto|ajuste\s+interno)|internal\s+calibration|autocal)/.test(hay);
}

export function rankCatalogByFeature(args: {
  rows: any[];
  featureTerms: string[];
  catalogFeatureSearchBlob: (row: any) => string;
}): Array<{ row: any; matches: number; score: number }> {
  if (!Array.isArray(args.rows) || !args.rows.length || !args.featureTerms.length) return [];
  const measurementTerms = args.featureTerms.filter((t) => /\d/.test(t) && /(mg|g|kg)$/.test(t));
  const ranked = (args.rows || []).map((row: any) => {
    const hay = args.catalogFeatureSearchBlob(row);
    const hayCompact = hay.replace(/\s+/g, "");
    let matches = 0;
    let score = 0;
    let measurementMatches = 0;
    for (const term of args.featureTerms) {
      if (!term) continue;
      const found = hay.includes(term) || hayCompact.includes(term.replace(/\s+/g, ""));
      if (found) {
        matches += 1;
        score += /\d/.test(term) ? 3 : term.length >= 6 ? 2 : 1;
        if (measurementTerms.includes(term)) measurementMatches += 1;
      }
    }
    if (matches === args.featureTerms.length) score += 2;
    if (measurementTerms.length && measurementMatches === measurementTerms.length) score += 4;
    return { row, matches, score, measurementMatches };
  });
  return ranked
    .filter((x: any) => {
      if (measurementTerms.length > 0) return x.measurementMatches === measurementTerms.length;
      return x.matches >= Math.min(args.featureTerms.length, args.featureTerms.length <= 2 ? 1 : 2);
    })
    .sort((a, b) => b.score - a.score);
}
