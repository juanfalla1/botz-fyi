import { NextResponse } from "next/server";
import { metricQuery } from "@/app/api/_intelligence/shared";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const datasetId = String(body.dataset_id || "");
  const metric = String(body.metric || "");
  if (!datasetId || !metric) return NextResponse.json({ error: "dataset_id y metric son requeridos" }, { status: 400 });
  return metricQuery(datasetId, metric);
}
