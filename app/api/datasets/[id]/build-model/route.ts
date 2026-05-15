import { NextResponse } from "next/server";
import { getDataset } from "@/app/api/_intelligence/shared";
import { readDb, writeDb } from "@/app/lib/intelligence/store";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const ds = await getDataset(id);
  if (!ds) return NextResponse.json({ error: "Dataset no encontrado" }, { status: 404 });
  const db = await readDb();
  db.datasets[id].modelBuilt = true;
  db.datasets[id].canonical = {
    facts_sales: ds.facts.map((f: any) => ({
      date: f.date,
      month: f.month,
      revenue: f.revenue,
      quantity: f.quantity,
      customer: f.customer,
      product: f.product,
      category: f.category,
      seller: f.seller,
      city: f.city,
    })),
  };
  await writeDb(db);
  return NextResponse.json({ ok: true, dataset_id: id, model: ["facts_sales", "dim_date", "dim_product", "dim_customer", "dim_seller", "dim_location"] });
}
