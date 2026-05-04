import fs from "node:fs";
import path from "node:path";

type StaticQuoteProfile = { description: string; imageFile: string };

let pdfParseModuleCache: any = null;
const localQuotePdfTextCache = new Map<string, { at: number; lines: string[] }>();

export function resolveStaticQuoteProfile(args: {
  row: any;
  fallbackName: string;
  normalizeText: (value: string) => string;
}): StaticQuoteProfile | null {
  const model = args.normalizeText(String(args.row?.name || args.fallbackName || ""));
  if (!model) return null;

  if (/^px\d+/.test(model)) {
    return {
      imageFile: "px.png",
      description: [
        "Balanza semi micro marca Ohaus",
        "SAP: 30475733",
        "Capacidad maxima: 82 g",
        "Lectura minima: 0,01 mg",
        "Tamano del plato: 80 mm",
        "Calibracion interna AutoCal: Automatica",
        "Proteccion contra corrientes de aire: Incluido",
        "Comunicacion: USB; RS232",
        "Pantalla: LCD de 2 lineas con luz de fondo",
        "Linealidad: 0,0001 g",
        "Material del plato: Acero inoxidable",
        "Alimentacion: Adaptador de CA (incluido)",
        "Repetibilidad, tipica: 0,02 mg",
        "Tiempo de estabilizacion: 10 s",
        "Rango de tara: Capacidad total por sustraccion",
        "Unidades de medida: Tael de Singapur; Onza Troy; Pennyweight; Grano; Kilogramo; Tical; Personalizado; Miligramo; Momme; Newton; Tael de Taiwan; Gramo; Tael de Hong Kong; Libra; Tola; Mesghal; Quilates; Onza",
      ].join("\n"),
    };
  }

  if (/^ax\d+/.test(model) || /^ad\d+/.test(model)) {
    return {
      imageFile: "ax.png",
      description: [
        "Balanza Semi micro marca Ohaus",
        "SAP: 30852314",
        "Capacidad maxima: 82 g",
        "Lectura minima: 0,00001 g",
        "Tamano del plato: 80 mm",
        "Calibracion interna AutoCal: Automatica",
        "Proteccion contra corrientes de aire: Incluido",
        "Autorizada para comercio: No aplica",
        "Modelo de pantalla auxiliar: Disponible como accesorio",
        "Dimensiones: 354 mm x 340 mm x 230 mm (LxAxA)",
        "Puerta automatica: No aplica",
        "Entorno de trabajo: 10 C - 30 C, 80 % HR, sin condensacion",
        "Peso neto: 5,1 kg",
        "Funda de proteccion: Incluido",
        "Comunicacion: USB; RS232",
        "Host USB: Incluido",
        "Alimentacion: Adaptador de CA (incluido)",
        "Unidades de medida: Tael de Singapur; Onza Troy; Pennyweight; Grano; Tical; Personalizado; Miligramo; Momme; Newton; Baht; Tael de Taiwan; Gramo; Tael de Hong Kong; Libra; Tola; Mesghal; Quilates; Onza",
        "Pantalla: Pantalla tactil a color WQVGA de 4.3\"",
        "Material del plato: Acero inoxidable",
        "Ionizador incorporado: No",
        "Tiempo de estabilizacion: 8 s",
        "Repetibilidad, tipica: 0,00002 g",
        "Peso minimo (USP, 0.1%, tipico): 20 mg",
        "Linealidad: 0,1 mg",
      ].join("\n"),
    };
  }

  if (/^(exr|exp|ex)\d+/.test(model)) {
    return {
      imageFile: "exr.png",
      description: [
        "Balanza Semi - Micro marca Ohaus",
        "Capacidad maxima: 82 g/120 g",
        "Lectura minima: 0,00001 g",
        "Pantalla: tactil a color",
        "Comunicacion: USB; RS232",
        "Calibracion interna: Automatica",
        "Gestion de usuarios con perfiles y registro de eventos",
        "Aplicaciones: pesaje, conteo, chequeo, formulacion y densidad",
        "Rango de temperatura de funcionamiento: 10 C a 30 C",
        "Humedad relativa de trabajo: 15 % a 80 % sin condensacion",
        "Tiempo de estabilizacion: hasta 2 s segun modelo",
        "Plato de pesaje en acero inoxidable",
      ].join("\n"),
    };
  }

  if (/^mb\d+/.test(model)) {
    return {
      imageFile: "mb.png",
      description: [
        "Analizador de humedad Ohaus",
        "Pantalla tactil a color",
        "Halogeno de alto rendimiento",
        "Programas de secado rapidos y estables",
        "Interfaz USB y RS232",
      ].join("\n"),
    };
  }

  if (/^(r31|r71|rc31)/.test(model)) {
    return {
      imageFile: "ranger.png",
      description: [
        "Balanza industrial Ranger marca Ohaus",
        "Operacion para ambientes industriales",
        "Pantalla robusta y rapida",
        "Construccion durable para uso continuo",
      ].join("\n"),
    };
  }

  if (/^(sjx|spx|stx|px\d+)/.test(model)) {
    return {
      imageFile: "px.png",
      description: [
        "Balanza de precision marca OHAUS",
        "Operacion estable para laboratorio y control de calidad",
        "Pantalla de alta visibilidad y respuesta rapida",
        "Construccion robusta para uso diario",
      ].join("\n"),
    };
  }

  return null;
}

