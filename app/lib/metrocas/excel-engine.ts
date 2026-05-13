import * as XLSX from "xlsx";

export const REQUIRED_SHEETS = ["Macro|Macro 2026"];

export const EXPECTED_SHEETS = [
  "Abril",
  "vtas por dia",
  "Trafico por dia",
  "Trafico por horas",
  "Macro",
  "Hoja8",
  "Dinamica gral",
  "Ranking por cliente",
  "Ranking por segmento",
  "Ranking por linea",
  "Ranking por categoria",
  "Ranking por producto",
  "Ranking por ciudad",
  "KPI Cliente Nuevo",
  "KPI Profundizacion de mercado",
  "KPI Cotizaciones",
  "Anexos",
  "Plan de trabajo Medellin",
  "Plan de trabajo Cali",
  "Plan de trabajo Chico",
  "Plan de trabajo Jumbo",
  "Plan de trabajo Bucaramanga",
  "Plan de trabajo Barranquilla",
  "Macro Pos",
  "Dinamica Pos",
  "Ranking por cliente POS",
  "Ranking por ciudad Pos",
  "Ranking por segmento Pos",
  "Ranking por linea Pos",
  "Ranking por categoria pos",
  "Ranking por producto pos",
];

const normalize = (s: string) => String(s || "").trim().toLowerCase();
const canon = (s: string) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

function normalizeDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed && parsed.y && parsed.m && parsed.d) {
      const y = String(parsed.y).padStart(4, "0");
      const m = String(parsed.m).padStart(2, "0");
      const d = String(parsed.d).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }
  const str = String(value || "").trim();
  if (!str) return null;
  const latamMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (latamMatch) {
    const d = Number(latamMatch[1]);
    const m = Number(latamMatch[2]);
    let y = Number(latamMatch[3]);
    if (y < 100) y += 2000;
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 2000 && y <= 2100) {
      return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }
  const iso = str.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}
const num = (v: unknown) => {
  const n = Number(String(v ?? "").replace(/,/g, "."));
  return Number.isFinite(n) ? n : 0;
};

const pick = (row: Record<string, unknown>, aliases: string[]) => {
  const map = new Map<string, unknown>();
  const mapCanon = new Map<string, unknown>();
  Object.keys(row).forEach((k) => map.set(normalize(k), row[k]));
  Object.keys(row).forEach((k) => mapCanon.set(canon(k), row[k]));
  for (const a of aliases) {
    const v = map.get(normalize(a));
    if (v !== undefined) return v;
  }
  for (const a of aliases) {
    const c = canon(a);
    const exact = mapCanon.get(c);
    if (exact !== undefined) return exact;
    for (const [k, v] of mapCanon.entries()) {
      if (k.includes(c) || c.includes(k)) return v;
    }
  }
  return null;
};

const lineFromCategory = (category: string) => String(category || "").slice(0, 3).toUpperCase() || "OTR";

