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

    const ranking = groupByDimension(facts, "segment");
    const total = facts.reduce((a, f) => a + f.amount, 0);
    const enriched = ranking.map((r) => {
      const segFacts = facts.filter((f) => f.segment === r.label);
      const topProducts = groupByDimension(segFacts, "product").slice(0, 5);
      const topCustomers = groupByDimension(segFacts, "customer").slice(0, 5);
      const topCities = groupByDimension(segFacts, "city").slice(0, 5);
      return { ...r, ticketAvg: segFacts.length ? r.sales / segFacts.length : 0, topProducts, topCustomers, topCities, concentration: total > 0 ? r.sales / total : 0 };
    });

    return NextResponse.json({ ok: true, ranking: enriched });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "Error segments" }, { status: 500 });
  }
}
