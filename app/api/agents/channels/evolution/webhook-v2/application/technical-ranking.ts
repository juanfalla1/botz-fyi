import { extractDimensionTripletMm, toGrams } from "./technical-spec";

function normalizeText(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function uniqueNormalizedStrings(values: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of Array.isArray(values) ? values : []) {
    const t = String(v || "").trim();
    if (!t) continue;
    const k = normalizeText(t);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

export function extractRowDimensionsMm(row: any): number[] | null {
  const payload = row?.source_payload && typeof row.source_payload === "object" ? row.source_payload : {};
  const fromPayload = uniqueNormalizedStrings([
    String((payload as any)?.dimensions || ""),
    String((payload as any)?.dimensiones || ""),
    String((payload as any)?.size || ""),
    String((payload as any)?.tamano || ""),
    String((payload as any)?.tamaño || ""),
  ]);
  for (const candidate of fromPayload) {
    const dims = extractDimensionTripletMm(candidate);
    if (dims) return dims;
  }
  const hay = [
    String(row?.description || ""),
    String(row?.summary || ""),
    String(row?.specs_text || ""),
    String((payload as any)?.description || ""),
    String((payload as any)?.resumen || ""),
  ].filter(Boolean).join(" \n ");
  return extractDimensionTripletMm(hay);
}

export function rankCatalogByDimensions(rows: any[], dimsMm: number[]): Array<{ row: any; score: number }> {
  const target = (Array.isArray(dimsMm) ? dimsMm : [])
    .map((n) => Number(n || 0))
    .filter((n) => n > 0)
    .sort((a, b) => a - b);
  if (target.length !== 3) return [];

  const ranked: Array<{ row: any; score: number }> = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    const rowDims = (extractRowDimensionsMm(row) || [])
      .map((n) => Number(n || 0))
      .filter((n) => n > 0)
      .sort((a, b) => a - b);
    if (rowDims.length !== 3) continue;
    const deltas = rowDims.map((v, i) => Math.abs(v - target[i]));
    const toleranceOk = deltas.every((d, i) => d <= Math.max(5, target[i] * 0.08));
    const score = deltas.reduce((acc, n) => acc + n, 0) + (toleranceOk ? 0 : 2000);
    ranked.push({ row, score });
  }
  return ranked.sort((a, b) => a.score - b.score);
}

export function extractRowTechnicalSpec(args: {
  row: any;
  normalizeCatalogQueryText: (text: string) => string;
}): { capacityG: number; readabilityG: number } {
  const { row, normalizeCatalogQueryText } = args;
  const specsText = String(row?.specs_text || "");
  const specsJsonText = row?.specs_json ? JSON.stringify(row.specs_json) : "";
  const payload = row?.source_payload && typeof row.source_payload === "object" ? row.source_payload : {};
  const payloadSpecText = [
    (payload as any)?.capacity,
    (payload as any)?.capacidad,
    (payload as any)?.capacity_g,
    (payload as any)?.capacidad_g,
    (payload as any)?.max,
    (payload as any)?.max_g,
    (payload as any)?.resolution,
    (payload as any)?.resolucion,
    (payload as any)?.resolution_g,
    (payload as any)?.resolucion_g,
    (payload as any)?.readability,
    (payload as any)?.readability_g,
    (payload as any)?.precision,
    (payload as any)?.precision_g,
    (payload as any)?.family,
    (payload as any)?.quote_model,
  ]
    .map((v) => String(v ?? "").trim())
    .filter(Boolean)
    .join(" ");
  const hay = normalizeCatalogQueryText(`${specsText} ${specsJsonText} ${payloadSpecText}`);
  const cap =
    hay.match(/(?:capacidad|max(?:ima)?|maximum|max\.|weighing\s*capacity|peso\s*max(?:imo)?)[^0-9]{0,24}(\d+(?:[\.,]\d+)?)\s*(mg|g|kg)/) ||
    hay.match(/(\d+(?:[\.,]\d+)?)\s*(mg|g|kg)\s*(?:x|por|\*)\s*\d+(?:[\.,]\d+)?\s*(mg|g|kg)/);
  const read =
    hay.match(/(?:resolucion|lectura\s*minima|readability|division|d=|incremento)[^0-9]{0,24}(\d+(?:[\.,]\d+)?)\s*(mg|g|kg)/) ||
    hay.match(/\d+(?:[\.,]\d+)?\s*(mg|g|kg)\s*(?:x|por|\*)\s*(\d+(?:[\.,]\d+)?)\s*(mg|g|kg)/);

  if (cap && read) {
    const capVal = cap[1] ? toGrams(cap[1], cap[2] || "g") : toGrams(cap[1], cap[2] || "g");
    const readVal = read[2] && read[3] ? toGrams(read[2], read[3]) : toGrams(read[1], read[2] || "g");
    if (capVal > 0 && readVal > 0) return { capacityG: capVal, readabilityG: readVal };
  }

  const unitPairs = Array.from(hay.matchAll(/(\d+(?:[\.,]\d+)?)\s*(mg|g|kg)/g))
    .map((m: any) => toGrams(String(m?.[1] || ""), String(m?.[2] || "g")))
    .filter((n: number) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
  const fallbackRead = unitPairs.length ? unitPairs[0] : 0;
  const fallbackCap = unitPairs.length ? unitPairs[unitPairs.length - 1] : 0;

  return {
    capacityG: cap ? toGrams(cap[1], cap[2] || "g") : fallbackCap,
    readabilityG: read
      ? (read[2] && read[3] ? toGrams(read[2], read[3]) : toGrams(read[1], read[2] || "g"))
      : (fallbackRead > 0 && fallbackCap / Math.max(fallbackRead, 0.000000001) >= 10 ? fallbackRead : 0),
  };
}

export function filterRowsByCapacityRange(args: {
  rows: any[];
  range: { minG: number; maxG: number } | null;
  extractRowTechnicalSpec: (row: any) => { capacityG: number; readabilityG: number };
}): any[] {
  const rows = args.rows;
  const range = args.range;
  if (!range || !Array.isArray(rows) || !rows.length) return Array.isArray(rows) ? rows : [];
  const minG = Math.max(0, Number(range.minG || 0));
  const maxG = Number(range.maxG || 0);
  return rows.filter((row: any) => {
    const cap = Number(args.extractRowTechnicalSpec(row)?.capacityG || 0);
    if (!(cap > 0)) return false;
    if (minG > 0 && cap < minG) return false;
    if (Number.isFinite(maxG) && maxG > 0 && cap > maxG) return false;
    return true;
  });
}

export function rankCatalogByTechnicalSpec(args: {
  rows: any[];
  spec: { capacityG: number; readabilityG: number };
  extractRowTechnicalSpec: (row: any) => { capacityG: number; readabilityG: number };
}): Array<{ row: any; capacityDeltaPct: number; readabilityRatio: number; score: number }> {
  const targetCap = Math.max(0.000001, Number(args.spec?.capacityG || 0));
  const targetRead = Math.max(0.000000001, Number(args.spec?.readabilityG || 0));
  if (!(targetCap > 0) || !(targetRead > 0)) return [];
  return (args.rows || [])
    .map((row: any) => {
      const rs = args.extractRowTechnicalSpec(row);
      if (!(rs.capacityG > 0) || !(rs.readabilityG > 0)) return null;
      const capacityDeltaPct = Math.abs(rs.capacityG - targetCap) / targetCap * 100;
      const readabilityRatio = rs.readabilityG / targetRead;
      const readPenalty = readabilityRatio <= 1 ? readabilityRatio * 0.2 : readabilityRatio;
      const score = capacityDeltaPct + readPenalty * 100;
      return { row, capacityDeltaPct, readabilityRatio, score };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a.score - b.score) as any;
}

export function rankCatalogByCapacityOnly(args: {
  rows: any[];
  capacityG: number;
  extractRowTechnicalSpec: (row: any) => { capacityG: number; readabilityG: number };
}): Array<{ row: any; capacityDeltaPct: number; score: number }> {
  const targetCap = Math.max(0.000001, Number(args.capacityG || 0));
  if (!(targetCap > 0)) return [];
  return (args.rows || [])
    .map((row: any) => {
      const rs = args.extractRowTechnicalSpec(row);
      if (!(rs.capacityG > 0)) return null;
      const capacityDeltaPct = Math.abs(rs.capacityG - targetCap) / targetCap * 100;
      const score = capacityDeltaPct + (rs.readabilityG > 0 ? 0 : 15);
      return { row, capacityDeltaPct, score };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a.score - b.score) as any;
}

export function rankCatalogByReadabilityOnly(args: {
  rows: any[];
  readabilityG: number;
  extractRowTechnicalSpec: (row: any) => { capacityG: number; readabilityG: number };
}): Array<{ row: any; readabilityRatio: number; score: number }> {
  const targetRead = Math.max(0.000000001, Number(args.readabilityG || 0));
  if (!(targetRead > 0)) return [];
  return (args.rows || [])
    .map((row: any) => {
      const rs = args.extractRowTechnicalSpec(row);
      if (!(rs.readabilityG > 0)) return null;
      const readabilityRatio = rs.readabilityG / targetRead;
      const logDelta = Math.abs(Math.log10(Math.max(readabilityRatio, 0.000000001)));
      const worsePenalty = readabilityRatio > 1 ? readabilityRatio * 2 : 0;
      const score = logDelta * 100 + worsePenalty;
      return { row, readabilityRatio, score };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a.score - b.score) as any;
}

export function prioritizeTechnicalRows(args: {
  rows: any[];
  spec: { capacityG: number; readabilityG: number };
  rankCatalogByTechnicalSpec: (rows: any[], spec: { capacityG: number; readabilityG: number }) => Array<{ row: any; capacityDeltaPct: number; readabilityRatio: number; score: number }>;
}): { orderedRows: any[]; exactCount: number } {
  const ranked = args.rankCatalogByTechnicalSpec(args.rows, args.spec);
  if (!ranked.length) return { orderedRows: [], exactCount: 0 };

  const reasonable = ranked.filter((x: any) => {
    const capOk = x.capacityDeltaPct <= 280;
    const readOk = x.readabilityRatio >= 0.5 && x.readabilityRatio <= 2.5;
    return capOk && readOk;
  });
  const pool = reasonable.length ? reasonable : ranked;

  const exact = pool.filter((x: any) => x.capacityDeltaPct <= 8 && x.readabilityRatio >= 0.8 && x.readabilityRatio <= 1.25);
  const near = pool.filter((x: any) => !(x.capacityDeltaPct <= 8 && x.readabilityRatio >= 0.8 && x.readabilityRatio <= 1.25));
  const out: any[] = [];
  const seen = new Set<string>();

  for (const x of [...exact, ...near]) {
    const id = String(x?.row?.id || "").trim() || normalizeText(String(x?.row?.name || ""));
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(x.row);
  }
  return { orderedRows: out, exactCount: exact.length };
}

export function filterReasonableTechnicalRows(args: {
  rows: any[];
  spec: { capacityG: number; readabilityG: number };
  extractRowTechnicalSpec: (row: any) => { capacityG: number; readabilityG: number };
}): any[] {
  const targetCap = Number(args.spec.capacityG || 0);
  const targetRead = Number(args.spec.readabilityG || 0);
  if (!(targetCap > 0) || !(targetRead > 0)) return Array.isArray(args.rows) ? args.rows : [];
  const strictRead = targetRead <= 0.1;
  const maxCapDeltaPct = strictRead ? 80 : 180;
  const maxReadRatio = strictRead ? 3 : 8;
  return (Array.isArray(args.rows) ? args.rows : []).filter((row: any) => {
    const rs = args.extractRowTechnicalSpec(row);
    const cap = Number(rs.capacityG || 0);
    const read = Number(rs.readabilityG || 0);
    if (!(cap > 0) || !(read > 0)) return false;
    const capDeltaPct = (Math.abs(cap - targetCap) / Math.max(1, targetCap)) * 100;
    const readRatio = Math.max(read, targetRead) / Math.max(1e-9, Math.min(read, targetRead));
    return capDeltaPct <= maxCapDeltaPct && readRatio <= maxReadRatio;
  });
}

export function filterNearbyTechnicalRows(args: {
  rows: any[];
  spec: { capacityG: number; readabilityG: number };
  extractRowTechnicalSpec: (row: any) => { capacityG: number; readabilityG: number };
}): any[] {
  const targetCap = Number(args.spec.capacityG || 0);
  const targetRead = Number(args.spec.readabilityG || 0);
  if (!(targetCap > 0) || !(targetRead > 0)) return Array.isArray(args.rows) ? args.rows : [];
  const maxCapDeltaPct = 1200;
  const maxReadRatio = 25;
  return (Array.isArray(args.rows) ? args.rows : []).filter((row: any) => {
    const rs = args.extractRowTechnicalSpec(row);
    const cap = Number(rs.capacityG || 0);
    const read = Number(rs.readabilityG || 0);
    if (!(cap > 0) || !(read > 0)) return false;
    const capDeltaPct = (Math.abs(cap - targetCap) / Math.max(1, targetCap)) * 100;
    const readRatio = Math.max(read, targetRead) / Math.max(1e-9, Math.min(read, targetRead));
    return capDeltaPct <= maxCapDeltaPct && readRatio <= maxReadRatio;
  });
}

export function applyApplicationProfile(args: {
  rows: any[];
  profile: { application?: string; targetCapacityG?: number; targetReadabilityG?: number; allowFallback?: boolean };
  extractRowTechnicalSpec: (row: any) => { capacityG: number; readabilityG: number };
  familyLabelFromRow: (row: any) => string;
}): any[] {
  const list = Array.isArray(args.rows) ? args.rows : [];
  const app = normalizeText(String(args.profile.application || ""));
  const targetCap = Number(args.profile.targetCapacityG || 0);
  const targetRead = Number(args.profile.targetReadabilityG || 0);
  const allowFallback = args.profile.allowFallback !== false;
  if (!app && !(targetCap > 0) && !(targetRead > 0)) return list;

  const out = list.filter((row: any) => {
    const spec = args.extractRowTechnicalSpec(row);
    const cap = Number(spec.capacityG || 0);
    const read = Number(spec.readabilityG || 0);
    const txt = normalizeText(`${String(row?.name || "")} ${String(row?.category || "")} ${args.familyLabelFromRow(row)}`);
    if (!(cap > 0) || !(read > 0)) return false;
    if (targetCap > 0) {
      const minCap = targetCap * 0.2;
      const maxCap = targetCap * 5;
      if (cap < minCap || cap > maxCap) return false;
    }
    if (targetRead > 0 && read > targetRead * 2) return false;

    if (app === "joyeria_oro") {
      if (read > 0.01) return false;
      if (cap > 6000) return false;
      if (/(industrial|plataforma|ranger|defender|valor|rc31|r71|ckw|td52p)/.test(txt)) return false;
    }
    if (app === "laboratorio") {
      if (read > 0.1) return false;
      if (/(industrial|plataforma|ranger|defender|valor|rc31|r71|ckw|td52p)/.test(txt)) return false;
    }
    return true;
  });

  if (out.length) return out;
  return allowFallback ? list : [];
}
