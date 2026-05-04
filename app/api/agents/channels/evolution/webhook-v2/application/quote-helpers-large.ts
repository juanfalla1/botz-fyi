import fs from "node:fs";
import path from "node:path";

const QUOTE_BANNER_IMAGE_URL = String(process.env.WHATSAPP_QUOTE_BANNER_IMAGE_URL || "").trim();
const LOCAL_QUOTE_BANNER_PATH = String(
  process.env.WHATSAPP_QUOTE_BANNER_LOCAL_PATH ||
  path.join(process.cwd(), "app", "api", "agents", "channels", "evolution", "webhook-v2", "header_banner_superior.png")
).trim();
const QUOTE_PERKS_IMAGE_URL = String(process.env.WHATSAPP_QUOTE_PERKS_IMAGE_URL || "").trim();
const LOCAL_QUOTE_PERKS_PATH = String(
  process.env.WHATSAPP_QUOTE_PERKS_LOCAL_PATH ||
  path.join(process.cwd(), "app", "api", "agents", "channels", "evolution", "webhook-v2", "strip_perks_3_iconos.png")
).trim();
const QUOTE_SOCIAL_IMAGE_URL = String(process.env.WHATSAPP_QUOTE_SOCIAL_IMAGE_URL || "").trim();
const LOCAL_QUOTE_SOCIAL_PATH = String(
  process.env.WHATSAPP_QUOTE_SOCIAL_LOCAL_PATH ||
  path.join(process.cwd(), "app", "api", "agents", "channels", "evolution", "webhook-v2", "strip_redes_fb_ig_in.png")
).trim();
const QUOTE_ASSET_CACHE_MS = Math.max(0, Number(process.env.WHATSAPP_QUOTE_ASSET_CACHE_MS || 300000));
let quoteBannerImageCache: { at: number; dataUrl: string } | null = null;
let quotePerksImageCache: { at: number; dataUrl: string } | null = null;
let quoteSocialImageCache: { at: number; dataUrl: string } | null = null;

export function formatMoney(n: number) {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(Number(n || 0));
}

