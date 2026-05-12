import { assertTenantAccess, getTeamMemberByAuthUserId, isPlatformAdmin } from "@/app/api/_utils/guards";
import { getRequestUser as getRequestUserFromCookieOrBearer } from "@/app/api/_utils/auth";
import { getServiceSupabase } from "@/app/api/_utils/supabase";
import { buildDashboard, normalizeRows, validateColumns } from "@/app/lib/metrocas/analyzer";
import { auditWorkbook, computeDailySales, computeRankings, parseWorkbook } from "@/app/lib/metrocas/excel-engine";

async function insertInChunks<T>(fn: (chunk: T[]) => Promise<{ error: { message: string } | null }>, rows: T[], chunkSize = 1000) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await fn(chunk);
    if (error) return { error };
  }
  return { error: null };
}

export async function resolveTenant(req: Request) {
  const requestedTenantId = new URL(req.url).searchParams.get("tenant_id");
  const strict = await assertTenantAccess({ req, requestedTenantId, allowPlatformAdminCrossTenant: true });
  if (strict.ok) return strict;

  // Fallback: allow Supabase cookie session when Bearer token is not explicitly sent from UI.
  const cookieUser = await getRequestUserFromCookieOrBearer(req);
  if (!cookieUser.ok || !cookieUser.user?.id) {
    if (process.env.NODE_ENV !== "production") {
      return {
        ok: true as const,
        status: 200 as const,
        error: null,
        user: { id: "00000000-0000-0000-0000-000000000000", email: null },
        tenantId: null,
        isPlatformAdmin: false as const,
      };
    }
    return strict;
  }

  const pa = await isPlatformAdmin(cookieUser.user.id);
  if (!pa.ok) {
    return {
      ok: false as const,
      status: 500 as const,
      error: pa.error || "Platform admin check failed",
      user: null,
      tenantId: null,
      isPlatformAdmin: false as const,
    };
  }

  if (pa.isAdmin) {
    return {
      ok: true as const,
      status: 200 as const,
      error: null,
      user: { id: cookieUser.user.id, email: cookieUser.user.email },
      tenantId: requestedTenantId || null,
      isPlatformAdmin: true as const,
    };
  }

  const tm = await getTeamMemberByAuthUserId(cookieUser.user.id);
  if (!tm.ok || !tm.row?.tenant_id) {
    return {
      ok: false as const,
      status: 403 as const,
      error: tm.error || "Forbidden",
      user: null,
      tenantId: null,
      isPlatformAdmin: false as const,
    };
  }

  const tenantId = String(tm.row.tenant_id);
  if (requestedTenantId && requestedTenantId !== tenantId) {
    return {
      ok: false as const,
      status: 403 as const,
      error: "Forbidden",
      user: null,
      tenantId: null,
      isPlatformAdmin: false as const,
    };
  }

  return {
    ok: true as const,
    status: 200 as const,
    error: null,
    user: { id: cookieUser.user.id, email: cookieUser.user.email },
    tenantId,
    isPlatformAdmin: false as const,
  };
}

export function parseCsvText(text: string) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const headers = (lines[0] || "").split(",").map((h) => h.trim().toLowerCase());
  const data = lines.slice(1).map((line) => {
    const values = line.split(",");
    const row: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? null;
    });
    return row;
  });
  return { data, errors: [] as Array<{ message: string }> };
}

