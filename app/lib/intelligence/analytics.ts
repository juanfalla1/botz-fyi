export function aggregateKpis(facts: any[]) {
  const totalSales = facts.reduce((a, f) => a + Number(f.revenue || 0), 0);
  const units = facts.reduce((a, f) => a + Number(f.quantity || 0), 0);
  const activeCustomers = new Set(facts.map((f) => String(f.customer || "")).filter(Boolean)).size;
  const avgTicket = activeCustomers ? totalSales / activeCustomers : 0;
  return { totalSales, units, activeCustomers, avgTicket };
}

export function byMonth(facts: any[]) {
  const m = new Map<string, number>();
  for (const f of facts) {
    const key = String(f.month || "");
    if (!key) continue;
    m.set(key, (m.get(key) || 0) + Number(f.revenue || 0));
  }
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([month, revenue]) => ({ month, revenue }));
}

export function variance(facts: any[], dimension: string, fromMonth: string, toMonth: string) {
  const idx = new Map<string, { prev: number; curr: number }>();
  for (const f of facts) {
    const k = String(f[dimension] || "EN BLANCO");
    if (!idx.has(k)) idx.set(k, { prev: 0, curr: 0 });
    const row = idx.get(k)!;
    if (f.month === fromMonth) row.prev += Number(f.revenue || 0);
    if (f.month === toMonth) row.curr += Number(f.revenue || 0);
  }
  return [...idx.entries()].map(([name, v]) => {
    const delta = v.curr - v.prev;
    return { name, prev: v.prev, curr: v.curr, delta, deltaPct: v.prev ? (delta / v.prev) * 100 : 0 };
  }).sort((a, b) => b.delta - a.delta);
}

export function buildInsights(input: { kpis: any; warnings: string[]; varRows: any[] }) {
  const topUp = input.varRows[0];
  const topDown = [...input.varRows].sort((a, b) => a.delta - b.delta)[0];
  return {
    executive: `Ventas ${input.kpis.totalSales.toLocaleString("es-CO")} con ${input.kpis.activeCustomers} clientes activos.`,
    numeric_support: {
      total_sales: input.kpis.totalSales,
      avg_ticket: input.kpis.avgTicket,
      top_up: topUp ? { name: topUp.name, delta: topUp.delta } : null,
      top_down: topDown ? { name: topDown.name, delta: topDown.delta } : null,
    },
    quality_warnings: input.warnings,
    actions: [
      "Priorizar entidades con mayor caida para recuperacion comercial.",
      "Escalar replicacion de practicas en entidades con mayor alza.",
    ],
  };
}
