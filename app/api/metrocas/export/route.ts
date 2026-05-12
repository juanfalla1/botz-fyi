import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const datasetId = String(body.dataset_id || "");
  if (!datasetId) return NextResponse.json({ error: "dataset_id es requerido" }, { status: 400 });

  return NextResponse.json({
    ok: true,
    message: "Exportacion preparada",
    files: [
      { type: "pdf", name: `metrocas-executive-${datasetId}.pdf`, status: "queued" },
      { type: "excel", name: `metrocas-automation-${datasetId}.xlsx`, status: "queued" },
      { type: "branch_report", name: `metrocas-branches-${datasetId}.pdf`, status: "queued" },
      { type: "city_report", name: `metrocas-cities-${datasetId}.pdf`, status: "queued" },
      { type: "pos_report", name: `metrocas-pos-${datasetId}.pdf`, status: "queued" },
      { type: "kpi_report", name: `metrocas-kpis-${datasetId}.pdf`, status: "queued" },
      { type: "work_plan", name: `metrocas-work-plan-${datasetId}.pdf`, status: "queued" },
    ],
  });
}
