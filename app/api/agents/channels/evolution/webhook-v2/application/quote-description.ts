export function extractSpecsFromJson(args: {
  specsJson: any;
  maxLines?: number;
  normalizeText: (v: string) => string;
  uniqueNormalizedStrings: (values: string[], max?: number) => string[];
}): string[] {
  const maxLines = Number(args.maxLines || 4);
  const tables = Array.isArray(args.specsJson?.tables) ? args.specsJson.tables : [];
  const out: string[] = [];
  for (const t of tables) {
    const headers = Array.isArray(t?.headers) ? t.headers.map((h: any) => String(h || "").trim()) : [];
    const rows = Array.isArray(t?.rows) ? t.rows : [];
    for (const row of rows) {
      if (!Array.isArray(row)) continue;
      for (let i = 0; i < row.length; i += 1) {
        const value = String(row[i] || "").replace(/\s+/g, " ").trim();
        if (!value) continue;
        const header = String(headers[i] || "").replace(/\s+/g, " ").trim();
        const line = header && !/^col_\d+$/i.test(header) ? `${header}: ${value}` : value;
        const normalized = args.normalizeText(line);
        if (!normalized || normalized === "especificaciones" || normalized === "specifications") continue;
        out.push(line);
        if (out.length >= maxLines) return args.uniqueNormalizedStrings(out, maxLines);
      }
    }
  }
  return args.uniqueNormalizedStrings(out, maxLines);
}

export function buildTechnicalSummary(args: {
  row: any;
  maxLines?: number;
  normalizeText: (v: string) => string;
  uniqueNormalizedStrings: (values: string[], max?: number) => string[];
}): string {
  const maxLines = Number(args.maxLines || 4);
  const specsText = String(args.row?.specs_text || "").replace(/\s+/g, " ").trim();
  const summaryText = String(args.row?.summary || "").replace(/\s+/g, " ").trim();
  const descriptionText = String(args.row?.description || "").replace(/\s+/g, " ").trim();
  const primary = [specsText, summaryText, descriptionText].filter(Boolean).join("; ");
  let lines = primary
    .split(/[.;]\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/^[-•\u2022]+\s*/, "").trim())
    .filter((s) => {
      const n = args.normalizeText(s);
      return Boolean(n) && n !== "especificaciones" && n !== "specifications" && n.length > 8;
    });

  lines = args.uniqueNormalizedStrings(lines, Math.max(maxLines, 60));
  if (!lines.length) {
    lines = extractSpecsFromJson({ specsJson: args.row?.specs_json, maxLines: Math.max(maxLines, 60), normalizeText: args.normalizeText, uniqueNormalizedStrings: args.uniqueNormalizedStrings });
  }
  if (!lines.length) return "";
  return lines.slice(0, maxLines).map((l) => `- ${l}`).join("\n");
}

export function buildQuoteItemDescription(args: {
  row: any;
  fallbackName: string;
  normalizeText: (v: string) => string;
  uniqueNormalizedStrings: (values: string[], max?: number) => string[];
}): string {
  const source = args.row?.source_payload && typeof args.row.source_payload === "object" ? args.row.source_payload : {};
  const specs = args.row?.specs_json && typeof args.row.specs_json === "object" ? args.row.specs_json : {};
  const brand = String(args.row?.brand || "OHAUS").trim() || "OHAUS";
  const family = String((source as any)?.family || (specs as any)?.familia || "").trim();
  const templateDescription = String((source as any)?.descripcion_comercial_larga || (source as any)?.quote_description || args.row?.description || "").trim();
  if (templateDescription) {
    const normalizedLines = args.uniqueNormalizedStrings(templateDescription.split(/\r?\n+|;\s*/).map((l) => String(l || "").trim()).filter(Boolean), 56);
    if (normalizedLines.length >= 3) return normalizedLines.join("\n");
  }
  const sap = String((source as any)?.sap || (source as any)?.product_code || (source as any)?.codigo || "").trim();
  const capacity = String((source as any)?.capacity || (specs as any)?.capacidad || "").trim();
  const resolution = String((source as any)?.resolution || (specs as any)?.resolucion || "").trim();
  const lines: string[] = [];
  lines.push(family ? `${family} marca ${brand}` : `Producto marca ${brand}`);
  if (sap) lines.push(`SAP: ${sap}`);
  if (capacity) lines.push(`Capacidad maxima: ${capacity}`);
  if (resolution) lines.push(`Lectura minima: ${resolution}`);

  const summary = buildTechnicalSummary({ row: args.row, maxLines: 48, normalizeText: args.normalizeText, uniqueNormalizedStrings: args.uniqueNormalizedStrings })
    .split("\n")
    .map((l) => String(l || "").replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);

  for (const s of summary) {
    const normalized = args.normalizeText(s);
    if (!normalized) continue;
    if (lines.some((x) => args.normalizeText(x) === normalized)) continue;
    lines.push(s);
    if (lines.length >= 56) break;
  }

  if (!lines.length) lines.push(`Producto: ${String(args.fallbackName || args.row?.name || "-")}`);
  return lines.join("\n");
}

export function detectTechResendIntent(text: string, normalizeText: (v: string) => string): "sheet" | "image" | "both" | null {
  const t = normalizeText(text || "");
  if (!t) return null;
  const asksResend = /(reenviar|reenvia|reenvie|reenvio|volver a enviar|otra vez|de nuevo|manda de nuevo)/.test(t);
  const asksSheet = /(ficha|datasheet|hoja tecnica|documento tecnico|especificaciones)/.test(t);
  const asksImage = /(imagen|foto)/.test(t);
  if (!asksResend) return null;
  if (asksSheet && asksImage) return "both";
  if (asksImage) return "image";
  return "sheet";
}

export function isContextResetIntent(text: string, normalizeText: (v: string) => string): boolean {
  const t = normalizeText(text || "");
  if (!t) return false;
  return /(reinicia(?:r)?\s+contexto|reset(?:ear)?\s+contexto|reset\s+context|limpiar\s+contexto|borrar\s+contexto|olvida\s+contexto|olvida\s+todo|empecemos\s+de\s+nuevo|empezar\s+de\s+nuevo)/.test(t);
}
