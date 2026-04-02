"use client";

import { useMemo, useState } from "react";

type Deal = { name: string; company: string; value: string };
type Stage = { id: string; title: string; amount: string; deals: Deal[] };

const STAGES: Stage[] = [
  {
    id: "analisis",
    title: "Analisis de necesidad",
    amount: "$ 0",
    deals: [
      { name: "Suministro bascula", company: "Prospecto nuevo", value: "$ 0" },
      { name: "Servicio de calibracion", company: "Cliente activo", value: "$ 0" },
    ],
  },
  {
    id: "estudio",
    title: "Estudio",
    amount: "$ 0",
    deals: [
      { name: "Suministro balanza", company: "Laboratorio C&R", value: "$ 0" },
      { name: "Determinador de humedad", company: "Earth Essentials", value: "$ 0" },
    ],
  },
  {
    id: "cotizacion",
    title: "Cotizacion",
    amount: "$ 0",
    deals: [
      { name: "Servicio metrologico", company: "Fisicoquimica Integral", value: "$ 0" },
      { name: "Suministro equipos", company: "Amtex", value: "$ 0" },
    ],
  },
];

export default function AvanzaInicioPage() {
  const [activeTab, setActiveTab] = useState<"pipeline" | "create">("pipeline");

  const totalDeals = useMemo(() => STAGES.reduce((acc, stage) => acc + stage.deals.length, 0), []);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <section style={{ background: "#ffffff", border: "1px solid #d8dee6", borderRadius: 10, padding: 12, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button
            onClick={() => setActiveTab("create")}
            style={{
              background: activeTab === "create" ? "#ff7a00" : "#fff3e6",
              color: activeTab === "create" ? "#fff" : "#92400e",
              border: "1px solid #f59e0b",
              borderRadius: 10,
              padding: "8px 14px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Crear negocio
          </button>
          <button
            onClick={() => setActiveTab("pipeline")}
            style={{
              background: activeTab === "pipeline" ? "#22b8aa" : "#e8fbf8",
              color: activeTab === "pipeline" ? "#083b36" : "#0f766e",
              border: "1px solid #7fe1d7",
              borderRadius: 10,
              padding: "8px 14px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Pipeline
          </button>
          <input
            placeholder="Escribe la palabra"
            style={{ minWidth: 240, flex: "1 1 320px", borderRadius: 20, border: "1px solid #d8dee6", padding: "8px 12px" }}
          />
          <div style={{ marginLeft: "auto", color: "#374151", fontWeight: 800 }}>$ 0 | {totalDeals} Negocios</div>
        </div>
      </section>

      {activeTab === "pipeline" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 10, alignItems: "start" }}>
          {STAGES.map((stage) => (
            <section key={stage.id} style={{ background: "#eef1f6", border: "1px solid #d8dee6", borderRadius: 10, padding: 8, display: "grid", gap: 8 }}>
              <div style={{ borderRadius: 8, background: "#e7ebf3", padding: "10px 10px", border: "1px solid #d8dee6" }}>
                <div style={{ fontWeight: 800, color: "#2d3748", fontSize: 14 }}>{stage.title}</div>
                <div style={{ color: "#6b7280", fontSize: 12 }}>{stage.amount}</div>
              </div>

              {stage.deals.map((deal) => (
                <article key={`${stage.id}-${deal.name}`} style={{ background: "#ffffff", border: "1px solid #d8dee6", borderRadius: 8, padding: "8px 10px", display: "grid", gap: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <strong style={{ fontSize: 12, color: "#2d3748" }}>{deal.name}</strong>
                    <span style={{ fontSize: 12, color: "#4b5563", whiteSpace: "nowrap" }}>{deal.value}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>{deal.company}</div>
                </article>
              ))}
            </section>
          ))}
        </div>
      ) : (
        <section style={{ background: "#ffffff", border: "1px solid #d8dee6", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ background: "#22b8aa", color: "#ffffff", fontWeight: 800, padding: "10px 14px" }}>Crear negocio</div>
          <div style={{ padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ display: "grid", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 13, color: "#374151", fontWeight: 700 }}>Contacto</span>
                <input placeholder="Nombre del contacto relacionado" style={{ border: "1px solid #d8dee6", borderRadius: 6, padding: "8px 10px" }} />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 13, color: "#374151", fontWeight: 700 }}>Empresa</span>
                <input placeholder="Nombre de la empresa relacionada" style={{ border: "1px solid #d8dee6", borderRadius: 6, padding: "8px 10px" }} />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 13, color: "#374151", fontWeight: 700 }}>Negocio</span>
                <input placeholder="Nombre del negocio" style={{ border: "1px solid #d8dee6", borderRadius: 6, padding: "8px 10px" }} />
              </label>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 13, color: "#374151", fontWeight: 700 }}>Correo</span>
                <input placeholder="correo@empresa.com" style={{ border: "1px solid #d8dee6", borderRadius: 6, padding: "8px 10px" }} />
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 13, color: "#374151", fontWeight: 700 }}>Celular</span>
                  <input placeholder="3001234567" style={{ border: "1px solid #d8dee6", borderRadius: 6, padding: "8px 10px" }} />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 13, color: "#374151", fontWeight: 700 }}>Origen de contacto</span>
                  <select style={{ border: "1px solid #d8dee6", borderRadius: 6, padding: "8px 10px" }}>
                    <option>Selecciona una opcion</option>
                  </select>
                </label>
              </div>
            </div>
          </div>
          <div style={{ borderTop: "1px solid #e5e7eb", padding: 12, display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button style={{ border: "1px solid #d1d5db", background: "#ffffff", color: "#6b7280", borderRadius: 6, padding: "8px 12px", fontWeight: 700, cursor: "pointer" }}>
              Cancelar
            </button>
            <button style={{ border: "none", background: "#ff7a00", color: "#ffffff", borderRadius: 6, padding: "8px 14px", fontWeight: 800, cursor: "pointer" }}>
              Continuar
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
