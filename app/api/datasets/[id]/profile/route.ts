import { NextResponse } from "next/server";
import { getDataset } from "@/app/api/_intelligence/shared";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const ds = await getDataset(id);
  if (!ds) return NextResponse.json({ error: "Dataset no encontrado" }, { status: 404 });
  return NextResponse.json({
    profile: ds.profile,
    columns: ds.columns,
    semanticMap: ds.semanticMap,
    warnings: ds.profile?.warnings || [],
  });
}
