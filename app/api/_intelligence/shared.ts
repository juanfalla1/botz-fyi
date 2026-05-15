import { NextResponse } from "next/server";
import { aggregateKpis, buildInsights, byMonth, variance } from "@/app/lib/intelligence/analytics";
import { parseUniversalFile } from "@/app/lib/intelligence/parser";
import { newId, readDb, saveUploadFile, writeDb } from "@/app/lib/intelligence/store";

export async function handleUpload(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  const workspaceId = String(form.get("workspace_id") || "default");
  if (!(file instanceof File)) return NextResponse.json({ error: "file es requerido" }, { status: 400 });
  const id = newId();
  const bytes = await file.arrayBuffer();
  const parsed = parseUniversalFile(file.name, bytes);
  const db = await readDb();
  const filePath = await saveUploadFile(id, file.name, bytes);

  db.uploads[id] = {
    id,
    status: "processed",
    workspaceId,
    fileName: file.name,
    filePath,
    createdAt: new Date().toISOString(),
    profile: parsed.profile,
  };

  const datasetId = newId();
  const kpis = aggregateKpis(parsed.facts);
  db.datasets[datasetId] = {
    id: datasetId,
    uploadId: id,
    workspaceId,
    fileName: file.name,
    columns: parsed.columns,
    sheetNames: parsed.sheetNames,
    semanticMap: parsed.semanticMap,
    profile: parsed.profile,
    facts: parsed.facts,
    views: { monthly_sales: byMonth(parsed.facts) },
    kpis,
    modelBuilt: false,
    metricsCatalog: ["ventas_netas", "unidades", "ticket_promedio", "clientes_activos"],
    createdAt: new Date().toISOString(),
  };

  await writeDb(db);
  return NextResponse.json({ upload_id: id, dataset_id: datasetId, status: "processed", profile: parsed.profile });
}

export async function uploadStatus(id: string) {
  const db = await readDb();
  const upload = db.uploads[id];
  if (!upload) return NextResponse.json({ error: "Upload no encontrado" }, { status: 404 });
  return NextResponse.json(upload);
}

export async function listDatasets() {
  const db = await readDb();
  return NextResponse.json(Object.values(db.datasets).map((d: any) => ({ id: d.id, fileName: d.fileName, createdAt: d.createdAt, profile: d.profile })));
}

export async function getDataset(id: string) {
  const db = await readDb();
  const ds = db.datasets[id];
  if (!ds) return null;
  return ds;
}

export async function runSql(datasetId: string, sql: string) {
  const ds = await getDataset(datasetId);
  if (!ds) return NextResponse.json({ error: "Dataset no encontrado" }, { status: 404 });
  const q = String(sql || "").trim().toLowerCase();
  if (q.includes("group by month") || q.includes("group by mes")) return NextResponse.json({ rows: ds.views.monthly_sales });
  if (q.includes("top") && q.includes("customer")) {
    const map = new Map<string, number>();
    for (const f of ds.facts) map.set(f.customer || "EN BLANCO", (map.get(f.customer || "EN BLANCO") || 0) + Number(f.revenue || 0));
    const rows = [...map.entries()].map(([customer, revenue]) => ({ customer, revenue })).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
    return NextResponse.json({ rows });
  }
  return NextResponse.json({ rows: ds.facts.slice(0, 500), note: "Modo SQL seguro v1: resultados limitados/plantilla." });
}

export async function metricQuery(datasetId: string, metric: string) {
  const ds = await getDataset(datasetId);
  if (!ds) return NextResponse.json({ error: "Dataset no encontrado" }, { status: 404 });
  const k = String(metric || "");
  const values: Record<string, number> = {
    ventas_netas: ds.kpis.totalSales,
    unidades: ds.kpis.units,
    ticket_promedio: ds.kpis.avgTicket,
    clientes_activos: ds.kpis.activeCustomers,
  };
  return NextResponse.json({ metric: k, value: values[k] ?? null });
}

export async function runVariance(datasetId: string, dimension: string, fromMonth: string, toMonth: string) {
  const ds = await getDataset(datasetId);
  if (!ds) return NextResponse.json({ error: "Dataset no encontrado" }, { status: 404 });
  const rows = variance(ds.facts, dimension || "category", fromMonth, toMonth);
  return NextResponse.json({ rows, fromMonth, toMonth, dimension: dimension || "category" });
}

export async function generateInsights(datasetId: string, mode: string, fromMonth: string, toMonth: string) {
  const ds = await getDataset(datasetId);
  if (!ds) return NextResponse.json({ error: "Dataset no encontrado" }, { status: 404 });
  const varRows = variance(ds.facts, "category", fromMonth, toMonth);
  const insights = buildInsights({ kpis: ds.kpis, warnings: ds.profile.warnings || [], varRows });
  return NextResponse.json({ mode: mode || "ejecutivo", ...insights });
}
