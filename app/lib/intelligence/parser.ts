import * as XLSX from "xlsx";

const CANDIDATES: Record<string, string[]> = {
  revenue: ["ventas", "revenue", "ingreso", "valor ventas", "total venta", "balance", "valor"],
  quantity: ["cantidad", "qty", "units", "unidades", "cantidad ventas"],
  date: ["fecha", "date", "fecha factura", "invoice date", "mes"],
  customer: ["cliente", "customer", "razon social", "nombre"],
  product: ["producto", "sku", "referencia", "item", "descripcion"],
  category: ["categoria", "category", "linea", "familia", "segmento", "segm"],
  seller: ["vendedor", "asesor", "sales rep", "comercial"],
  city: ["ciudad", "sede", "region"],
  stock: ["stock", "inventario", "existencia"],
  year: ["año", "ano", "year"],
};

const canon = (s: string) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();

const monthMap: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};

function detectDelimiter(sample: string) {
  const candidates = [",", ";", "\t", "|"];
  let best = ",";
  let bestScore = -1;
  for (const d of candidates) {
    const score = sample.split(/\r?\n/).slice(0, 8).reduce((acc, line) => acc + line.split(d).length, 0);
    if (score > bestScore) {
      bestScore = score;
      best = d;
    }
  }
  return best;
}

function splitLine(line: string, d: string) {
  return line.split(d).map((v) => v.trim());
}

function inferHeaderRow(lines: string[], d: string) {
  let bestIdx = 0;
  let bestScore = -1;
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    const cols = splitLine(lines[i], d);
    const nonEmpty = cols.filter(Boolean).length;
    const alpha = cols.filter((c) => /[a-zA-Z]/.test(c)).length;
    const score = nonEmpty + alpha * 2;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function toNumber(v: unknown) {
  const n = Number(String(v ?? "").replace(/\./g, "").replace(/,/g, ".").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function parseDateLoose(v: unknown, yearHint?: number | null) {
  const raw = canon(String(v ?? ""));
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const m = monthMap[raw];
  if (m && yearHint && yearHint > 1990) return `${yearHint}-${String(m).padStart(2, "0")}-01`;
  const m2 = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (m2) {
    let y = Number(m2[3]);
    if (y < 100) y += 2000;
    return `${y}-${String(Number(m2[2])).padStart(2, "0")}-${String(Number(m2[1])).padStart(2, "0")}`;
  }
  const d = new Date(String(v));
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

export function detectSemanticMap(columns: string[]) {
  const map: Record<string, string | null> = {};
  for (const key of Object.keys(CANDIDATES)) {
    const found = columns.find((c) => CANDIDATES[key].some((k) => canon(c).includes(k)));
    map[key] = found || null;
  }
  return map;
}

export function parseUniversalFile(fileName: string, bytes: ArrayBuffer) {
  const lower = fileName.toLowerCase();
  let rows: Record<string, unknown>[] = [];
  let sheetNames: string[] = [];
  if (lower.endsWith(".csv") || lower.endsWith(".tsv")) {
    const text = Buffer.from(bytes).toString("utf8");
    const delim = lower.endsWith(".tsv") ? "\t" : detectDelimiter(text);
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    const hIdx = inferHeaderRow(lines, delim);
    const headers = splitLine(lines[hIdx] || "", delim).map((h, i) => h || `column_${i + 1}`);
    rows = lines.slice(hIdx + 1).map((line) => {
      const cols = splitLine(line, delim);
      const r: Record<string, unknown> = {};
      headers.forEach((h, i) => { r[h] = cols[i] ?? null; });
      return r;
    });
  } else {
    const wb = XLSX.read(bytes, { type: "array", cellDates: true });
    sheetNames = wb.SheetNames || [];
    const first = wb.Sheets[sheetNames[0]];
    rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(first, { defval: null });
  }
  const columns = Object.keys(rows[0] || {});
  const semanticMap = detectSemanticMap(columns);

  const facts = rows.map((r) => {
    const y = semanticMap.year ? toNumber(r[semanticMap.year]) : null;
    const dRaw = semanticMap.date ? r[semanticMap.date] : null;
    const date = parseDateLoose(dRaw, y);
    const revenue = semanticMap.revenue ? toNumber(r[semanticMap.revenue]) : null;
    const quantity = semanticMap.quantity ? toNumber(r[semanticMap.quantity]) : null;
    return {
      date,
      month: date ? String(date).slice(0, 7) : null,
      revenue: revenue ?? 0,
      quantity: quantity ?? 0,
      customer: semanticMap.customer ? String(r[semanticMap.customer] || "") : "",
      product: semanticMap.product ? String(r[semanticMap.product] || "") : "",
      category: semanticMap.category ? String(r[semanticMap.category] || "") : "",
      seller: semanticMap.seller ? String(r[semanticMap.seller] || "") : "",
      city: semanticMap.city ? String(r[semanticMap.city] || "") : "",
      stock: semanticMap.stock ? (toNumber(r[semanticMap.stock]) ?? 0) : 0,
      raw: r,
    };
  });

  const validDates = facts.filter((f) => f.date).length;
  const nullRate = columns.length
    ? columns.reduce((acc, c) => acc + rows.filter((r) => r[c] == null || String(r[c]).trim() === "").length / Math.max(rows.length, 1), 0) / columns.length
    : 1;

  return {
    rows,
    columns,
    sheetNames,
    semanticMap,
    facts,
    profile: {
      rowCount: rows.length,
      columnCount: columns.length,
      validDates,
      nullRate,
      qualityScore: Math.max(0, Math.round((1 - nullRate) * 70 + (validDates / Math.max(rows.length, 1)) * 30)),
      warnings: [
        ...(validDates === 0 ? ["No se detectaron fechas validas"] : []),
        ...(semanticMap.revenue ? [] : ["No se detecto columna de ventas/revenue"]),
      ],
    },
  };
}
