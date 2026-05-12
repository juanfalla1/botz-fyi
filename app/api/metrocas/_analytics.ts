import { getServiceSupabase } from "@/app/api/_utils/supabase";

export type SalesFact = {
  amount: number;
  qty: number;
  date: string;
  month: string;
  city: string;
  branch: string;
  segment: string;
  customer: string;
  category: string;
  line: string;
  product: string;
  unitPrice: number;
};

function toNum(v: unknown) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function norm(v: unknown, fallback: string) {
  const s = String(v || "").trim();
  return s || fallback;
}

function isoDate(v: unknown) {
  const s = String(v || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
}

export async function fetchSalesFacts(params: { datasetId: string; tenantId: string | null }) {
  const svc = getServiceSupabase();
  if (!svc) throw new Error("Supabase no configurado");

  const batchSize = 1000;
  let offset = 0;
  const rows: any[] = [];
  while (true) {
    let q = svc
      .from("metrocas_sales_records")
      .select("*")
      .eq("dataset_id", params.datasetId)
      .range(offset, offset + batchSize - 1);
    q = params.tenantId ? q.eq("tenant_id", params.tenantId) : q.is("tenant_id", null);
    const page = await q;
    if (page.error) throw new Error(page.error.message);
    const list = page.data || [];
    rows.push(...list);
    if (list.length < batchSize) break;
    offset += batchSize;
    if (offset > 500000) break;
  }

  const facts: SalesFact[] = rows.map((row) => {
    const raw = row.raw_data || {};
    const amount = toNum(row.balance ?? row.total_sale ?? row.amount_currency ?? raw.balance ?? raw.total_sale ?? raw.total_venta);
    const qty = toNum(row.quantity ?? raw.quantity ?? raw.cantidad);
    const date =
      isoDate(row.sale_date) ||
      isoDate(row.invoice_date) ||
      isoDate(raw.sale_date) ||
      isoDate(raw.invoice_date) ||
      isoDate(raw.fecha) ||
      "";
    const month = date ? date.slice(0, 7) : "Sin fecha";
    const category = norm(row.category ?? row.product_category ?? raw.category ?? raw.product_category ?? raw.categoria, "Sin categoria");
    const line = category.slice(0, 3).toUpperCase() || "OTR";
    const unitPrice = qty > 0 ? amount / qty : toNum(row.unit_price ?? raw.unit_price ?? raw.precio_unitario);
    return {
      amount,
      qty,
      date,
      month,
      city: norm(row.city ?? raw.city ?? raw.ciudad, "EN BLANCO"),
      branch: norm(row.journal ?? row.seller ?? row.channel ?? raw.journal ?? raw.canal, "SIN SEDE"),
      segment: norm(row.segment ?? raw.segment, "Sin segmento"),
      customer: norm(row.customer_name ?? raw.customer_name ?? raw.cliente, "Sin cliente"),
      category,
      line,
      product: norm(row.product_name ?? raw.product_name ?? raw.producto, "Sin producto"),
      unitPrice,
    };
  });

  return facts;
}

export function groupByDimension(facts: SalesFact[], key: keyof SalesFact) {
  const total = facts.reduce((a, f) => a + f.amount, 0);
  const map = new Map<string, { sales: number; qty: number; minPrice: number; maxPrice: number }>();
  facts.forEach((f) => {
    const k = String(f[key] || "N/A");
    const cur = map.get(k) || { sales: 0, qty: 0, minPrice: Number.POSITIVE_INFINITY, maxPrice: 0 };
    cur.sales += f.amount;
    cur.qty += f.qty;
    cur.minPrice = Math.min(cur.minPrice, f.unitPrice || Number.POSITIVE_INFINITY);
    cur.maxPrice = Math.max(cur.maxPrice, f.unitPrice || 0);
    map.set(k, cur);
  });
  return [...map.entries()]
    .map(([label, v]) => ({
      label,
      sales: v.sales,
      quantity: v.qty,
      participation: total > 0 ? v.sales / total : 0,
      avgPrice: v.qty > 0 ? v.sales / v.qty : 0,
      minPrice: Number.isFinite(v.minPrice) ? v.minPrice : 0,
      maxPrice: v.maxPrice,
    }))
    .sort((a, b) => b.sales - a.sales);
}