export function rowCatalogCopPrice(row: any): number {
  const source = row?.source_payload && typeof row.source_payload === "object" ? row.source_payload : {};
  const prices = source?.prices_cop && typeof source.prices_cop === "object" ? source.prices_cop : {};
  const parse = (v: any) => {
    const n = Number(String(v ?? "").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  return parse((prices as any)?.bogota) || parse((prices as any)?.antioquia) || parse((prices as any)?.distribuidor) || 0;
}

export function buildPriceRangeLine(args: {
  rows: any[];
  normalizeText: (value: string) => string;
  getRowCapacityG: (row: any) => number;
  familyLabelFromRow: (row: any) => string;
}): string {
  const list = Array.isArray(args.rows) ? args.rows : [];
  const sample = [...list]
    .sort((a: any, b: any) => Number(args.getRowCapacityG(b) || 0) - Number(args.getRowCapacityG(a) || 0))
    .slice(0, Math.min(12, Math.max(3, list.length)));
  const industrialHits = sample.filter((r: any) => {
    const txt = args.normalizeText(`${String(r?.name || "")} ${String(r?.category || "")} ${args.familyLabelFromRow(r)}`);
    return /(industrial|plataforma|ranger|defender|valor|rc31|r31|r71|ckw|td52p)/.test(txt);
  }).length;
  const isIndustrialProfile = industrialHits > 0 && industrialHits >= Math.max(1, Math.floor(sample.length / 3));
  return isIndustrialProfile
    ? "💰 Valores estimados: desde $3.500.000 (según gama y funcionalidad). Deseas continuar con la cotizacion"
    : "💰 Valores estimados: desde $4.000.000 (según gama y funcionalidad). Deseas continuar con la cotizacion";
}

export function isLargestCapacityAsk(text: string, normalizeText: (value: string) => string): boolean {
  const t = normalizeText(String(text || ""));
  if (!t) return false;
  return /(mas\s+grandes|m[aá]s\s+grandes|mayor\s+capacidad|mas\s+capacidad|m[aá]s\s+capacidad|de\s+mayor\s+capacidad|mas\s+peso|m[aá]s\s+peso)/.test(t);
}

export function buildLargestCapacitySuggestion(args: {
  rows: any[];
  buildNumberedProductOptions: (rows: any[], maxItems?: number) => any[];
  getRowCapacityG: (row: any) => number;
  normalizeText: (value: string) => string;
  familyLabelFromRow: (row: any) => string;
}): { options: any[]; reply: string } {
  const source = Array.isArray(args.rows) ? args.rows : [];
  const byCapacity = [...source]
    .filter((r: any) => Number(args.getRowCapacityG(r) || 0) > 0)
    .sort((a: any, b: any) => Number(args.getRowCapacityG(b) || 0) - Number(args.getRowCapacityG(a) || 0));
  const topRows = byCapacity.length ? byCapacity : source;
  const options = args.buildNumberedProductOptions(topRows.slice(0, 8) as any[], 8);
  const priceLine = buildPriceRangeLine({ rows: topRows as any[], normalizeText: args.normalizeText, getRowCapacityG: args.getRowCapacityG, familyLabelFromRow: args.familyLabelFromRow });
  const gamaLabelMap: Record<string, string> = {
    basica: "Línea básica (uso industrial estándar)",
    media: "Línea media (mayor precisión)",
    alta: "Línea alta (alta precisión industrial)",
    esencial: "Línea esencial: soluciones confiables para empresas en crecimiento",
    intermedia: "Línea intermedia: mayor desempeño y funciones para empresas en expansión",
    avanzada: "Línea avanzada: mayor rendimiento para empresas con alta demanda",
    premium: "Línea premium: soluciones de alto nivel para empresas de gran escala",
  };
  const order = ["basica", "media", "alta", "esencial", "intermedia", "avanzada", "premium"];
  const bucket = new Map<string, string[]>();
  for (const key of order) bucket.set(key, []);
  bucket.set("", []);
  for (const o of options.slice(0, 6)) {
    const m = String(o?.name || "").match(/\bGama:\s*([^|]+)/i);
    const key = args.normalizeText(String(m?.[1] || "")).replace(/[^a-z]/g, "");
    if (!bucket.has(key)) bucket.set(key, []);
    bucket.get(key)!.push(`${o.code}) ${o.name}`);
  }
  const groupedLines: string[] = [];
  for (const key of order) {
    const items = bucket.get(key) || [];
    if (!items.length) continue;
    groupedLines.push(gamaLabelMap[key] || `Línea ${key}`);
    groupedLines.push(...items);
    groupedLines.push("");
  }
  const others = bucket.get("") || [];
  if (others.length) groupedLines.push(...others, "");
  const reply = [
    "Claro. Estas son las balanzas de mayor capacidad que tengo activas en catálogo:",
    ...(priceLine ? [priceLine] : []),
    ...groupedLines,
    "Elige con letra/número (A/1), o escribe 'más'.",
  ].join("\n");
  return { options, reply };
}

export function quoteCodeFromDraftId(draftId: string) {
  const raw = String(draftId || "");
  let h = 0;
  for (let i = 0; i < raw.length; i += 1) h = (h * 31 + raw.charCodeAt(i)) | 0;
  const n = Math.abs(h % 100000);
  return `CO${String(n).padStart(5, "0")}`;
}

export function asDateYmd(input: Date | string) {
  const d = input instanceof Date ? input : new Date(input);
  const ts = Number.isFinite(d.getTime()) ? d.getTime() : Date.now();
  return new Date(ts).toISOString().slice(0, 10);
}

export function absoluteImageFileToDataUrl(absolutePath: string): string {
  const p = String(absolutePath || "").trim();
  if (!p || !fs.existsSync(p)) return "";
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

export function imageDataUrlFromRemote(remote: { base64: string; mimetype: string } | null): string {
  if (!remote) return "";
  const mime = String(remote.mimetype || "").toLowerCase();
  if (!/^image\//.test(mime)) return "";
  const b64 = String(remote.base64 || "").trim();
  if (!b64) return "";
  return `data:${mime};base64,${b64}`;
}

export async function resolveQuoteBannerImageDataUrl(fetchRemoteFileAsBase64: (url: string) => Promise<{ base64: string; mimetype: string; fileName: string; byteSize: number } | null>): Promise<string> {
  const now = Date.now();
  if (quoteBannerImageCache && (now - quoteBannerImageCache.at) < QUOTE_ASSET_CACHE_MS) return quoteBannerImageCache.dataUrl;
  let dataUrl = "";
  const localPath = [
    String(LOCAL_QUOTE_BANNER_PATH || "").trim(),
    path.join(process.cwd(), "app", "api", "agents", "channels", "evolution", "webhook-v2", "banner_cotizacion_avanza_ohaus.png"),
  ].find((p) => p && fs.existsSync(p)) || "";
  if (localPath && fs.existsSync(localPath)) dataUrl = absoluteImageFileToDataUrl(localPath);
  if (!dataUrl && QUOTE_BANNER_IMAGE_URL) dataUrl = imageDataUrlFromRemote(await fetchRemoteFileAsBase64(QUOTE_BANNER_IMAGE_URL));
  quoteBannerImageCache = { at: now, dataUrl };
  return dataUrl;
}

export async function resolveQuotePerksImageDataUrl(fetchRemoteFileAsBase64: (url: string) => Promise<{ base64: string; mimetype: string; fileName: string; byteSize: number } | null>): Promise<string> {
  const now = Date.now();
  if (quotePerksImageCache && (now - quotePerksImageCache.at) < QUOTE_ASSET_CACHE_MS) return quotePerksImageCache.dataUrl;
  let dataUrl = "";
  const localPath = [
    String(LOCAL_QUOTE_PERKS_PATH || "").trim(),
    path.join(process.cwd(), "app", "api", "agents", "channels", "evolution", "webhook-v2", "ee3062f7-f286-4d62-b63b-29c796a8799f.png"),
  ].find((p) => p && fs.existsSync(p)) || "";
  if (localPath && fs.existsSync(localPath)) dataUrl = absoluteImageFileToDataUrl(localPath);
  if (!dataUrl && QUOTE_PERKS_IMAGE_URL) dataUrl = imageDataUrlFromRemote(await fetchRemoteFileAsBase64(QUOTE_PERKS_IMAGE_URL));
  quotePerksImageCache = { at: now, dataUrl };
  return dataUrl;
}

export async function resolveQuoteSocialImageDataUrl(fetchRemoteFileAsBase64: (url: string) => Promise<{ base64: string; mimetype: string; fileName: string; byteSize: number } | null>): Promise<string> {
  const now = Date.now();
  if (quoteSocialImageCache && (now - quoteSocialImageCache.at) < QUOTE_ASSET_CACHE_MS) return quoteSocialImageCache.dataUrl;
  let dataUrl = "";
  if (LOCAL_QUOTE_SOCIAL_PATH && fs.existsSync(LOCAL_QUOTE_SOCIAL_PATH)) dataUrl = absoluteImageFileToDataUrl(LOCAL_QUOTE_SOCIAL_PATH);
  if (!dataUrl && QUOTE_SOCIAL_IMAGE_URL) dataUrl = imageDataUrlFromRemote(await fetchRemoteFileAsBase64(QUOTE_SOCIAL_IMAGE_URL));
  quoteSocialImageCache = { at: now, dataUrl };
  return dataUrl;
}

export async function resolveProductImageDataUrl(args: {
  row: any;
  resolveModelSpecificLocalImageDataUrl: (row: any) => string;
  uniqueNormalizedStrings: (values: string[], max?: number) => string[];
  fetchRemoteFileAsBase64: (url: string) => Promise<{ base64: string; mimetype: string; fileName: string; byteSize: number } | null>;
  resolveStaticQuoteProfile: (row: any, fallbackName: string) => { imageFile: string } | null;
  localImageFileToDataUrl: (fileName: string) => string;
}): Promise<string> {
  const localModelSpecific = args.resolveModelSpecificLocalImageDataUrl(args.row);
  if (localModelSpecific) return localModelSpecific;
  const source = args.row?.source_payload && typeof args.row.source_payload === "object" ? args.row.source_payload : {};
  const candidates = args.uniqueNormalizedStrings([
    String(args.row?.image_url || "").trim(),
    String((source as any)?.image_url || "").trim(),
    String((source as any)?.image || "").trim(),
  ]).filter((u) => /^https?:\/\//i.test(u));
  for (const u of candidates) {
    const remote = await args.fetchRemoteFileAsBase64(u);
    const dataUrl = imageDataUrlFromRemote(remote);
    if (dataUrl) return dataUrl;
  }
  const staticProfile = args.resolveStaticQuoteProfile(args.row, String(args.row?.name || ""));
  if (staticProfile?.imageFile) {
    const local = args.localImageFileToDataUrl(staticProfile.imageFile);
    if (local) return local;
  }
  return "";
}
