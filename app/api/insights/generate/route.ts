import { NextResponse } from "next/server";
import { generateInsights } from "@/app/api/_intelligence/shared";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const datasetId = String(body.dataset_id || "");
  const mode = String(body.mode || "ejecutivo");
  const fromMonth = String(body.from_month || "");
  const toMonth = String(body.to_month || "");
  if (!datasetId || !fromMonth || !toMonth) return NextResponse.json({ error: "dataset_id, from_month, to_month requeridos" }, { status: 400 });
  return generateInsights(datasetId, mode, fromMonth, toMonth);
}