const clean = (v: string) =>
  String(v || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();

function inferYearMonth(rows: Array<Record<string, unknown>>): string {
  const byMonth = new Map<string, number>();
  for (const r of rows) {
    const dt = normalizeDate(r.invoice_date);
    if (!dt) continue;
    const m = dt.slice(0, 7);
    byMonth.set(m, (byMonth.get(m) || 0) + 1);
  }
  const ranked = [...byMonth.entries()].sort((a, b) => b[1] - a[1]);
  return ranked[0]?.[0] || "";
}

function parseDayFromHeader(value: unknown) {
  const raw = clean(String(value || ""));
  const withNum = raw.match(/(LUNES|MARTES|MIERCOLES|MIERCOLES|JUEVES|VIERNES|SABADO|DOMINGO)\s*(\d{1,2})/i);
  if (withNum) {
    return { dayName: withNum[1], dayNumber: Number(withNum[2]) };
  }
  const onlyDay = raw.match(/(LUNES|MARTES|MIERCOLES|JUEVES|VIERNES|SABADO|DOMINGO)/i);
  if (onlyDay) {
    return { dayName: onlyDay[1], dayNumber: null as number | null };
  }
  return { dayName: "", dayNumber: null as number | null };
}

function monthDate(yearMonth: string, dayNumber: number | null): string | null {
  if (!yearMonth || !dayNumber || dayNumber < 1 || dayNumber > 31) return null;
  return `${yearMonth}-${String(dayNumber).padStart(2, "0")}`;
}

const normalizeSegment = (segment: string) => {
  const s = clean(segment);
  if (!s || s === "(EN BLANCO)" || s === "EN BLANCO") return "En blanco";
  if (s === "PERSONA" || s === "NAT" || s === "PERSONA NATURAL") return "Persona Natural";
  if (s === "CLIENTES CLUB") return "Clientes Club";
  if (s === "SENA") return "Sena";
  if (s === "INSTITUCIONES") return "Instituciones";
  if (s === "RESTAURANTES") return "Restaurantes";
  if (s === "HOTELES") return "Hoteles";
  if (s === "EMPLEADO" || s === "EMPLEADOS") return "Empleado";
  if (s === "PROVEEDOR" || s === "PROVEEDORES") return "Proveedor";
  if (s === "OTROS") return "Otros";
  return segment;
};

const normalizeCity = (city: string) => {
  const c = clean(city);
  if (!c) return "EN BLANCO";
  if (c.includes("BOGOTA")) return "BOGOTA";
  if (c.includes("MEDELLIN")) return "MEDELLIN";
  if (c.includes("BARRANQUILLA")) return "BARRANQUILLA";
  if (c.includes("BUCARAMANGA")) return "BUCARAMANGA";
  if (c.includes("CALI")) return "CALI";
  if (c.includes("CARTAGENA")) return "CARTAGENA";
  if (c.includes("SANTA MARTA")) return "SANTA MARTA";
  if (c.includes("PEREIRA")) return "PEREIRA";
  if (c.includes("MANIZALES")) return "MANIZALES";
  if (c.includes("CUCUTA")) return "CUCUTA";
  if (c.includes("IBAGUE")) return "IBAGUE";
  return c;
};

export type ParsedSheetData = {
  sheetNames: string[];
  missingRequired: string[];
  missingOptional: string[];
  warnings: string[];
  macroRows: Array<Record<string, unknown>>;
  hoja8Rows: Array<Record<string, unknown>>;
  macroPosRows: Array<Record<string, unknown>>;
  dailyTrafficRows: Array<Record<string, unknown>>;
  hourlyTrafficRows: Array<Record<string, unknown>>;
};

export type WorkbookSheetAudit = {
  sheet: string;
  rows: number;
  cols: number;
  formulaCount: number;
  brokenRefCount: number;
  hasData: boolean;
  isCritical: boolean;
  missingImpact: string;
};

export type WorkbookAuditReport = {
  workbookName: string;
  totalSheetsExpected: number;
  totalSheetsFound: number;
  totalFormulaCount: number;
  totalBrokenRefs: number;
  criticalMissing: string[];
  optionalMissing: string[];
  sheets: WorkbookSheetAudit[];
};

const CRITICAL_SHEETS = [
  "Abril",
  "Macro",
  "Hoja8",
  "Macro Pos",
  "vtas por dia",
  "KPI Cotizaciones",
  "KPI Cliente Nuevo",
  "KPI Profundizacion de mercado",
];

export function parseWorkbook(buffer: ArrayBuffer): ParsedSheetData {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetNames = workbook.SheetNames || [];
  const normalizedNames = new Set(sheetNames.map(normalize));

  const hasAny = (pipeNames: string) => pipeNames.split("|").some((n) => normalizedNames.has(normalize(n)));
  const missingRequired = REQUIRED_SHEETS.filter((s) => !hasAny(s));
  const isMonthlyConsolidated = normalizedNames.has(normalize("Macro 2026")) && !normalizedNames.has(normalize("Abril"));
  const expectedForFile = isMonthlyConsolidated
    ? ["Macro 2026", "Macro 2025", "macro 2025 -2026", "Dinamica", "Cliente 2026", "Cliente 2025"]
    : EXPECTED_SHEETS;
  const missingOptional = expectedForFile.filter((s) => !normalizedNames.has(normalize(s)));

  const getRows = (nameOrCandidates: string | string[]) => {
    const candidates = Array.isArray(nameOrCandidates) ? nameOrCandidates : [nameOrCandidates];
    const real = sheetNames.find((n) => candidates.some((c) => normalize(n) === normalize(c)));
    if (!real) return [] as Array<Record<string, unknown>>;
    const ws = workbook.Sheets[real];
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });
  };

  const macroRaw = getRows(["Macro", "Macro 2026"]);
  const hoja8Raw = getRows("Hoja8");
  const posRaw = getRows("Macro Pos");
  const trafficDailyRaw = getRows(["Trafico por dia", "Tráfico por dia"]);
  const trafficHourlyRaw = getRows(["Trafico por horas", "Tráfico por horas"]);

  const toNormalized = (rows: Array<Record<string, unknown>>) =>
    rows.map((r) => {
      const category = String(
        pick(r, [
          "Categoria del producto",
          "Categoría del producto",
          "Categoria producto",
          "Categoría producto",
          "Lineas de factura/Categoria del producto",
          "Líneas de factura/Categoría del producto",
        ]) || "",
      );
      const invoiceDateRaw = pick(r, ["Fecha de factura", "Fecha factura", "Fecha", "Líneas de factura/Fecha de factura", "Lineas de factura/Fecha de factura"]);
      const invoiceDate = normalizeDate(invoiceDateRaw);
      return {
        invoice_number: String(pick(r, ["Numero de factura", "Número de factura", "Número factura", "Líneas de factura/Número", "Lineas de factura/Numero"]) || ""),
        journal: String(pick(r, ["Diario", "Comercio", "Sede", "Líneas de factura/Diario", "Lineas de factura/Diario"]) || ""),
        customer_name: String(pick(r, ["Contacto / cliente", "Cliente", "Contacto", "Líneas de factura/Contacto", "Lineas de factura/Contacto"]) || ""),
        state_department: String(pick(r, ["Estado / departamento", "Departamento", "Estado", "Líneas de factura/Contacto/Estado", "Lineas de factura/Contacto/Estado"]) || ""),
        city: normalizeCity(String(pick(r, ["Ciudad", "Líneas de factura/Contacto/Ciudad", "Lineas de factura/Contacto/Ciudad"]) || "")),
        country: String(pick(r, ["Pais", "País", "Líneas de factura/País del contacto comercial", "Lineas de factura/Pais del contacto comercial"]) || "Colombia"),
        segment: normalizeSegment(String(pick(r, ["Etiquetas / segmento", "Segmento", "Etiqueta", "Líneas de factura/Contacto/Etiquetas", "Lineas de factura/Contacto/Etiquetas"]) || "")),
        invoice_date: invoiceDate,
        product_category: category,
        product_line: lineFromCategory(category),
        product_name: String(pick(r, ["Producto", "Líneas de factura/Producto", "Lineas de factura/Producto"]) || ""),
        analytic_distribution: String(pick(r, ["Distribucion analitica", "Distribución analítica", "Líneas de factura/Distribución analítica", "Lineas de factura/Distribucion analitica"]) || ""),
        currency: String(pick(r, ["Moneda", "Líneas de factura/Moneda", "Lineas de factura/Moneda"]) || "COP"),
        quantity: num(pick(r, ["Cantidad", "Líneas de factura/Cantidad", "Lineas de factura/Cantidad"])),
        unit_price: num(pick(r, ["Precio unitario", "Líneas de factura/Precio unitario", "Lineas de factura/Precio unitario"])),
        amount_currency: num(pick(r, ["Importe en moneda", "Importe moneda", "Líneas de factura/Importe en moneda", "Lineas de factura/Importe en moneda"])),
        balance: num(pick(r, ["Balance", "Líneas de factura/Balance", "Lineas de factura/Balance"])),
        analytic_account: String(pick(r, ["Cuenta analitica de distribucion", "Cuenta analítica de distribución", "Cuenta analítica", "Líneas de factura/Cuenta analítica de distribución", "Lineas de factura/Cuenta analitica de distribucion"]) || ""),
        origin: String(pick(r, ["Origen", "Líneas de factura/Origen", "Lineas de factura/Origen"]) || ""),
      };
    });

  const macroRows = toNormalized(macroRaw);
  const hoja8Rows = hoja8Raw.length ? toNormalized(hoja8Raw) : macroRows;
  const macroPosRows = toNormalized(posRaw);
  const inferredMonth = inferYearMonth(hoja8Rows);

  const dailyTrafficRowsDirect = trafficDailyRaw
    .map((r) => {
      const trafficDate = normalizeDate(
        pick(r, [
          "Fecha",
          "fecha",
          "DIA",
          "Dia",
          "Día",
          "traffic_date",
          "fecha trafico",
          "Fecha trafico",
        ]),
      );
      const branch = String(
        pick(r, [
          "Sede",
          "sede",
          "Diario",
          "diario",
          "Sucursal",
          "Punto",
          "branch",
          "city",
          "Ciudad",
        ]) || "SIN SEDE",
      ).trim();
      const visits = num(
        pick(r, ["Visitas", "visitas", "Trafico", "Tráfico", "traffic", "Entradas", "Ingresos", "Cantidad", "cantidad"]),
      );
      const targetDaily = num(pick(r, ["Meta", "meta", "Meta diaria", "objetivo", "target", "target_daily"]));
      const conversion = num(pick(r, ["Conversion", "Conversión", "% conversion", "% conversión", "conversion"]));
      const salesPerVisit = num(
        pick(r, ["Venta por visita", "ventas por visita", "sales_per_visit", "ticket trafico", "ticket tráfico"]),
      );
      return {
        traffic_date: trafficDate,
        branch,
        visits: Math.max(0, Math.round(visits)),
        target_daily: targetDaily,
        conversion,
        sales_per_visit: salesPerVisit,
      };
    })
    .filter((r) => r.traffic_date && Number(r.visits || 0) > 0);

  const dailyTrafficRowsMatrix: Array<Record<string, unknown>> = [];
  if (!dailyTrafficRowsDirect.length && trafficDailyRaw.length) {
    for (const r of trafficDailyRaw) {
      const branch = String(pick(r, ["COMERCIO", "Comercio", "Sede", "sede", "Sucursal"]) || "").trim();
      if (!branch || clean(branch).includes("TOTAL")) continue;
      for (const [k, v] of Object.entries(r)) {
        const header = parseDayFromHeader(k);
        if (!header.dayName) continue;
        const visits = num(v);
        if (visits <= 0) continue;
        const trafficDate = monthDate(inferredMonth, header.dayNumber);
        if (!trafficDate) continue;
        dailyTrafficRowsMatrix.push({
          traffic_date: trafficDate,
          branch,
          visits: Math.max(0, Math.round(visits)),
          target_daily: num(pick(r, ["META DIARIA", "Meta diaria", "Meta"])),
          conversion: 0,
          sales_per_visit: 0,
        });
      }
    }
  }
  const dailyTrafficRows = dailyTrafficRowsDirect.length ? dailyTrafficRowsDirect : dailyTrafficRowsMatrix;

  const hourlyTrafficRowsDirect = trafficHourlyRaw
    .map((r) => {
      const dayName = String(
        pick(r, ["Dia", "Día", "Dia semana", "Día semana", "day", "day_name", "weekday"]) || "N/A",
      ).trim();
      const hourSlotRaw = pick(r, ["Hora", "Franja", "Franja horaria", "hour", "hour_slot", "Horario"]);
      const hourSlot = String(hourSlotRaw || "N/A").trim();
      const visits = num(pick(r, ["Visitas", "visitas", "Trafico", "Tráfico", "traffic", "Cantidad", "cantidad"]));
      return {
        day_name: dayName,
        hour_slot: hourSlot,
        visits: Math.max(0, Math.round(visits)),
      };
    })
    .filter((r) => r.hour_slot && r.hour_slot !== "N/A" && Number(r.visits || 0) > 0);

  const hourlyTrafficRowsMatrix: Array<Record<string, unknown>> = [];
  if (!hourlyTrafficRowsDirect.length && trafficHourlyRaw.length) {
    const headerRow = trafficHourlyRaw[0] || {};
    const slotByKey = new Map<string, string>();
    for (const [k, v] of Object.entries(headerRow)) {
      const label = String(v || "").trim();
      if (/\d\s*(am|pm)\s*-\s*\d/i.test(label) || />\s*6pm/i.test(label)) {
        slotByKey.set(k, label);
      }
    }
    for (let i = 1; i < trafficHourlyRaw.length; i += 1) {
      const row = trafficHourlyRaw[i];
      const dayNameRaw = String(row["CLIENTES HORA TIENDA ENERO"] || row["DIA"] || "").trim();
      const dayName = dayNameRaw ? dayNameRaw : "N/A";
      if (clean(dayName).includes("TOTAL") || clean(dayName).includes("PROMEDIO")) continue;
      for (const [k, slot] of slotByKey.entries()) {
        const visits = num((row as any)[k]);
        if (visits <= 0) continue;
        hourlyTrafficRowsMatrix.push({
          day_name: dayName,
          hour_slot: slot,
          visits: Math.max(0, Math.round(visits)),
        });
      }
    }
  }
  const hourlyTrafficRows = hourlyTrafficRowsDirect.length ? hourlyTrafficRowsDirect : hourlyTrafficRowsMatrix;

  const warnings: string[] = [];
  if (!hoja8Raw.length) warnings.push("Falta Hoja8, se reconstruye automaticamente desde Macro.");
  if (!posRaw.length) warnings.push("Falta Macro Pos, se ejecuta analitica sin POS.");
  if (!trafficDailyRaw.length) warnings.push("Falta Trafico por dia, no se persistira trafico diario real.");
  if (!trafficHourlyRaw.length) warnings.push("Falta Trafico por horas, no se persistira trafico horario real.");
  if (isMonthlyConsolidated) warnings.push("Se detecta archivo consolidado mensual (enero-abril), se usa Macro 2026 como base principal.");

  return { sheetNames, missingRequired, missingOptional, warnings, macroRows, hoja8Rows, macroPosRows, dailyTrafficRows, hourlyTrafficRows };
}

