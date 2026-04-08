"use client";

import { type ReactNode, useMemo, useState } from "react";
import { money } from "../../_lib/deals";

const USER_FILTERS = [
  "Mariana Rodriguez",
  "Carmenza Vanegas",
  "Natalia Espinoza",
  "Carolina Varon",
  "Milena Bolanos",
];

const PIE_ROWS = [
  { label: "Visita", value: 2, color: "#2f6db3" },
  { label: "Envio portafolio", value: 4, color: "#ff6b57" },
  { label: "Actividades administrativas", value: 19, color: "#49bca8" },
  { label: "Whatsapp", value: 2, color: "#7a7a7a" },
  { label: "Correo", value: 18, color: "#f4b221" },
];

const STAGE_ROWS = [
  { label: "Analisis de Necesidad", count: 1, value: 108377000 },
  { label: "Estudio", count: 0, value: 0 },
  { label: "Cotizacion", count: 9, value: 178755000 },
  { label: "Orden de Compra", count: 0, value: 0 },
];

function WidgetBox({
  title,
  filter,
  onFilter,
  children,
}: {
  title: string;
  filter: string;
  onFilter: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <section style={{ border: "1px solid #cfd5dd", background: "#fff" }}>
      <header style={{ display: "grid", gridTemplateColumns: "1fr 260px auto", gap: 10, alignItems: "center", padding: "8px 10px", borderBottom: "1px solid #dbe1e8" }}>
        <div style={{ fontWeight: 700 }}>{title}</div>
        <select value={filter} onChange={(e) => onFilter(e.target.value)} style={{ border: "1px solid #bfc7d2", height: 30, padding: "0 8px", background: "#fff" }}>
          {USER_FILTERS.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
        <div style={{ display: "flex", gap: 6, color: "#111827", fontSize: 14 }}>
          <span>✉</span>
          <span>✎</span>
          <span>⬏</span>
          <span>✖</span>
        </div>
      </header>
      <div style={{ padding: 10 }}>{children}</div>
    </section>
  );
}

export default function AvanzaDashboardPage() {
  const [activityUser, setActivityUser] = useState(USER_FILTERS[3]);
  const [budgetUser, setBudgetUser] = useState(USER_FILTERS[0]);
  const [stageUser, setStageUser] = useState(USER_FILTERS[2]);

  const pieTotal = useMemo(() => PIE_ROWS.reduce((acc, item) => acc + item.value, 0), []);
  const stageTotal = useMemo(() => STAGE_ROWS.reduce((acc, item) => acc + item.value, 0), []);
  const stageMax = useMemo(() => Math.max(...STAGE_ROWS.map((item) => item.value), 1), []);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <section style={{ display: "flex", justifyContent: "flex-end" }}>
        <select style={{ border: "1px solid #bfc7d2", height: 30, minWidth: 170, background: "#fff", padding: "0 8px" }}>
          <option>Agregar widget</option>
          <option>Historico</option>
          <option>Actividades programadas</option>
          <option>Embudo</option>
          <option>Actividades pendientes</option>
          <option>Metricas por modulo</option>
          <option>Administrador de widgets</option>
        </select>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <WidgetBox title="Actividades" filter={activityUser} onFilter={setActivityUser}>
          <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", alignItems: "center", minHeight: 220 }}>
            <div
              style={{
                width: 210,
                height: 210,
                borderRadius: "50%",
                background:
                  "conic-gradient(#f4b221 0 40%, #7a7a7a 40% 44%, #49bca8 44% 80%, #ff6b57 80% 89%, #2f6db3 89% 100%)",
                margin: "0 auto",
              }}
            />
            <div style={{ display: "grid", gap: 7, fontSize: 13 }}>
              {PIE_ROWS.map((row) => (
                <div key={row.label} style={{ display: "grid", gridTemplateColumns: "14px 1fr auto", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 12, height: 12, background: row.color, display: "inline-block" }} />
                  <span>{row.label}</span>
                  <strong>{row.value}</strong>
                </div>
              ))}
              <div style={{ marginTop: 6, color: "#6b7280" }}>Total: {pieTotal}</div>
            </div>
          </div>
        </WidgetBox>

        <WidgetBox title="Grafico de presupuesto por usuario" filter={budgetUser} onFilter={setBudgetUser}>
          <div style={{ border: "1px solid #dbe1e8", overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr 1fr", background: "#1f5e9f", color: "#fff", fontSize: 13, fontWeight: 700 }}>
              <div style={{ padding: 7 }}>Usuario</div>
              <div style={{ padding: 7 }}>Valor Ganados</div>
              <div style={{ padding: 7 }}>Valor Presupuesto</div>
              <div style={{ padding: 7 }}>Valor Pendientes</div>
              <div style={{ padding: 7 }}>Cumplimiento</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr 1fr", fontSize: 13 }}>
              <div style={{ padding: 8 }}>{budgetUser}</div>
              <div style={{ padding: 8 }}>33.205.572</div>
              <div style={{ padding: 8 }}>125.000.000</div>
              <div style={{ padding: 8 }}>1.073.425.647</div>
              <div style={{ padding: 8 }}>26,56%</div>
            </div>
          </div>
          <div style={{ marginTop: 10, minHeight: 180, border: "1px solid #dbe1e8", position: "relative", background: "repeating-linear-gradient(to top,#f8fafc 0,#f8fafc 35px,#e5e7eb 35px,#e5e7eb 36px)" }}>
            <div style={{ position: "absolute", left: "32%", bottom: 0, width: 120, height: 155, background: "linear-gradient(90deg,#d6d3d1,#bfbfbf)", border: "1px solid #9ca3af" }} />
          </div>
        </WidgetBox>
      </section>

      <WidgetBox title="Negocios por fase de venta" filter={stageUser} onFilter={setStageUser}>
        <div style={{ textAlign: "center", color: "#6b7280", marginBottom: 8 }}>Total: {money(stageTotal)}</div>
        <div style={{ display: "grid", gap: 10 }}>
          {STAGE_ROWS.map((row) => (
            <div key={row.label} style={{ display: "grid", gridTemplateColumns: "220px 1fr auto", gap: 10, alignItems: "center" }}>
              <div style={{ fontSize: 14 }}>{row.label}({row.count})</div>
              <div style={{ height: 24, border: "1px solid #d1d5db", background: "#fff" }}>
                <div style={{ height: "100%", width: `${(row.value / stageMax) * 100}%`, background: "linear-gradient(180deg,#f59e0b,#f97316)" }} />
              </div>
              <div style={{ minWidth: 120, textAlign: "right", fontSize: 14 }}>{money(row.value)}</div>
            </div>
          ))}
        </div>
      </WidgetBox>
    </div>
  );
}
