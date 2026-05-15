import { NextResponse } from "next/server";
import { getDataset } from "@/app/api/_intelligence/shared";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const datasetId = String(u.searchParams.get("dataset_id") || "");
  const fromMonth = String(u.searchParams.get("from_month") || "");
  const toMonth = String(u.searchParams.get("to_month") || "");
  if (!datasetId || !fromMonth || !toMonth) return NextResponse.json({ error: "dataset_id, from_month, to_month requeridos" }, { status: 400 });
  const ds = await getDataset(datasetId);
  if (!ds) return NextResponse.json({ error: "Dataset no encontrado" }, { status: 404 });
  const sum = (arr: any[], key: string) => arr.reduce((a, r) => a + Number(r[key] || 0), 0);
  const prev = ds.facts.filter((f: any) => f.month === fromMonth);
  const curr = ds.facts.filter((f: any) => f.month === toMonth);
  const prevRev = sum(prev, "revenue");
  const currRev = sum(curr, "revenue");
  const prevQty = Math.max(1, sum(prev, "quantity"));
  const currQty = Math.max(1, sum(curr, "quantity"));
  const prevPrice = prevRev / prevQty;
  const currPrice = currRev / currQty;
  const priceEffect = (currPrice - prevPrice) * prevQty;
  const volumeEffect = (currQty - prevQty) * prevPrice;
  const mixEffect = (currRev - prevRev) - priceEffect - volumeEffect;
  return NextResponse.json({ fromMonth, toMonth, priceEffect, volumeEffect, mixEffect, totalDelta: currRev - prevRev });
}