export function localImageFileToDataUrl(fileName: string, quoteLocalImageDir: string): string {
  const safe = String(fileName || "").trim();
  if (!safe) return "";
  const p = path.join(quoteLocalImageDir, safe);
  if (!fs.existsSync(p)) return "";
  const ext = String(path.extname(p || "")).toLowerCase();
  const mime = ext === ".png" ? "image/png" : (ext === ".jpg" || ext === ".jpeg") ? "image/jpeg" : ext === ".webp" ? "image/webp" : "";
  if (!mime) return "";
  try {
    const base64 = fs.readFileSync(p).toString("base64");
    return base64 ? `data:${mime};base64,${base64}` : "";
  } catch {
    return "";
  }
}

export function resolveModelSpecificLocalImageDataUrl(args: {
  row: any;
  normalizeCatalogQueryText: (value: string) => string;
  uniqueNormalizedStrings: (values: string[], max?: number) => string[];
  extractModelLikeTokens: (value: string) => string[];
  quoteLocalImageDir: string;
}): string {
  const source = args.row?.source_payload && typeof args.row.source_payload === "object" ? args.row.source_payload : {};
  const canonical = (v: string) => args.normalizeCatalogQueryText(String(v || "")).replace(/[^a-z0-9]/g, "");
  const modelHints = args.uniqueNormalizedStrings([
    String(args.row?.name || ""),
    String((source as any)?.quote_model || ""),
    String((source as any)?.numero_modelo || ""),
    ...args.extractModelLikeTokens(String(args.row?.name || "")),
  ])
    .map((x) => canonical(x))
    .filter((x) => x.length >= 5);
  if (!modelHints.length) return "";

  const exts = [".png", ".jpg", ".jpeg", ".webp"];
  for (const key of modelHints) {
    for (const ext of exts) {
      const local = localImageFileToDataUrl(`${key}${ext}`, args.quoteLocalImageDir);
      if (local) return local;
    }
  }
  return "";
}

async function getPdfParseModule(): Promise<any> {
  if (pdfParseModuleCache) return pdfParseModuleCache;
  const mod: any = await import("pdf-parse");
  pdfParseModuleCache = mod || {};
  return pdfParseModuleCache;
}