export async function processDataset(params: {
  tenantId: string | null;
  createdBy: string;
  fileName: string;
  fileType: string;
  csvText: string;
}) {
  const svc = getServiceSupabase();
  if (!svc) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

  const parsed = parseCsvText(params.csvText);
  const cols = Object.keys(parsed.data[0] || {});
  const validation = validateColumns(cols);
  if (!validation.valid) {
    return { validation, dataset: null, dashboard: null };
  }

  const normalized = normalizeRows(parsed.data);
  const { data: dataset, error: datasetErr } = await svc
    .from("metrocas_datasets")
    .insert({
      tenant_id: params.tenantId,
      created_by: params.createdBy,
      name: params.fileName,
      file_name: params.fileName,
      file_type: params.fileType,
      status: "processed",
      total_rows: parsed.data.length,
      valid_rows: normalized.length,
      invalid_rows: parsed.errors.length,
      metadata: { warnings: validation.warnings, optionalMissing: validation.optionalMissing },
    })
    .select("id")
    .single();
  if (datasetErr || !dataset?.id) throw new Error(datasetErr?.message || "No se pudo crear dataset");

  const rowsToInsert = normalized.map((r) => ({
    dataset_id: dataset.id,
    tenant_id: params.tenantId,
    sale_date: r.fecha,
    customer_name: r.cliente,
    product_name: r.producto,
    category: r.categoria,
    quantity: r.cantidad,
    unit_price: r.precio_unitario,
    unit_cost: r.costo_unitario,
    total_sale: r.total_venta,
    gross_margin:
      typeof r.costo_unitario === "number" ? (r.total_venta || 0) - (r.costo_unitario || 0) * r.cantidad : null,
    gross_margin_percent:
      typeof r.costo_unitario === "number" && (r.total_venta || 0) > 0
        ? (((r.total_venta || 0) - (r.costo_unitario || 0) * r.cantidad) / (r.total_venta || 1)) * 100
        : null,
    stock_current: r.stock_actual,
    seller: r.vendedor,
    city: r.ciudad,
    department: r.departamento,
    region: r.region,
    country: "Colombia",
    channel: r.canal,
    raw_data: r,
  }));

  if (rowsToInsert.length) {
    const { error: rowsErr } = await svc.from("metrocas_sales_records").insert(rowsToInsert);
    if (rowsErr) throw new Error(rowsErr.message);
  }

  const dashboard = buildDashboard(dataset.id, normalized);

  await svc.from("metrocas_kpis").insert({
    dataset_id: dataset.id,
    tenant_id: params.tenantId,
    period: "current",
    total_sales: dashboard.kpis.totalSales,
    total_margin: dashboard.kpis.grossMargin,
    average_ticket: dashboard.kpis.avgTicket,
    total_customers: dashboard.kpis.activeCustomers,
    total_products: dashboard.kpis.activeProducts,
    active_customers: dashboard.kpis.activeCustomers,
    inactive_customers: dashboard.kpis.inactiveCustomers,
    products_without_rotation: dashboard.kpis.noRotationProducts,
    critical_stock_products: dashboard.kpis.criticalStock,
    growth_rate: dashboard.kpis.monthlyGrowth,
    drop_rate: dashboard.kpis.monthlyDrop,
    data: dashboard,
  });

  return { validation, dataset, dashboard };
}

