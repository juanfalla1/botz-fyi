import { NextResponse } from "next/server";
import { getDataset } from "@/app/api/_intelligence/shared";
import { readDb, writeDb } from "@/app/lib/intelligence/store";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const mapping = body?.mapping;
  if (!mapping || typeof mapping !== "object") return NextResponse.json({ error: "mapping es requerido" }, { status: 400 });
  const ds = await getDataset(id);
  if (!ds) return NextResponse.json({ error: "Dataset no encontrado" }, { status: 404 });
  const db = await readDb();
  db.datasets[id].semanticMap = { ...(db.datasets[id].semanticMap || {}), ...mapping };
  await writeDb(db);
  return NextResponse.json({ ok: true, semanticMap: db.datasets[id].semanticMap });
}
