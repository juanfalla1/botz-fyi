"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import s from "@/app/metrocas/ui/metrocas-theme.module.css";

const box = { height: 300, width: "100%" } as const;

export function UniversalVisualDashboard({ datasetId }: { datasetId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let on = true;
    (async () => {
      setLoading(true);
      const r = await fetch(`/api/datasets/${encodeURIComponent(datasetId)}/visual-dashboard`);
      const j = await r.json();
      if (on) setData(j);
      if (on) setLoading(false);
    })();
    return () => {
      on = false;
    };
  }, [datasetId]);

  if (loading) return <div className={`${s.container} ${s.lightSurface}`} style={{ padding: 20 }}>Cargando analisis visual...</div>;
  if (!data || data.error) return <div className={`${s.container} ${s.lightSurface}`} style={{ padding: 20 }}>No se pudo cargar el dashboard universal.</div>;

  return (
    <main className={`${s.metrocasRoot} ${s.lightSurface}`}>
      <div className={s.container} style={{ padding: "18px 0 34px" }}>
        <section className={s.executiveHero}>
          <div>
            <p className={s.eyebrow}>Universal Analytics</p>
            <h1 className={s.sectionTitle} style={{ marginBottom: 6 }}>Dashboard Ejecutivo</h1>
            <p className={s.muted}>Dataset universal: {data.dataset_name}</p>
          </div>
        </section>

        <section className={s.grid4}>
          <article className={s.card}><p className={s.kpiLabel}>Ventas</p><p className={s.kpiValue}>{Number(data?.kpis?.totalSales || 0).toLocaleString("es-CO")}</p></article>
          <article className={s.card}><p className={s.kpiLabel}>Unidades</p><p className={s.kpiValue}>{Number(data?.kpis?.units || 0).toLocaleString("es-CO")}</p></article>
          <article className={s.card}><p className={s.kpiLabel}>Clientes activos</p><p className={s.kpiValue}>{Number(data?.kpis?.activeCustomers || 0).toLocaleString("es-CO")}</p></article>
          <article className={s.card}><p className={s.kpiLabel}>Ticket promedio</p><p className={s.kpiValue}>{Number(data?.kpis?.avgTicket || 0).toLocaleString("es-CO")}</p></article>
        </section>

        <section className={s.grid2} style={{ marginTop: 12 }}>
          <div className={s.card}>
            <h3 style={{ marginTop: 0 }}>Ventas por mes</h3>
            <div style={box}><ResponsiveContainer width="100%" height="100%"><LineChart data={data.monthlySales}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="period" /><YAxis /><Tooltip formatter={(v: any) => Number(v).toLocaleString("es-CO")} /><Line type="monotone" dataKey="sales" stroke="#2563eb" /></LineChart></ResponsiveContainer></div>
          </div>
          <div className={s.card}>
            <h3 style={{ marginTop: 0 }}>Ventas por categoria</h3>
            <div style={box}><ResponsiveContainer width="100%" height="100%"><BarChart data={data.salesByCategory}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis /><Tooltip formatter={(v: any) => Number(v).toLocaleString("es-CO")} /><Bar dataKey="sales" fill="#0ea5e9" /></BarChart></ResponsiveContainer></div>
          </div>
        </section>
      </div>
    </main>
  );
}
