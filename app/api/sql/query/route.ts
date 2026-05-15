import { NextResponse } from "next/server";
import { runSql } from "@/app/api/_intelligence/shared";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const datasetId = String(body.dataset_id || "");
  const sql = String(body.sql || "");
  if (!datasetId || !sql) return NextResponse.json({ error: "dataset_id y sql son requeridos" }, { status: 400 });
  return runSql(datasetId, sql);
}