export function auditWorkbook(buffer: ArrayBuffer, workbookName = "unknown.xlsx"): WorkbookAuditReport {
  const workbook = XLSX.read(buffer, { type: "array", cellFormula: true, cellNF: true, cellText: false });
  const sheetNames = workbook.SheetNames || [];
  const normalizedNames = new Set(sheetNames.map(normalize));

  const expected = EXPECTED_SHEETS;
  const criticalMissing = CRITICAL_SHEETS.filter((s) => !normalizedNames.has(normalize(s)));
  const optionalMissing = expected.filter((s) => !normalizedNames.has(normalize(s)) && !CRITICAL_SHEETS.includes(s));

  let totalFormulaCount = 0;
  let totalBrokenRefs = 0;

  const impactBySheet: Record<string, string> = {
    "Abril": "Sin resumen ejecutivo mensual y metas por sede.",
    "Macro": "Sin base de ventas general.",
    "Hoja8": "Sin transformacion de linea/categoria para rankings.",
    "Macro Pos": "Sin analisis POS ni comparativo POS vs general.",
    "vtas por dia": "Sin ventas diarias/semanales por sede.",
    "Trafico por dia": "Sin analisis de trafico diario.",
    "Trafico por horas": "Sin analisis horario.",
    "KPI Cotizaciones": "Sin KPI de cotizaciones.",
    "KPI Cliente Nuevo": "Sin KPI de nuevos clientes.",
    "KPI Profundizacion de mercado": "Sin KPI de profundizacion.",
  };

  const sheets: WorkbookSheetAudit[] = sheetNames.map((sheet) => {
    const ws = workbook.Sheets[sheet];
    const ref = ws?.["!ref"] || "A1:A1";
    const range = XLSX.utils.decode_range(ref);
    const rows = Math.max(0, range.e.r - range.s.r + 1);
    const cols = Math.max(0, range.e.c - range.s.c + 1);

    let formulaCount = 0;
    let brokenRefCount = 0;
    let hasData = false;

    Object.keys(ws || {}).forEach((k) => {
      if (k.startsWith("!")) return;
      const cell = (ws as any)[k];
      if (!cell) return;
      if (cell.v !== undefined && cell.v !== null && String(cell.v).trim() !== "") hasData = true;
      if (typeof cell.f === "string" && cell.f.trim()) {
        formulaCount += 1;
        if (cell.f.includes("#REF!") || String(cell.v || "").includes("#REF!")) brokenRefCount += 1;
      }
      if (typeof cell.v === "string" && cell.v.includes("#REF!")) brokenRefCount += 1;
    });

    totalFormulaCount += formulaCount;
    totalBrokenRefs += brokenRefCount;

    const isCritical = CRITICAL_SHEETS.map(normalize).includes(normalize(sheet));
    return {
      sheet,
      rows,
      cols,
      formulaCount,
      brokenRefCount,
      hasData,
      isCritical,
      missingImpact: impactBySheet[sheet] || "",
    };
  });

  // Also include expected missing sheets in report rows
  expected.forEach((sheet) => {
    if (normalizedNames.has(normalize(sheet))) return;
    sheets.push({
      sheet,
      rows: 0,
      cols: 0,
      formulaCount: 0,
      brokenRefCount: 0,
      hasData: false,
      isCritical: CRITICAL_SHEETS.includes(sheet),
      missingImpact: impactBySheet[sheet] || "Modulo dependiente incompleto.",
    });
  });

  return {
    workbookName,
    totalSheetsExpected: expected.length,
    totalSheetsFound: sheetNames.length,
    totalFormulaCount,
    totalBrokenRefs,
    criticalMissing,
    optionalMissing,
    sheets: sheets.sort((a, b) => a.sheet.localeCompare(b.sheet)),
  };
}

export function computeRankings(rows: Array<Record<string, unknown>>, field: string) {
  const totals = new Map<string, { quantity: number; balance: number }>();
  rows.forEach((r) => {
    const key = String(r[field] || "EN BLANCO").trim() || "EN BLANCO";
    const current = totals.get(key) || { quantity: 0, balance: 0 };
    current.quantity += num(r.quantity);
    current.balance += num(r.balance);
    totals.set(key, current);
  });
  const totalBalance = [...totals.values()].reduce((a, b) => a + b.balance, 0);
  return [...totals.entries()]
    .map(([label, v]) => ({ label, quantity: v.quantity, balance: v.balance, participation: totalBalance ? v.balance / totalBalance : 0 }))
    .sort((a, b) => b.balance - a.balance);
}

export function computeDailySales(rows: Array<Record<string, unknown>>) {
  const map = new Map<string, number>();
  rows.forEach((r) => {
    const date = String(r.invoice_date || "").slice(0, 10);
    map.set(date, (map.get(date) || 0) + num(r.balance));
  });
  return [...map.entries()].map(([date, sales]) => ({ date, sales })).sort((a, b) => a.date.localeCompare(b.date));
}
