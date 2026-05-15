import { NextResponse } from "next/server";
import { runVariance } from "@/app/api/_intelligence/shared";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const datasetId = String(u.searchParams.get("dataset_id") || "");
  const fromMonth = String(u.searchParams.get("from_month") || "");
  const toMonth = String(u.searchParams.get("to_month") || "");
  if (!datasetId || !fromMonth || !toMonth) return NextResponse.json({ error: "dataset_id, from_month, to_month requeridos" }, { status: 400 });
  return runVariance(datasetId, "product", fromMonth, toMonth);
}