function cleanPdfSpecLines(raw: string, normalizeText: (value: string) => string): string[] {
  return String(raw || "")
    .split(/\r?\n+/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((l) => l.length >= 4)
    .filter((l) => !/^pag\s*\d+/i.test(l))
    .filter((l) => !/^fecha de /i.test(l))
    .filter((l) => !/^item\s+producto/i.test(l))
    .filter((l) => !/^contacto comercial$/i.test(l))
    .filter((l) => !/^subtotal|^descuento|^iva|^valor total/i.test(l))
    .filter((l) => !/^avanza internacional/i.test(l))
    .filter((l) => normalizeText(l).length >= 4);
}

async function extractPdfTechnicalLines(args: {
  row: any;
  enableRuntimePdfTextParseForQuote: boolean;
  pickBestLocalPdfPath: (row: any, queryText: string) => string;
  uniqueNormalizedStrings: (values: string[], max?: number) => string[];
  normalizeText: (value: string) => string;
}): Promise<string[]> {
  if (!args.enableRuntimePdfTextParseForQuote) return [];
  const localPath = args.pickBestLocalPdfPath(args.row, String(args.row?.name || ""));
  if (!localPath || !fs.existsSync(localPath)) return [];
  const cache = localQuotePdfTextCache.get(localPath);
  if (cache && (Date.now() - cache.at) < 6 * 60 * 60 * 1000) return cache.lines;
  try {
    const pdfMod = await getPdfParseModule();
    const PDFParse = (pdfMod as any)?.PDFParse || (pdfMod as any)?.default?.PDFParse;
    if (!PDFParse) return [];
    const buff = fs.readFileSync(localPath);
    const parser: any = new PDFParse({ data: buff });
    const parsed: any = await parser.getText();
    await parser.destroy?.();
    const lines = args.uniqueNormalizedStrings(cleanPdfSpecLines(String(parsed?.text || ""), args.normalizeText), 120);
    console.log("[evolution-webhook] quote_pdf_text_lines", { model: String(args.row?.name || ""), count: lines.length, localPath });
    localQuotePdfTextCache.set(localPath, { at: Date.now(), lines });
    return lines;
  } catch (err: any) {
    console.warn("[evolution-webhook] quote_pdf_text_parse_failed", { model: String(args.row?.name || ""), localPath, error: err?.message || String(err || "") });
    return [];
  }
}

export async function buildQuoteItemDescriptionAsync(args: {
  row: any;
  fallbackName: string;
  buildQuoteItemDescription: (row: any, fallbackName: string) => string;
  normalizeText: (value: string) => string;
  resolveStaticQuoteProfile: (row: any, fallbackName: string) => StaticQuoteProfile | null;
  enableRuntimePdfTextParseForQuote: boolean;
  pickBestLocalPdfPath: (row: any, queryText: string) => string;
  uniqueNormalizedStrings: (values: string[], max?: number) => string[];
}): Promise<string> {
  const staticProfile = args.resolveStaticQuoteProfile(args.row, args.fallbackName);

  const base = args.buildQuoteItemDescription(args.row, args.fallbackName)
    .split("\n")
    .map((l) => String(l || "").trim())
    .filter(Boolean);
  const pdfLines = await extractPdfTechnicalLines({
    row: args.row,
    enableRuntimePdfTextParseForQuote: args.enableRuntimePdfTextParseForQuote,
    pickBestLocalPdfPath: args.pickBestLocalPdfPath,
    uniqueNormalizedStrings: args.uniqueNormalizedStrings,
    normalizeText: args.normalizeText,
  });
  const merged: string[] = [];
  for (const line of [...base, ...pdfLines]) {
    const n = args.normalizeText(line);
    if (!n) continue;
    if (merged.some((x) => args.normalizeText(x) === n)) continue;
    merged.push(line);
    if (merged.length >= 34) break;
  }

  if (merged.length >= 8) return merged.join("\n");

  if (staticProfile?.description) {
    const enriched = [...merged];
    const staticLines = String(staticProfile.description || "")
      .split(/\r?\n/)
      .map((l) => String(l || "").trim())
      .filter(Boolean)
      .filter((l) => {
        const n = args.normalizeText(l);
        return !/(^sap:|capacidad maxima|lectura minima)/.test(n);
      });
    for (const line of staticLines) {
      const n = args.normalizeText(line);
      if (!n) continue;
      if (enriched.some((x) => args.normalizeText(x) === n)) continue;
      enriched.push(line);
      if (enriched.length >= 26) break;
    }
    if (enriched.length > merged.length && enriched.length >= 8) {
      console.log("[evolution-webhook] quote_description_static_enriched", { model: String(args.row?.name || args.fallbackName || "") });
      return enriched.join("\n");
    }
    console.log("[evolution-webhook] quote_description_static_fallback", { model: String(args.row?.name || args.fallbackName || "") });
    return staticProfile.description;
  }

  if (merged.length) return merged.join("\n");

  return args.buildQuoteItemDescription(args.row, args.fallbackName);
}
