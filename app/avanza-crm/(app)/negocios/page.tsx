"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Deal, DealActivity, STAGES, createId, loadDeals, money, saveDeals } from "../../_lib/deals";

const QUICK_TYPES: DealActivity["type"][] = ["Actividad", "WhatsApp", "Comentario", "Correo", "Documento", "Cotizacion"];

export default function AvanzaNegociosPage() {
  const params = useSearchParams();
  const selectedId = params.get("deal") || "";

  const [allDeals, setAllDeals] = useState<Deal[]>([]);
  const [activeDealId, setActiveDealId] = useState("");
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityType, setActivityType] = useState<DealActivity["type"]>("Actividad");
  const [activitySubject, setActivitySubject] = useState("");
  const [activityDate, setActivityDate] = useState("");
  const [activityTime, setActivityTime] = useState("");
  const [activityNotes, setActivityNotes] = useState("");

  useEffect(() => {
    const deals = loadDeals();
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

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <section style={{ background: "#ffffff", border: "1px solid #d8dee6", borderRadius: 10, padding: 12, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ fontSize: 22 }}>💰</div>
        <div>
          <div style={{ fontWeight: 800 }}>{activeDeal.businessName}</div>
          <div style={{ color: "#4b5563", marginTop: 2 }}>{money(activeDeal.totalOrderAmount)}</div>
          <div style={{ color: "#0f766e", marginTop: 2 }}>{activeDeal.contactName || "Sin contacto"}</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button style={{ border: "none", background: "#22b8aa", color: "#fff", borderRadius: 6, padding: "8px 14px", fontWeight: 800 }}>Ganado</button>
          <button style={{ border: "none", background: "#ef4444", color: "#fff", borderRadius: 6, padding: "8px 14px", fontWeight: 800 }}>Perdido</button>
        </div>
      </section>

      <section style={{ background: "#ffffff", border: "1px solid #d8dee6", borderRadius: 10, padding: 8, display: "grid", gridTemplateColumns: `repeat(${STAGES.length},1fr)`, gap: 6 }}>
        {STAGES.map((s) => {
          const active = s.id === activeDeal.stage;
          return (
            <div key={s.id} style={{ borderRadius: 4, padding: "10px 12px", fontWeight: 700, background: active ? "#38c6b5" : "#eceef2", color: active ? "#fff" : "#374151" }}>
              {s.label}
            </div>
          );
        })}
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.7fr", gap: 10 }}>
        <div style={{ display: "grid", gap: 10 }}>
          <section style={{ background: "#ffffff", border: "1px solid #d8dee6", borderRadius: 10, padding: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Detalles del negocio</div>
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
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Contactos relacionados</div>
            <div style={{ display: "grid", gridTemplateColumns: "170px 1fr", rowGap: 6, columnGap: 8, fontSize: 14 }}>
              <span style={{ color: "#6b7280" }}>Contacto</span><span>{activeDeal.contactName || "-"}</span>
              <span style={{ color: "#6b7280" }}>Correo</span><span>{activeDeal.email || "-"}</span>
              <span style={{ color: "#6b7280" }}>Celular</span><span>{activeDeal.phone || "-"}</span>
            </div>
          </section>

          <section style={{ background: "#ffffff", border: "1px solid #d8dee6", borderRadius: 10, padding: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Empresa</div>
            <div>{activeDeal.company || "-"}</div>
          </section>
        </div>

        <section style={{ background: "#ffffff", border: "1px solid #d8dee6", borderRadius: 10, padding: 12, display: "grid", gap: 10 }}>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", color: "#0f766e", fontWeight: 700 }}>
            <span style={{ color: "#111827" }}>Cronologia</span>
            <span>Actividades</span>
            <span>Documentos</span>
            <span>Correos</span>
            <span>Comentarios</span>
            <span>Actualizaciones</span>
          </div>

          <div style={{ display: "flex", justifyContent: "center" }}>
            <button onClick={() => setShowActivityModal(true)} style={{ border: "1px solid #cbd5e1", background: "#f9fafb", borderRadius: 6, padding: "8px 12px", fontWeight: 700, cursor: "pointer" }}>
              + Agregar actividad
            </button>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            {(activeDeal.activities || []).map((a) => (
              <article key={a.id} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontWeight: 700 }}>{a.type} - {a.subject}</div>
                <div style={{ color: "#6b7280", fontSize: 13, marginTop: 3 }}>{a.date}{a.time ? ` ${a.time}` : ""}</div>
                {a.notes ? <div style={{ marginTop: 4 }}>{a.notes}</div> : null}
              </article>
            ))}
            {(activeDeal.activities || []).length === 0 ? <div style={{ color: "#9ca3af" }}>Sin actividades registradas.</div> : null}
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