export async function processExcelDataset(params: {
  tenantId: string | null;
  createdBy: string;
  fileName: string;
  fileType: string;
  buffer: ArrayBuffer;
}) {
  const svc = getServiceSupabase();
  if (!svc) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

  const parsed = parseWorkbook(params.buffer);
  const audit = auditWorkbook(params.buffer, params.fileName);
  if (parsed.missingRequired.length) {
    return {
      ok: false,
      validation: {
        valid: false,
        criticalErrors: parsed.missingRequired.map((s) => `Falta hoja critica: ${s}`),
        warnings: parsed.warnings,
        optionalMissing: parsed.missingOptional,
        audit,
      },
    };
  }

  const { data: dataset, error: datasetErr } = await svc
    .from("metrocas_datasets")
    .insert({
      tenant_id: params.tenantId,
      created_by: params.createdBy,
      name: params.fileName,
      file_name: params.fileName,
      file_type: params.fileType,
      status: "processed",
      total_rows: parsed.macroRows.length,
      valid_rows: parsed.macroRows.length,
      invalid_rows: 0,
      metadata: {
        workbook_sheets: parsed.sheetNames,
        missing_optional: parsed.missingOptional,
        warnings: parsed.warnings,
        audit,
      },
    })
    .select("id")
    .single();
  if (datasetErr || !dataset?.id) throw new Error(datasetErr?.message || "No se pudo crear dataset");

  const macroRows = parsed.macroRows.map((r) => ({ ...r, dataset_id: dataset.id, tenant_id: params.tenantId, created_by: params.createdBy }));
  if (macroRows.length) {
    const modernInsert = await insertInChunks(
      async (chunk) => svc.from("metrocas_sales_records").insert(chunk as any),
      macroRows,
      800,
    );
    if (modernInsert.error) {
      const legacyRows = parsed.macroRows.map((r) => ({
        dataset_id: dataset.id,
        tenant_id: params.tenantId,
        sale_date: r.invoice_date,
        customer_name: r.customer_name,
        product_name: r.product_name,
        category: r.product_category,
        quantity: r.quantity,
        unit_price: r.unit_price,
        total_sale: r.balance,
        city: r.city,
        department: r.state_department,
        country: r.country,
        seller: r.journal,
        channel: r.journal,
        raw_data: r,
      }));
      const legacyInsert = await insertInChunks(
        async (chunk) => svc.from("metrocas_sales_records").insert(chunk as any),
        legacyRows,
        800,
      );
      if (legacyInsert.error) throw new Error(`No se pudo guardar ventas (modelo moderno ni legacy): ${legacyInsert.error.message}`);
    }
  }

  const posRows = parsed.macroPosRows.map((r) => ({ ...r, dataset_id: dataset.id, tenant_id: params.tenantId, created_by: params.createdBy }));
  if (posRows.length) {
    const { error } = await insertInChunks(async (chunk) => svc.from("metrocas_pos_sales_records").insert(chunk as any), posRows, 800);
    if (error) {
      parsed.warnings.push(`No se pudo persistir POS: ${error.message}`);
    }
  }

  const dailyTraffic = parsed.dailyTrafficRows.map((r) => ({
    dataset_id: dataset.id,
    tenant_id: params.tenantId,
    created_by: params.createdBy,
    traffic_date: r.traffic_date,
    branch: r.branch,
    visits: r.visits,
    target_daily: r.target_daily,
    conversion: r.conversion,
    sales_per_visit: r.sales_per_visit,
    data: r,
  }));
  if (dailyTraffic.length) {
    const { error } = await insertInChunks(async (chunk) => svc.from("metrocas_daily_traffic").insert(chunk as any), dailyTraffic, 1000);
    if (error) parsed.warnings.push(`No se pudo persistir trafico diario: ${error.message}`);
  }

  const hourlyTraffic = parsed.hourlyTrafficRows.map((r) => ({
    dataset_id: dataset.id,
    tenant_id: params.tenantId,
    created_by: params.createdBy,
    day_name: r.day_name,
    hour_slot: r.hour_slot,
    visits: r.visits,
    data: r,
  }));
  if (hourlyTraffic.length) {
    const { error } = await insertInChunks(async (chunk) => svc.from("metrocas_hourly_traffic").insert(chunk as any), hourlyTraffic, 1000);
    if (error) parsed.warnings.push(`No se pudo persistir trafico horario: ${error.message}`);
  }

  const rankings = [
    ["customer", computeRankings(parsed.hoja8Rows, "customer_name")],
    ["segment", computeRankings(parsed.hoja8Rows, "segment")],
    ["line", computeRankings(parsed.hoja8Rows, "product_line")],
    ["category", computeRankings(parsed.hoja8Rows, "product_category")],
    ["product", computeRankings(parsed.hoja8Rows, "product_name")],
    ["city", computeRankings(parsed.hoja8Rows, "city")],
  ] as const;

  for (const [type, values] of rankings) {
    const rows = values.map((v, idx) => ({
      dataset_id: dataset.id,
      tenant_id: params.tenantId,
      created_by: params.createdBy,
      ranking_type: type,
      ranking_label: v.label,
      quantity_total: v.quantity,
      balance_total: v.balance,
      participation: v.participation,
      ranking_order: idx + 1,
      data: v,
    }));
    if (rows.length) {
      const { error } = await insertInChunks(async (chunk) => svc.from("metrocas_rankings").insert(chunk as any), rows, 500);
      if (error) parsed.warnings.push(`No se pudo persistir ranking ${type}: ${error.message}`);
    }
  }

  const dailySales = computeDailySales(parsed.hoja8Rows).map((d) => ({
    dataset_id: dataset.id,
    tenant_id: params.tenantId,
    created_by: params.createdBy,
    sale_date: d.date,
    sales_total: d.sales,
  }));
  if (dailySales.length) {
    const { error } = await insertInChunks(async (chunk) => svc.from("metrocas_daily_sales").insert(chunk as any), dailySales, 1000);
    if (error) parsed.warnings.push(`No se pudo persistir ventas diarias: ${error.message}`);
  }

  const normalized = normalizeRows(
    parsed.hoja8Rows.map((r) => ({
      fecha: r.invoice_date,
      cliente: r.customer_name,
      producto: r.product_name,
      categoria: r.product_category,
      cantidad: r.quantity,
      precio_unitario: r.unit_price,
      total_venta: r.balance,
      ciudad: r.city,
      departamento: r.state_department,
      canal: r.journal,
      region: "",
    })) as Array<Record<string, unknown>>,
  );
  const dashboard = buildDashboard(dataset.id, normalized);

  const { error: kpiErr } = await svc.from("metrocas_kpis").insert({
    dataset_id: dataset.id,
    tenant_id: params.tenantId,
    period: "monthly",
    total_sales: dashboard.kpis.totalSales,
    total_margin: dashboard.kpis.grossMargin,
    average_ticket: dashboard.kpis.avgTicket,
    total_customers: dashboard.kpis.activeCustomers,
    total_products: dashboard.kpis.activeProducts,
    active_customers: dashboard.kpis.activeCustomers,
    inactive_customers: dashboard.kpis.inactiveCustomers,
    products_without_rotation: dashboard.kpis.noRotationProducts,
    critical_stock_products: dashboard.kpis.criticalStock,
    growth_rate: dashboard.kpis.monthlyGrowth,
    drop_rate: dashboard.kpis.monthlyDrop,
    data: {
      dashboard,
      sheet_coverage: {
        present: parsed.sheetNames,
        missing_optional: parsed.missingOptional,
      },
    },
  });
  if (kpiErr) parsed.warnings.push(`No se pudo persistir KPI principal: ${kpiErr.message}`);

  return {
    ok: true,
    dataset,
    dashboard,
    validation: {
      valid: true,
      criticalErrors: [],
      warnings: parsed.warnings,
      optionalMissing: parsed.missingOptional,
      audit,
    },
  };
}
