import { NextResponse } from "next/server";
import { getVisualDashboard } from "@/app/api/_intelligence/shared";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const data = await getVisualDashboard(id);
  if (!data) return NextResponse.json({ error: "Dataset no encontrado" }, { status: 404 });
  return NextResponse.json(data);
}
