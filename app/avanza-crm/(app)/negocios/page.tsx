"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Deal, DealActivity, Stage, createId, loadDeals, loadStages, money, saveDeals } from "../../_lib/deals";

const QUICK_TYPES: DealActivity["type"][] = ["Actividad", "WhatsApp", "Comentario", "Correo", "Documento", "Cotizacion"];

export default function AvanzaNegociosPage() {
  const params = useSearchParams();
  const selectedId = params.get("deal") || "";

  const [allDeals, setAllDeals] = useState<Deal[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [activeDealId, setActiveDealId] = useState("");
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityType, setActivityType] = useState<DealActivity["type"]>("Actividad");
  const [activitySubject, setActivitySubject] = useState("");
  const [activityDate, setActivityDate] = useState("");
  const [activityTime, setActivityTime] = useState("");
  const [activityNotes, setActivityNotes] = useState("");

  useEffect(() => {
    const deals = loadDeals();
    const currentStages = loadStages();
    setStages(currentStages);
    setAllDeals(deals);
    setActiveDealId(selectedId || deals[0]?.id || "");
  }, [selectedId]);

  const activeDeal = useMemo(() => allDeals.find((d) => d.id === activeDealId) || null, [allDeals, activeDealId]);

  const saveActivity = () => {
    if (!activeDeal) return;
    const nextActivity: DealActivity = {
      id: createId("act"),
      type: activityType,
      subject: activitySubject.trim() || activityType,
      date: activityDate || new Date().toISOString().slice(0, 10),
      time: activityTime,
      notes: activityNotes,
    };

    const updatedDeals = allDeals.map((deal) =>
      deal.id === activeDeal.id ? { ...deal, activities: [nextActivity, ...(deal.activities || [])] } : deal
    );

    setAllDeals(updatedDeals);
    saveDeals(updatedDeals);
    setShowActivityModal(false);
    setActivityType("Actividad");
    setActivitySubject("");
    setActivityDate("");
    setActivityTime("");
    setActivityNotes("");
  };

  if (!activeDeal) {
    return (
      <section style={{ background: "#ffffff", border: "1px solid #d8dee6", borderRadius: 10, padding: 16 }}>
        No hay negocios creados aun. Crea uno desde la casita.
      </section>
    );
  }

  const currentStageIndex = Math.max(0, stages.findIndex((s) => s.id === activeDeal.stage));
  const timelineRows = (activeDeal.activities || []).map((a) => ({
    ...a,
    icon: a.type === "Correo" ? "✉" : a.type === "Documento" ? "📄" : a.type === "Cotizacion" ? "🧾" : "📅",
  }));

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <section style={{ background: "#ffffff", border: "1px solid #d8dee6", borderRadius: 8, padding: "10px 14px", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ fontSize: 28 }}>💰</div>
        <div style={{ display: "grid", gap: 2 }}>
          <div style={{ fontWeight: 800, fontSize: 28 }}>{activeDeal.businessName}</div>
          <div style={{ fontSize: 28 }}>{money(activeDeal.totalOrderAmount)}</div>
          <div style={{ display: "flex", gap: 14, color: "#0f766e", fontWeight: 700 }}>
            <span>{activeDeal.contactName || "Sin contacto"}</span>
            <span>{activeDeal.company || "Sin empresa"}</span>
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "grid", justifyItems: "end", gap: 8 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ border: "none", background: "#22b8aa", color: "#fff", borderRadius: 6, padding: "8px 16px", fontWeight: 800 }}>Ganado</button>
            <button style={{ border: "none", background: "#ef4444", color: "#fff", borderRadius: 6, padding: "8px 16px", fontWeight: 800 }}>Perdido</button>
          </div>
          <div style={{ color: "#111827", fontWeight: 700 }}>{new Date(activeDeal.estimatedCloseDate || Date.now()).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}</div>
        </div>
      </section>

      <section style={{ background: "#ffffff", border: "1px solid #d8dee6", borderRadius: 8, padding: 8, display: "grid", gridTemplateColumns: `repeat(${Math.max(1, stages.length)}, minmax(150px, 1fr))`, gap: 0 }}>
        {stages.map((s, idx) => {
          const active = idx <= currentStageIndex;
          return (
            <div
              key={s.id}
              style={{
                clipPath: idx === stages.length - 1 ? "none" : "polygon(0 0, calc(100% - 18px) 0, 100% 50%, calc(100% - 18px) 100%, 0 100%, 18px 50%)",
                marginRight: idx === stages.length - 1 ? 0 : -8,
                zIndex: stages.length - idx,
                background: active ? "#38c6b5" : "#eceef2",
                color: active ? "#fff" : "#374151",
                padding: "12px 18px",
                fontWeight: 700,
              }}
            >
              {s.label}{idx === currentStageIndex ? " 1 Dias" : ""}
            </div>
          );
        })}
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
        <div style={{ display: "grid", gap: 10 }}>
          <section style={{ background: "#ffffff", border: "1px solid #d8dee6", borderRadius: 10, padding: 12 }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}><div style={{ fontWeight: 800 }}>Detalles del negocio</div><button style={{ marginLeft: "auto", border: "1px solid #cbd5e1", background: "#fff", borderRadius: 6, padding: "4px 10px" }}>Ver mas</button></div>
            <div style={{ display: "grid", gridTemplateColumns: "170px 1fr", rowGap: 6, columnGap: 8, fontSize: 14 }}>
              <span style={{ color: "#6b7280" }}>Origen</span><span>{activeDeal.contactOrigin || "-"}</span>
              <span style={{ color: "#6b7280" }}>Linea de negocio</span><span>{activeDeal.lineOfBusiness || "-"}</span>
              <span style={{ color: "#6b7280" }}>Asignado a</span><span style={{ color: "#0f766e" }}>{activeDeal.assignedTo || "-"}</span>
              <span style={{ color: "#6b7280" }}>Origen del negocio</span><span>{activeDeal.businessOrigin || "-"}</span>
              <span style={{ color: "#6b7280" }}>Fecha estimada</span><span>{activeDeal.estimatedCloseDate || "-"}</span>
              <span style={{ color: "#6b7280" }}>Descripcion</span><span>{activeDeal.description || "-"}</span>
            </div>
          </section>

          <section style={{ background: "#ffffff", border: "1px solid #d8dee6", borderRadius: 10, padding: 12 }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}><div style={{ fontWeight: 800 }}>Contactos relacionados</div><button style={{ marginLeft: "auto", border: "1px solid #cbd5e1", background: "#fff", borderRadius: 6, padding: "4px 10px" }}>Ver mas</button></div>
            <div style={{ display: "grid", gridTemplateColumns: "170px 1fr", rowGap: 6, columnGap: 8, fontSize: 14 }}>
              <span style={{ color: "#6b7280" }}>Contacto</span><span>{activeDeal.contactName || "-"}</span>
              <span style={{ color: "#6b7280" }}>Correo</span><span>{activeDeal.email || "-"}</span>
              <span style={{ color: "#6b7280" }}>Celular</span><span>{activeDeal.phone || "-"}</span>
            </div>
          </section>

          <section style={{ background: "#ffffff", border: "1px solid #d8dee6", borderRadius: 10, padding: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Empresa</div>
            <div style={{ display: "grid", gridTemplateColumns: "170px 1fr", rowGap: 6, columnGap: 8, fontSize: 14 }}>
              <span style={{ color: "#6b7280" }}>Empresa</span><span>{activeDeal.company || "-"}</span>
              <span style={{ color: "#6b7280" }}>NIT</span><span>-</span>
              <span style={{ color: "#6b7280" }}>Actividad del cliente</span><span>-</span>
              <span style={{ color: "#6b7280" }}>Correo</span><span>{activeDeal.email || "-"}</span>
              <span style={{ color: "#6b7280" }}>Asignado a</span><span>{activeDeal.assignedTo || "-"}</span>
              <span style={{ color: "#6b7280" }}>Origen del cliente</span><span>{activeDeal.contactOrigin || "-"}</span>
              <span style={{ color: "#6b7280" }}>Pais</span><span>{activeDeal.country || "-"}</span>
            </div>
          </section>
        </div>

        <section style={{ background: "#ffffff", border: "1px solid #d8dee6", borderRadius: 10, padding: 12, display: "grid", gap: 10 }}>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", color: "#0f766e", fontWeight: 700, borderBottom: "1px solid #d1d5db", paddingBottom: 4 }}>
            <span style={{ color: "#111827" }}>Cronologia</span>
            <span>Actividades</span>
            <span>Documentos</span>
            <span>Cotizaciones</span>
            <span>Productos</span>
            <span>Pedidos</span>
            <span>Correos</span>
            <span>Empresas</span>
            <span>Comentarios</span>
            <span>Actualizaciones</span>
          </div>

          <div style={{ display: "grid", justifyItems: "center", gap: 10 }}>
            <div style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "4px 18px", fontWeight: 700, background: "#f8fafc" }}>Planeado</div>
            <button onClick={() => setShowActivityModal(true)} style={{ border: "1px solid #cbd5e1", background: "#f9fafb", borderRadius: 6, padding: "8px 12px", fontWeight: 700, cursor: "pointer" }}>
              + Agregar actividad
            </button>
            <div style={{ border: "1px solid #e5e7eb", width: "100%", height: 54, display: "grid", placeItems: "center", color: "#6b7280" }}>Actividades realizadas</div>
            <div style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "4px 18px", fontWeight: 700, background: "#f8fafc" }}>Realizado</div>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            {timelineRows.map((a) => (
              <article key={a.id} style={{ border: "1px solid #e5e7eb", borderRadius: 4, padding: "10px 12px", display: "grid", gridTemplateColumns: "50px 1fr auto", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 28 }}>{a.icon}</div>
                <div>
                  <div style={{ color: "#0f766e", fontWeight: 700 }}>{a.type}</div>
                  <div style={{ color: "#111827", marginTop: 2 }}>{a.subject}</div>
                  {a.notes ? <div style={{ color: "#4b5563", marginTop: 2 }}>{a.notes}</div> : null}
                </div>
                <div style={{ textAlign: "right", minWidth: 120 }}>
                  <div style={{ color: "#111827", fontWeight: 700 }}>Hoy</div>
                  <div style={{ color: "#111827" }}>{a.time || "11:56 AM"}</div>
                </div>
              </article>
            ))}
            {timelineRows.length === 0 ? <div style={{ color: "#9ca3af" }}>Sin actividades registradas.</div> : null}
          </div>
        </section>
      </div>

      {showActivityModal ? (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.32)", zIndex: 3200, display: "grid", placeItems: "center", padding: 16 }}>
          <section style={{ width: "min(920px, 96vw)", maxHeight: "90vh", overflow: "auto", background: "#ffffff", border: "1px solid #d1d5db", borderRadius: 8 }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid #e5e7eb", fontWeight: 800, display: "flex" }}>
              Creando nueva actividad
              <button onClick={() => setShowActivityModal(false)} style={{ marginLeft: "auto", border: "none", background: "transparent", color: "#9ca3af", fontSize: 18, cursor: "pointer" }}>x</button>
            </div>
            <div style={{ padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span>* Tipo de actividad</span>
                <select value={activityType} onChange={(e) => setActivityType(e.target.value as DealActivity["type"])} style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "8px 10px" }}>
                  {QUICK_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span>* Asunto</span>
                <input value={activitySubject} onChange={(e) => setActivitySubject(e.target.value)} style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "8px 10px" }} />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span>* Fecha</span>
                <input type="date" value={activityDate} onChange={(e) => setActivityDate(e.target.value)} style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "8px 10px" }} />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Hora</span>
                <input type="time" value={activityTime} onChange={(e) => setActivityTime(e.target.value)} style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "8px 10px" }} />
              </label>
              <label style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>
                <span>Descripcion</span>
                <textarea value={activityNotes} onChange={(e) => setActivityNotes(e.target.value)} rows={4} style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "8px 10px", resize: "vertical" }} />
              </label>
            </div>
            <div style={{ borderTop: "1px solid #e5e7eb", padding: 12, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setShowActivityModal(false)} style={{ border: "none", background: "transparent", color: "#b91c1c", fontWeight: 700, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={saveActivity} style={{ border: "none", background: "#22b8aa", color: "#fff", borderRadius: 6, padding: "8px 14px", fontWeight: 800, cursor: "pointer" }}>
                Guardar
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
