import fs from "node:fs";
import path from "node:path";

export type LocalPdfIndexEntry = { filePath: string; fileName: string; normalized: string };

export function safeFileName(input: string, fallbackBase: string, fallbackExt: string): string {
  const raw = String(input || "").trim();
  const clean = raw
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 80)
    .replace(/^-+|-+$/g, "");
  const base = clean || fallbackBase;
  return /\.[a-z0-9]{2,8}$/i.test(base) ? base : `${base}.${fallbackExt}`;
}

export function createLocalPdfIndexResolver(args: {
  directory: string;
  normalizeCatalogQueryText: (text: string) => string;
}): () => LocalPdfIndexEntry[] {
  let localPdfIndexCache: { dir: string; at: number; files: LocalPdfIndexEntry[] } | null = null;

  function listLocalPdfFiles(dir: string): LocalPdfIndexEntry[] {
    const root = String(dir || "").trim();
    if (!root || !fs.existsSync(root)) return [];
    const out: LocalPdfIndexEntry[] = [];
    const stack = [root];
    while (stack.length) {
      const cur = String(stack.pop() || "");
      if (!cur) continue;
      let entries: fs.Dirent[] = [];
      try {
        entries = fs.readdirSync(cur, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const e of entries) {
        const abs = path.join(cur, e.name);
        if (e.isDirectory()) {
          stack.push(abs);
          continue;
        }
        if (!e.isFile() || !/\.pdf$/i.test(e.name)) continue;
        out.push({ filePath: abs, fileName: e.name, normalized: args.normalizeCatalogQueryText(e.name) });
      }
    }
    return out;
  }

  return function getLocalPdfIndex(): LocalPdfIndexEntry[] {
    const ttlMs = 5 * 60 * 1000;
    const now = Date.now();
    const dir = String(args.directory || "").trim();
    if (localPdfIndexCache && localPdfIndexCache.dir === dir && now - localPdfIndexCache.at < ttlMs) {
      return localPdfIndexCache.files;
    }
    const files = listLocalPdfFiles(dir);
    localPdfIndexCache = { dir, at: now, files };
    return files;
  };
}

export function expandModelAliasTokens(args: {
  tokens: string[];
  uniqueNormalizedStrings: (values: string[]) => string[];
  normalizeCatalogQueryText: (text: string) => string;
}): string[] {
  const base = args.uniqueNormalizedStrings(
    (args.tokens || [])
      .map((t) => args.normalizeCatalogQueryText(String(t || "")).replace(/[^a-z0-9]/g, ""))
      .filter((t) => t.length >= 4)
  );
  const extra = new Set<string>(base);
  for (const token of base) {
    if (token.startsWith("rc31p")) extra.add(`r31p${token.slice(5)}`);
    if (token.startsWith("r31p")) extra.add(`rc31p${token.slice(4)}`);
  }
  return Array.from(extra);
}

export function pickBestLocalPdfPath(args: {
  row: any;
  queryText: string;
  getLocalPdfIndex: () => LocalPdfIndexEntry[];
  normalizeCatalogQueryText: (text: string) => string;
  uniqueNormalizedStrings: (values: string[]) => string[];
  extractModelLikeTokens: (text: string) => string[];
  extractCatalogTerms: (text: string) => string[];
}): string {
  const files = args.getLocalPdfIndex();
  if (!files.length) return "";
  const modelNorm = args.normalizeCatalogQueryText(String(args.row?.name || args.queryText || ""));

  const pickByKeywordPriority = (keywords: string[]): string => {
    const wanted = (keywords || []).map((k) => args.normalizeCatalogQueryText(String(k || ""))).filter(Boolean);
    if (!wanted.length) return "";
    let best: { filePath: string; score: number; byteSize: number } | null = null;
    for (const f of files) {
      const hay = args.normalizeCatalogQueryText(f.normalized || f.fileName || "");
      let score = 0;
      for (const kw of wanted) {
        if (hay.includes(kw)) score += 3;
      }
      let byteSize = Number.MAX_SAFE_INTEGER;
      try {
        byteSize = Number(fs.statSync(f.filePath).size || 0);
      } catch {
        byteSize = Number.MAX_SAFE_INTEGER;
      }
      if (byteSize > 5 * 1024 * 1024) score -= 4;
      if (byteSize > 8 * 1024 * 1024) score -= 12;
      if (/datasheet|data sheet|ficha/.test(hay)) score += 2;
      if (/manual|brochure|catalogo|catalog/.test(hay)) score -= 2;
      if (!best || score > best.score || (score === best.score && byteSize < best.byteSize)) {
        best = { filePath: f.filePath, score, byteSize };
      }
    }
    return best && best.score >= 3 ? best.filePath : "";
  };

  const canonical = (v: string) => args.normalizeCatalogQueryText(String(v || "")).replace(/[^a-z0-9]/g, "");
  const strictModelTokens = args.uniqueNormalizedStrings([
    ...args.extractModelLikeTokens(String(args.row?.name || "")),
    ...args.extractModelLikeTokens(String(args.queryText || "")),
    String(args.row?.name || ""),
  ]).map((t) => canonical(t));
  const strictModelAliasTokens = expandModelAliasTokens({
    tokens: strictModelTokens,
    uniqueNormalizedStrings: args.uniqueNormalizedStrings,
    normalizeCatalogQueryText: args.normalizeCatalogQueryText,
  });
  if (strictModelAliasTokens.length) {
    let strictBest: { filePath: string; score: number } | null = null;
    for (const f of files) {
      const hay = args.normalizeCatalogQueryText(f.normalized || f.fileName || "");
      const hayCanon = canonical(hay);
      let score = 0;
      for (const token of strictModelAliasTokens) {
        if (hayCanon.includes(token)) score += 20;
      }
      if (/ficha|datasheet|data sheet/.test(hay)) score += 3;
      if (score > 0 && (!strictBest || score > strictBest.score)) strictBest = { filePath: f.filePath, score };
    }
    if (strictBest) return strictBest.filePath;
  }

  const directByModelFamily = (() => {
    if (/\b(ax|ad)\d{2,6}/.test(modelNorm) || /adventurer/.test(modelNorm)) return pickByKeywordPriority(["adventurer", "ax", "data sheet"]);
    if (/\b(exr|exp|ex)\d{2,6}/.test(modelNorm) || /explorer|semi/.test(modelNorm)) return pickByKeywordPriority(["explorer", "semi", "data sheet"]);
    if (/\b(px|pr)\d{2,6}/.test(modelNorm) || /pioneer/.test(modelNorm)) return pickByKeywordPriority(["pioneer", "px", "pr", "datasheet"]);
    if (/\bmb\d{2,5}\b/.test(modelNorm) || /analizador_humedad|humedad/.test(modelNorm)) return pickByKeywordPriority([modelNorm, "mb", "datasheet"]);
    if (/\b(r31|r71|rc31)\w*/.test(modelNorm) || /ranger/.test(modelNorm)) return pickByKeywordPriority(["ranger", "data", "sheet"]);
    if (/\b(sjx|spx|stx)\w*/.test(modelNorm) || /scout/.test(modelNorm)) return pickByKeywordPriority(["scout", "datasheet"]);
    return "";
  })();
  if (directByModelFamily) return directByModelFamily;

  const source = args.row?.source_payload && typeof args.row.source_payload === "object" ? args.row.source_payload : {};
  const familyHints = args.uniqueNormalizedStrings([
    String(source?.family || ""),
    String(source?.instrument || ""),
    String(args.row?.category || ""),
    /\bexp\d|explorer|exr\d|ex\d/.test(args.normalizeCatalogQueryText(String(args.row?.name || ""))) ? "explorer" : "",
    /\bpr\d|px\d|pioneer/.test(args.normalizeCatalogQueryText(String(args.row?.name || ""))) ? "pioneer" : "",
    /\bad\d|ax\d|adventurer/.test(args.normalizeCatalogQueryText(String(args.row?.name || ""))) ? "adventurer" : "",
    /\bmb\d|humedad/.test(args.normalizeCatalogQueryText(String(args.row?.name || ""))) ? "mb" : "",
    /\bdefender|ranger|valor\b/.test(args.normalizeCatalogQueryText(String(args.row?.name || ""))) ? "basculas" : "",
  ].filter(Boolean));
  const codeTokens = [String(source?.product_code || "").trim(), String(source?.sap || "").trim(), String(source?.numero_modelo || "").trim()].filter(Boolean);
  const modelTokens = args.uniqueNormalizedStrings([
    ...args.extractModelLikeTokens(String(args.row?.name || "")),
    ...args.extractModelLikeTokens(String(args.queryText || "")),
    ...codeTokens.map((x) => args.normalizeCatalogQueryText(x)),
  ]).filter((x) => x.length >= 3);
  const modelAliasTokens = expandModelAliasTokens({
    tokens: modelTokens,
    uniqueNormalizedStrings: args.uniqueNormalizedStrings,
    normalizeCatalogQueryText: args.normalizeCatalogQueryText,
  });
  const textTerms = args.uniqueNormalizedStrings([
    ...args.extractCatalogTerms(`${String(args.row?.name || "")} ${String(args.queryText || "")}`).slice(0, 12),
    ...familyHints,
  ]).slice(0, 16);

  let best: { filePath: string; score: number; modelHits: number; termHits: number } | null = null;
  for (const f of files) {
    const hay = f.normalized;
    let score = 0;
    let modelHits = 0;
    let termHits = 0;
    for (const token of modelAliasTokens) {
      if (hay.includes(args.normalizeCatalogQueryText(token))) {
        score += 12;
        modelHits += 1;
      }
    }
    for (const term of textTerms) {
      if (hay.includes(args.normalizeCatalogQueryText(term))) {
        score += 2;
        termHits += 1;
      }
    }
    if (/datasheet|data sheet|ficha/.test(hay)) score += 2;
    if (/manual|brochure|catalogo|catalog/.test(hay)) score -= 2;
    if (!best || score > best.score) best = { filePath: f.filePath, score, modelHits, termHits };
  }

  if (!best) return "";
  const hasStrongFamilyHint = familyHints.some((h) => /explorer|pioneer|adventurer|mb|basculas|electroquimica/.test(args.normalizeCatalogQueryText(h)));
  const familyFallback = (() => {
    if (/\bmb\d{2,5}\b/.test(modelNorm) || /analizador_humedad|humedad/.test(modelNorm)) return pickByKeywordPriority([modelNorm, "mb120", "mb92", "mb62", "datasheet"]);
    if (/\b(ax|ad)\d{2,6}/.test(modelNorm) || /adventurer/.test(modelNorm)) return pickByKeywordPriority(["adventurer", "ax", "datasheet"]);
    if (/\b(px|pr)\d{2,6}/.test(modelNorm) || /pioneer/.test(modelNorm)) return pickByKeywordPriority(["pioneer", "px", "pr", "datasheet"]);
    if (/\b(exr|exp|ex)\d{2,6}/.test(modelNorm) || /explorer|semi/.test(modelNorm)) return pickByKeywordPriority(["explorer", "semi micro", "datasheet"]);
    if (/\b(r31|r71|rc31)\w*/.test(modelNorm) || /ranger/.test(modelNorm)) return pickByKeywordPriority(["ranger", "ranger 3000", "ranger 4000", "ranger 7000", "datasheet"]);
    if (/\b(sjx|spx|stx)\w*/.test(modelNorm) || /scout/.test(modelNorm)) return pickByKeywordPriority(["scout", "datasheet"]);
    return "";
  })();
  if (modelAliasTokens.length && best.modelHits === 0) {
    if (hasStrongFamilyHint && best.termHits >= 1 && best.score >= 4) return best.filePath;
    if (!(best.termHits >= 2 && best.score >= 8)) return familyFallback;
  }
  return best.filePath || familyFallback;
}

export function fetchLocalFileAsBase64(filePath: string): { base64: string; mimetype: string; fileName: string; byteSize: number } | null {
  const abs = String(filePath || "").trim();
  if (!abs || !fs.existsSync(abs)) return null;
  try {
    const buff = fs.readFileSync(abs);
    const byteSize = Number(buff.byteLength || 0);
    if (!byteSize) return null;
    return {
      base64: buff.toString("base64"),
      mimetype: "application/pdf",
      fileName: safeFileName(path.basename(abs), "ficha-tecnica", "pdf"),
      byteSize,
    };
  } catch {
    return null;
  }
}

export async function fetchRemoteFileAsBase64(url: string): Promise<{ base64: string; mimetype: string; fileName: string; byteSize: number } | null> {
  const target = String(url || "").trim();
  if (!/^https?:\/\//i.test(target)) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(target, {
      method: "GET",
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "BotzWhatsApp/1.0" },
    });
    if (!res.ok) return null;

    const arr = await res.arrayBuffer();
    const base64 = Buffer.from(arr).toString("base64");
    if (!base64) return null;
    const byteSize = Number(arr.byteLength || 0);

    const contentType = String(res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    const mimetype = contentType || "application/octet-stream";

    let pathname = "archivo";
    try {
      pathname = decodeURIComponent(new URL(target).pathname.split("/").pop() || "archivo");
    } catch {
      pathname = "archivo";
    }

    const ext = mimetype === "application/pdf"
      ? "pdf"
      : mimetype.includes("png")
        ? "png"
        : mimetype.includes("jpeg") || mimetype.includes("jpg")
          ? "jpg"
          : mimetype.includes("webp")
            ? "webp"
            : "bin";

    return {
      base64,
      mimetype,
      fileName: safeFileName(pathname, "archivo", ext),
      byteSize,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
