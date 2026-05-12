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
    const byProduct = groupByDimension(facts, "product").slice(0, 100);
    const byCategory = groupByDimension(facts, "category").slice(0, 50);
    const bySegment = groupByDimension(facts, "segment").slice(0, 50);
    const byCity = groupByDimension(facts, "city").slice(0, 50);

    const alerts = byProduct
      .filter((p) => p.avgPrice > 0 && (p.maxPrice - p.minPrice) / p.avgPrice > 0.4)
      .slice(0, 20)
      .map((p) => ({
        type: "dispersion",
        product: p.label,
        avgPrice: p.avgPrice,
        minPrice: p.minPrice,
        maxPrice: p.maxPrice,
      }));

    return NextResponse.json({ ok: true, byProduct, byCategory, bySegment, byCity, alerts });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "Error prices" }, { status: 500 });
  }
}
