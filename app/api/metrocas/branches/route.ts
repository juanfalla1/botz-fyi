import { NextResponse } from "next/server";
import { resolveTenant } from "@/app/api/metrocas/_shared";
import { fetchSalesFacts, groupByDimension } from "@/app/api/metrocas/_analytics";

export async function GET(req: Request) {
  try {
    const access = await resolveTenant(req);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
    const datasetId = new URL(req.url).searchParams.get("dataset_id");
    if (!datasetId) return NextResponse.json({ error: "dataset_id es requerido" }, { status: 400 });
    const facts = await fetchSalesFacts({ datasetId, tenantId: access.tenantId || null });

    const ranking = groupByDimension(facts, "branch");
    const enriched = ranking.map((r) => {
      const bf = facts.filter((f) => f.branch === r.label);
      return {
        ...r,
        topSegments: groupByDimension(bf, "segment").slice(0, 5),
        topCustomers: groupByDimension(bf, "customer").slice(0, 5),
        topProducts: groupByDimension(bf, "product").slice(0, 5),
      };
    });
    return NextResponse.json({ ok: true, ranking: enriched });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "Error branches" }, { status: 500 });
  }
}
