"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Deal, DealActivity, Stage, loadDeals, loadStages, money, saveDeals, saveStages } from "../../_lib/deals";

const QUICK_ACTIONS: Array<{ label: DealActivity["type"]; active: boolean }> = [
  { label: "Actividad", active: true },
  { label: "WhatsApp", active: true },
  { label: "Comentario", active: false },
  { label: "Correo", active: false },
  { label: "Documento", active: false },
  { label: "Cotizacion", active: false },
];

const EMAIL_TEMPLATES = [
  {
    id: "tpl-carmenza",
    name: "CARTA DE PRESENTACION CARMENZA",
    subject: "CARTA DE PRESENTACION AVANZA GROUP",
    body: "Hola,\n\nComparto nuestra carta de presentacion comercial para apoyo de tu proceso.\n\nQuedo atenta a cualquier comentario.\n",
  },
  {
    id: "tpl-natalia",
    name: "CARTA DE PRESENTACION NATALIA",
    subject: "CARTA DE PRESENTACION AVANZA GROUP",
    body: "Hola,\n\nTe envio carta de presentacion y portafolio para tu validacion.\n\nSaludos,\n",
  },
  {
    id: "tpl-feria",
    name: "INVITACION A LA FERIA ANDINA PACKI VIVE LA INNOVACION",
    subject: "INVITACION A LA FERIA ANDINA PACKI VIVE LA INNOVACION",
    body: "Hola,\n\nQueremos invitarte a la feria Andina Packi Vive la Innovacion.\n\nTe esperamos.\n",
  },
];

function makeStageId(label: string, existingIds: string[]): string {
  const base =
    label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "_") || "etapa";
  let next = base;
  let i = 2;
  while (existingIds.includes(next)) {
    next = `${base}_${i}`;
    i += 1;
  }
  return next;
}

export default function AvanzaInicioPage() {
  const router = useRouter();
  const [allDeals, setAllDeals] = useState<Deal[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [query, setQuery] = useState("");
  const [openQuickMenuDealId, setOpenQuickMenuDealId] = useState<string | null>(null);
  const [quickActionDealId, setQuickActionDealId] = useState<string | null>(null);
  const [quickActionType, setQuickActionType] = useState<DealActivity["type"] | null>(null);
  const [actionSubject, setActionSubject] = useState("");
  const [actionDate, setActionDate] = useState("");
  const [actionTime, setActionTime] = useState("");
  const [actionNotes, setActionNotes] = useState("");
  const [actionAmount, setActionAmount] = useState("");
  const [showEmailTemplates, setShowEmailTemplates] = useState(false);
  const [activityKind, setActivityKind] = useState("Llamada");
  const [activityStatus, setActivityStatus] = useState("Planeada");
  const [activityAssignedTo, setActivityAssignedTo] = useState("Usuario Gerente");
  const [activityDuration, setActivityDuration] = useState("00:15");
  const [quoteStatus, setQuoteStatus] = useState("Creado");
  const [quoteAssignedTo, setQuoteAssignedTo] = useState("Usuario Gerente");
  const [quotePaymentTerm, setQuotePaymentTerm] = useState("Seleccione una opcion");
  const [quoteItemName, setQuoteItemName] = useState("");
  const [quoteQty, setQuoteQty] = useState("1");
  const [quotePrice, setQuotePrice] = useState("0");
  const [dragDealId, setDragDealId] = useState<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);
  const [showStageManager, setShowStageManager] = useState(false);
  const [newStageName, setNewStageName] = useState("");

  useEffect(() => {
    const loadedStages = loadStages();
    const loadedDeals = loadDeals();
    const validIds = new Set(loadedStages.map((s) => s.id));
    const firstStage = loadedStages[0]?.id || "sin_contactar";
    const normalizedDeals = loadedDeals.map((deal) => ({
      ...deal,
      stage: validIds.has(deal.stage) ? deal.stage : firstStage,
    }));

    setStages(loadedStages);
    setAllDeals(normalizedDeals);
    if (normalizedDeals.length !== loadedDeals.length || normalizedDeals.some((d, i) => d.stage !== loadedDeals[i]?.stage)) {
      saveDeals(normalizedDeals);
    }
  }, []);

  const filteredDeals = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return allDeals;
    return allDeals.filter((d) => `${d.businessName} ${d.contactName} ${d.company}`.toLowerCase().includes(term));
  }, [allDeals, query]);

  const totals = useMemo(() => {
    const totalAmount = filteredDeals.reduce((sum, d) => sum + Number(d.totalOrderAmount || 0), 0);
    return { totalDeals: filteredDeals.length, totalAmount };
  }, [filteredDeals]);

  const columns = useMemo(
    () =>
      stages.map((stage) => ({
        stage,
        deals: filteredDeals.filter((deal) => deal.stage === stage.id),
      })),
    [filteredDeals, stages]
  );

  const quickDeal = useMemo(
    () => allDeals.find((deal) => deal.id === quickActionDealId) || null,
    [allDeals, quickActionDealId]
  );

  const updateStages = (nextStages: Stage[], nextDeals?: Deal[]) => {
    setStages(nextStages);
    saveStages(nextStages);
    if (nextDeals) {
      setAllDeals(nextDeals);
      saveDeals(nextDeals);
    }
  };

  const addStage = () => {
    const label = newStageName.trim();
    if (!label) return;
    const id = makeStageId(label, stages.map((s) => s.id));
    const next = [...stages, { id, label }];
    updateStages(next);
    setNewStageName("");
  };

  const renameStage = (stageId: string, label: string) => {
    const next = stages.map((s) => (s.id === stageId ? { ...s, label } : s));
    updateStages(next);
  };

  const removeStage = (stageId: string) => {
    if (stages.length <= 1) return;
    const remaining = stages.filter((s) => s.id !== stageId);
    const fallback = remaining[0].id;
    const nextDeals = allDeals.map((deal) => (deal.stage === stageId ? { ...deal, stage: fallback } : deal));
    updateStages(remaining, nextDeals);
  };

  const openQuickAction = (dealId: string, type: DealActivity["type"]) => {
    setQuickActionDealId(dealId);
    setQuickActionType(type);
    setActionSubject(type);
    setActionDate(new Date().toISOString().slice(0, 10));
    setActionTime("");
    setActionNotes("");
    setActionAmount("");
    setActivityKind("Llamada");
    setActivityStatus("Planeada");
    setActivityAssignedTo("Usuario Gerente");
    setActivityDuration("00:15");
    setQuoteStatus("Creado");
    setQuoteAssignedTo("Usuario Gerente");
    setQuotePaymentTerm("Seleccione una opcion");
    setQuoteItemName("");
    setQuoteQty("1");
    setQuotePrice("0");
  };

  const closeQuickAction = () => {
    setQuickActionDealId(null);
    setQuickActionType(null);
    setShowEmailTemplates(false);
  };

  const saveQuickAction = () => {
    if (!quickActionDealId || !quickActionType) return;
    const subject = actionSubject.trim() || quickActionType;
    const date = actionDate || new Date().toISOString().slice(0, 10);
    const note = quickActionType === "Cotizacion" && actionAmount ? `${actionNotes}\nMonto: ${money(Number(actionAmount || 0))}`.trim() : actionNotes;

    const activity: DealActivity = {
      id: `act-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      type: quickActionType,
      subject,
      date,
      time: actionTime,
      notes: note,
    };

    const updated = allDeals.map((deal) =>
      deal.id === quickActionDealId ? { ...deal, activities: [activity, ...(deal.activities || [])] } : deal
    );
    setAllDeals(updated);
    saveDeals(updated);

    closeQuickAction();
  };

  const moveDealToStage = (dealId: string, stageId: string) => {
    const source = allDeals.find((d) => d.id === dealId);
    if (!source || source.stage === stageId) return;
    const updated = allDeals.map((d) => (d.id === dealId ? { ...d, stage: stageId } : d));
    setAllDeals(updated);
    saveDeals(updated);
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <section style={{ background: "#ffffff", border: "1px solid #d8dee6", borderRadius: 10, padding: 12, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={() => setShowStageManager(true)} style={{ background: "#ffffff", color: "#334155", border: "1px solid #cbd5e1", borderRadius: 10, padding: "10px 14px", fontWeight: 700, cursor: "pointer" }}>
            Columnas
          </button>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Escribe la palabra" style={{ width: "min(340px, 100%)", borderRadius: 20, border: "1px solid #d8dee6", padding: "9px 14px" }} />
          <div style={{ marginLeft: "auto", color: "#374151", fontWeight: 800 }}>{money(totals.totalAmount)} | {totals.totalDeals} Negocios</div>
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(1, stages.length)}, minmax(250px, 1fr))`, gap: 12, alignItems: "start" }}>
        {columns.map(({ stage, deals }) => (
          <section
            key={stage.id}
            onDragOver={(e) => {
              e.preventDefault();
              if (dragOverStageId !== stage.id) setDragOverStageId(stage.id);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragDealId) moveDealToStage(dragDealId, stage.id);
              setDragDealId(null);
              setDragOverStageId(null);
            }}
            onDragLeave={() => {
              if (dragOverStageId === stage.id) setDragOverStageId(null);
            }}
            style={{
              flex: "0 0 320px",
              background: dragOverStageId === stage.id ? "#e0f5f2" : "#eef1f6",
              border: dragOverStageId === stage.id ? "1px solid #38c6b5" : "1px solid #d8dee6",
              borderRadius: 10,
              padding: 10,
              display: "grid",
              gap: 8,
              minHeight: 220,
            }}
          >
            <div style={{ borderRadius: 8, background: "#e7ebf3", padding: "10px 10px", border: "1px solid #d8dee6" }}>
              <div style={{ fontWeight: 800, color: "#2d3748", fontSize: 15 }}>{stage.label}</div>
              <div style={{ color: "#6b7280", fontSize: 12 }}>{money(deals.reduce((sum, d) => sum + Number(d.totalOrderAmount || 0), 0))} - {deals.length} Negocios</div>
            </div>

            {deals.map((deal) => (
              <article
                key={deal.id}
                draggable
                onDragStart={(e) => {
                  setDragDealId(deal.id);
                  e.dataTransfer.setData("text/plain", deal.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragEnd={() => {
                  setDragDealId(null);
                  setDragOverStageId(null);
                }}
                onClick={() => router.push(`/avanza-crm/negocios?deal=${deal.id}`)}
                style={{
                  background: "#ffffff",
                  border: "1px solid #d8dee6",
                  borderRadius: 8,
                  padding: "9px 10px",
                  display: "grid",
                  gap: 4,
                  cursor: "pointer",
                  textAlign: "left",
                  opacity: dragDealId === deal.id ? 0.65 : 1,
                  position: "relative",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <strong style={{ fontSize: 13, color: "#2d3748" }}>{deal.businessName}</strong>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, color: "#4b5563", whiteSpace: "nowrap" }}>{money(deal.totalOrderAmount)}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenQuickMenuDealId((prev) => (prev === deal.id ? null : deal.id));
                      }}
                      style={{
                        border: "1px solid #f87171",
                        background: "#fff",
                        color: "#ef4444",
                        borderRadius: 4,
                        width: 22,
                        height: 22,
                        lineHeight: "20px",
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>{deal.contactName || deal.company || "Sin contacto"}</div>

                {openQuickMenuDealId === deal.id ? (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: "absolute",
                      top: 34,
                      right: 10,
                      width: 200,
                      background: "#fff",
                      border: "1px solid #d1d5db",
                      borderRadius: 8,
                      boxShadow: "0 8px 24px rgba(15,23,42,0.18)",
                      padding: 8,
                      zIndex: 10,
                      display: "grid",
                      gap: 6,
                    }}
                  >
                    {QUICK_ACTIONS.map((item) => (
                      <button
                        key={item.label}
                        onClick={() => {
                          setOpenQuickMenuDealId(null);
                          openQuickAction(deal.id, item.label);
                        }}
                        style={{
                          border: "none",
                          background: "transparent",
                          textAlign: "left",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "4px 2px",
                          color: "#111827",
                        }}
                      >
                        <span
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 4,
                            border: `1px solid ${item.active ? "#f87171" : "#d1d5db"}`,
                            color: item.active ? "#ef4444" : "#9ca3af",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 800,
                            fontSize: 12,
                          }}
                        >
                          +
                        </span>
                        <span style={{ fontSize: 13 }}>{item.label}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}

            {deals.length === 0 ? <div style={{ fontSize: 12, color: "#9ca3af", padding: "4px 2px" }}>Sin negocios en esta etapa.</div> : null}
          </section>
        ))}
      </div>

      {showStageManager ? (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.35)", zIndex: 3100, display: "grid", placeItems: "center", padding: 16 }}>
          <section style={{ width: "min(680px, 96vw)", background: "#ffffff", border: "1px solid #d8dee6", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", background: "#334155", color: "#ffffff", fontWeight: 800, display: "flex", alignItems: "center" }}>
              Configurar columnas del kanban
              <button onClick={() => setShowStageManager(false)} style={{ marginLeft: "auto", border: "none", background: "transparent", color: "#fff", fontSize: 16, cursor: "pointer" }}>x</button>
            </div>
            <div style={{ padding: 14, display: "grid", gap: 10 }}>
              {stages.map((stage) => (
                <div key={stage.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center" }}>
                  <input value={stage.label} onChange={(e) => renameStage(stage.id, e.target.value)} style={{ border: "1px solid #d8dee6", borderRadius: 6, padding: "8px 10px" }} />
                  <button onClick={() => removeStage(stage.id)} disabled={stages.length <= 1} style={{ border: "1px solid #fecaca", color: "#b91c1c", background: "#fff", borderRadius: 6, padding: "8px 10px", cursor: stages.length <= 1 ? "not-allowed" : "pointer", opacity: stages.length <= 1 ? 0.5 : 1 }}>
                    Quitar
                  </button>
                </div>
              ))}

              <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 10, display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
                <input value={newStageName} onChange={(e) => setNewStageName(e.target.value)} placeholder="Nueva columna" style={{ border: "1px solid #d8dee6", borderRadius: 6, padding: "8px 10px" }} />
                <button onClick={addStage} style={{ border: "none", background: "#22b8aa", color: "#fff", borderRadius: 6, padding: "8px 12px", fontWeight: 700, cursor: "pointer" }}>
                  Agregar
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {quickActionDealId && quickActionType ? (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.35)", zIndex: 3200, display: "grid", placeItems: "center", padding: 16 }}>
          <section style={{ width: "min(920px, 96vw)", background: "#ffffff", border: "1px solid #d8dee6", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", background: "#334155", color: "#ffffff", fontWeight: 800, display: "flex", alignItems: "center" }}>
              {quickActionType === "Actividad"
                ? "Creando nueva actividad"
                : quickActionType === "Documento"
                ? "Crear Documento"
                : quickActionType === "Correo"
                ? "Redactar correo"
                : quickActionType === "Comentario"
                ? "Dejar comentario"
                : quickActionType === "Cotizacion"
                ? "Creando nueva Cotizacion"
                : quickActionType === "WhatsApp"
                ? "WhatsApp"
                : `Nueva ${quickActionType}`}
              <button onClick={closeQuickAction} style={{ marginLeft: "auto", border: "none", background: "transparent", color: "#fff", fontSize: 16, cursor: "pointer" }}>x</button>
            </div>

            {quickActionType === "Actividad" ? (
              <div style={{ padding: 14, display: "grid", gridTemplateColumns: "320px 1fr", gap: 10 }}>
                <div style={{ border: "1px solid #d1d5db", minHeight: 420, background: "#f8fafc", display: "grid", gridTemplateRows: "auto 1fr" }}>
                  <div style={{ padding: 10, borderBottom: "1px solid #d1d5db", fontWeight: 700 }}>{actionDate || "Fecha"}</div>
                  <div style={{ position: "relative", overflow: "hidden" }}>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} style={{ height: 48, borderBottom: "1px dotted #d1d5db", fontSize: 12, color: "#6b7280", paddingLeft: 10, display: "flex", alignItems: "center" }}>
                        {`${i + 12}m`}
                      </div>
                    ))}
                    <div style={{ position: "absolute", left: 8, top: 70, right: 8, background: "#60a5fa", padding: "4px 6px", fontSize: 12 }}>
                      {actionTime || "--:--"} - {(actionSubject || activityKind || "Actividad").slice(0, 22)}
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "170px 1fr", border: "1px solid #d1d5db", borderBottom: "none" }}>
                  <div style={{ padding: "10px 12px", borderBottom: "1px solid #d1d5db", textAlign: "right" }}>* Tipo de actividad</div>
                  <div style={{ padding: "8px 10px", borderBottom: "1px solid #d1d5db" }}><select value={activityKind} onChange={(e) => setActivityKind(e.target.value)} style={{ width: "100%", border: "1px solid #b6bcc6", padding: "7px 8px" }}><option>Llamada</option><option>Reunion</option><option>Tarea</option><option>WhatsApp</option></select></div>

                  <div style={{ padding: "10px 12px", borderBottom: "1px solid #d1d5db", textAlign: "right" }}>* Asunto</div>
                  <div style={{ padding: "8px 10px", borderBottom: "1px solid #d1d5db" }}><input value={actionSubject} onChange={(e) => setActionSubject(e.target.value)} style={{ width: "100%", border: "1px solid #b6bcc6", padding: "7px 8px" }} /></div>

                  <div style={{ padding: "10px 12px", borderBottom: "1px solid #d1d5db", textAlign: "right" }}>* Fecha</div>
                  <div style={{ padding: "8px 10px", borderBottom: "1px solid #d1d5db", display: "grid", gridTemplateColumns: "1fr 120px 120px", gap: 6 }}>
                    <input type="date" value={actionDate} onChange={(e) => setActionDate(e.target.value)} style={{ border: "1px solid #b6bcc6", padding: "7px 8px" }} />
                    <input type="time" value={actionTime} onChange={(e) => setActionTime(e.target.value)} style={{ border: "1px solid #b6bcc6", padding: "7px 8px" }} />
                    <input value={activityDuration} onChange={(e) => setActivityDuration(e.target.value)} style={{ border: "1px solid #b6bcc6", padding: "7px 8px" }} />
                  </div>

                  <div style={{ padding: "10px 12px", borderBottom: "1px solid #d1d5db", textAlign: "right" }}>Descripcion</div>
                  <div style={{ padding: "8px 10px", borderBottom: "1px solid #d1d5db" }}><textarea value={actionNotes} onChange={(e) => setActionNotes(e.target.value)} rows={4} style={{ width: "100%", border: "1px solid #b6bcc6", padding: "7px 8px", resize: "vertical" }} /></div>

                  <div style={{ padding: "10px 12px", borderBottom: "1px solid #d1d5db", textAlign: "right" }}>* Estado</div>
                  <div style={{ padding: "8px 10px", borderBottom: "1px solid #d1d5db" }}><select value={activityStatus} onChange={(e) => setActivityStatus(e.target.value)} style={{ width: "100%", border: "1px solid #b6bcc6", padding: "7px 8px" }}><option>Planeada</option><option>Realizada</option></select></div>

                  <div style={{ padding: "10px 12px", borderBottom: "1px solid #d1d5db", textAlign: "right" }}>* Asignado a</div>
                  <div style={{ padding: "8px 10px", borderBottom: "1px solid #d1d5db" }}><select value={activityAssignedTo} onChange={(e) => setActivityAssignedTo(e.target.value)} style={{ width: "100%", border: "1px solid #b6bcc6", padding: "7px 8px" }}><option>Usuario Gerente</option><option>Milena Bolanos</option><option>Natalia Espinoza</option><option>Carmenza Vanegas</option><option>Carolina Varon</option></select></div>

                  <div style={{ padding: "10px 12px", borderBottom: "1px solid #d1d5db", textAlign: "right" }}>Donde</div>
                  <div style={{ padding: "8px 10px", borderBottom: "1px solid #d1d5db" }}><input style={{ width: "100%", border: "1px solid #b6bcc6", padding: "7px 8px" }} /></div>

                  <div style={{ padding: "10px 12px", borderBottom: "1px solid #d1d5db", textAlign: "right" }}>Empresa</div>
                  <div style={{ padding: "8px 10px", borderBottom: "1px solid #d1d5db" }}><input value={quickDeal?.company || ""} readOnly style={{ width: "100%", border: "1px solid #b6bcc6", padding: "7px 8px", background: "#f8fafc" }} /></div>

                  <div style={{ padding: "10px 12px", textAlign: "right" }}>Nombre de contacto</div>
                  <div style={{ padding: "8px 10px" }}><input value={quickDeal?.contactName || ""} readOnly style={{ width: "100%", border: "1px solid #b6bcc6", padding: "7px 8px", background: "#f8fafc" }} /></div>
                </div>
              </div>
            ) : null}

            {quickActionType === "Documento" ? (
              <div style={{ padding: 14, display: "grid", gap: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <label style={{ display: "grid", gap: 6 }}><span>* Asunto</span><input value={actionSubject} onChange={(e) => setActionSubject(e.target.value)} style={{ border: "1px solid #d8dee6", borderRadius: 6, padding: "8px 10px" }} /></label>
                  <label style={{ display: "grid", gap: 6 }}><span>Nombre de carpeta</span><select style={{ border: "1px solid #d8dee6", borderRadius: 6, padding: "8px 10px" }}><option>Default</option></select></label>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <label style={{ display: "grid", gap: 6 }}><span>* Asignado a</span><input value={quickDeal?.assignedTo || "Usuario Gerente"} readOnly style={{ border: "1px solid #d8dee6", borderRadius: 6, padding: "8px 10px", background: "#f8fafc" }} /></label>
                  <div />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "end" }}>
                  <label style={{ display: "grid", gap: 6 }}><span>Archivo interno</span><input type="file" /></label>
                  <label style={{ display: "grid", gap: 6 }}><span>Archivo externo</span><input placeholder="URL" style={{ border: "1px solid #d8dee6", borderRadius: 6, padding: "8px 10px" }} /></label>
                </div>
                <div style={{ color: "#ef4444", fontSize: 13 }}>Tamano maximo de archivo para subir al CRM 62MB</div>
              </div>
            ) : null}

            {quickActionType === "Correo" ? (
              <div style={{ padding: 14, display: "grid", gap: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: 10, alignItems: "center" }}>
                  <div>Para*</div>
                  <div style={{ border: "1px solid #d8dee6", borderRadius: 2, padding: 6, background: "#fff", minHeight: 34, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ border: "1px solid #b6bcc6", padding: "3px 6px", borderRadius: 3, fontSize: 13 }}>{quickDeal?.email || ""}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <select style={{ border: "1px solid #b6bcc6", height: 28 }}>
                        <option>Contactos</option>
                      </select>
                      <button style={{ border: "1px solid #b6bcc6", height: 28, width: 28, background: "#fff", cursor: "pointer" }}>🔍</button>
                    </div>
                  </div>
                </div>
                <div style={{ color: "#0f766e", fontSize: 13 }}>Agregar CC  Agregar CCO</div>
                <div style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: 10, alignItems: "center" }}>
                  <div>Asunto*</div>
                  <input value={actionSubject} onChange={(e) => setActionSubject(e.target.value)} style={{ border: "1px solid #b6bcc6", borderRadius: 2, padding: "8px 10px" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: 10, alignItems: "center" }}>
                  <div>Adjunto</div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}><input type="file" /><button style={{ border: "1px solid #d1d5db", background: "#f8fafc", borderRadius: 6, padding: "8px 10px", cursor: "pointer" }}>Navegar por el CRM</button></div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={saveQuickAction} style={{ border: "1px solid #16a34a", background: "#2dd4bf", color: "#fff", borderRadius: 4, padding: "6px 14px", cursor: "pointer" }}>Enviar</button>
                  <button onClick={saveQuickAction} style={{ border: "1px solid #b6bcc6", background: "#fff", borderRadius: 4, padding: "6px 12px", cursor: "pointer" }}>Guardar como borrador</button>
                  <button onClick={() => setShowEmailTemplates((v) => !v)} style={{ marginLeft: "auto", border: "1px solid #b6bcc6", background: "#fff", borderRadius: 4, padding: "6px 12px", cursor: "pointer" }}>Seleccione plantilla de correo</button>
                </div>

                {showEmailTemplates ? (
                  <div style={{ border: "1px solid #d8dee6", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", background: "#f8fafc", fontWeight: 700, fontSize: 13 }}>
                      <div style={{ padding: 8 }}>Nombre de la plantilla</div>
                      <div style={{ padding: 8 }}>Asunto</div>
                      <div style={{ padding: 8 }}>Descripcion</div>
                    </div>
                    {EMAIL_TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.id}
                        onClick={() => {
                          setActionSubject(tpl.subject);
                          setActionNotes(tpl.body);
                          setShowEmailTemplates(false);
                        }}
                        style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", width: "100%", textAlign: "left", border: "none", borderTop: "1px solid #e5e7eb", background: "#fff", cursor: "pointer" }}
                      >
                        <div style={{ padding: 8, color: "#0f766e" }}>{tpl.name}</div>
                        <div style={{ padding: 8, color: "#0f766e" }}>{tpl.subject}</div>
                        <div style={{ padding: 8 }} />
                      </button>
                    ))}
                  </div>
                ) : null}

                <div style={{ border: "1px solid #b6bcc6", borderRadius: 2, minHeight: 240, display: "grid", gridTemplateRows: "auto 1fr" }}>
                  <div style={{ borderBottom: "1px solid #d1d5db", padding: 8, display: "flex", gap: 8, flexWrap: "wrap", background: "#f8fafc" }}>
                    {['↶','↷','B','I','U','•','1.','🔗','📷','⌗'].map((tool) => (
                      <span key={tool} style={{ border: "1px solid #cbd5e1", padding: "2px 6px", borderRadius: 3, fontSize: 12 }}>{tool}</span>
                    ))}
                  </div>
                  <textarea value={actionNotes} onChange={(e) => setActionNotes(e.target.value)} rows={9} placeholder="Escribe el contenido del correo" style={{ border: "none", padding: "10px", resize: "vertical", width: "100%" }} />
                </div>
              </div>
            ) : null}

            {quickActionType === "Comentario" ? (
              <div style={{ padding: 14, display: "grid", gap: 10 }}>
                <textarea
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  rows={5}
                  placeholder="Agrega tu comentario aqui..."
                  style={{ border: "1px solid #d8dee6", borderRadius: 6, padding: "10px", resize: "vertical" }}
                />
              </div>
            ) : null}

            {quickActionType === "WhatsApp" ? (
              <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", minHeight: 420 }}>
                <div style={{ borderRight: "1px solid #e5e7eb", background: "#f8fafc", display: "grid", gridTemplateRows: "auto auto auto 1fr" }}>
                  <div style={{ padding: 8 }}>
                    <input value={quickDeal?.phone || ""} readOnly style={{ width: "100%", border: "1px solid #cbd5e1", borderRadius: 6, padding: "8px 10px", background: "#fff" }} />
                  </div>
                  <div style={{ padding: "0 8px", color: "#64748b", fontWeight: 700 }}>Archivados (0)</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", padding: "8px 0", borderTop: "1px solid #e5e7eb", borderBottom: "1px solid #e5e7eb", textAlign: "center", color: "#334155" }}>
                    <span>Sin leer (0)</span>
                    <span>Chats (0)</span>
                  </div>
                </div>
                <div style={{ display: "grid", placeItems: "center", padding: 20 }}>
                  <div style={{ width: 300, border: "4px solid #dbe3fb", borderRadius: 30, padding: 18, textAlign: "center", color: "#0f172a", lineHeight: 1.4 }}>
                    No tienes conectado un numero de telefono. Contacta a un administrador para obtener un codigo QR.
                  </div>
                </div>
              </div>
            ) : null}

            {quickActionType === "Cotizacion" ? (
              <div style={{ padding: 14, display: "grid", gap: 12, maxHeight: "74vh", overflow: "auto" }}>
                <section style={{ border: "1px solid #d1d5db" }}>
                  <div style={{ padding: "7px 10px", borderBottom: "1px solid #d1d5db", fontWeight: 700, background: "#f8fafc" }}>Informacion de la cotizacion</div>
                  <div style={{ display: "grid", gridTemplateColumns: "150px 1fr 150px 1fr", borderTop: "1px solid #d1d5db" }}>
                    <div style={{ padding: "9px 10px", borderRight: "1px solid #d1d5db", borderBottom: "1px solid #d1d5db", textAlign: "right" }}>* Asunto</div>
                    <div style={{ padding: "7px 8px", borderRight: "1px solid #d1d5db", borderBottom: "1px solid #d1d5db" }}><input value={actionSubject} onChange={(e) => setActionSubject(e.target.value)} style={{ width: "100%", border: "1px solid #b6bcc6", padding: "6px 8px" }} /></div>
                    <div style={{ padding: "9px 10px", borderRight: "1px solid #d1d5db", borderBottom: "1px solid #d1d5db", textAlign: "right" }}>Nombre de contacto</div>
                    <div style={{ padding: "7px 8px", borderBottom: "1px solid #d1d5db" }}><input value={quickDeal?.contactName || ""} readOnly style={{ width: "100%", border: "1px solid #b6bcc6", padding: "6px 8px", background: "#f8fafc" }} /></div>

                    <div style={{ padding: "9px 10px", borderRight: "1px solid #d1d5db", borderBottom: "1px solid #d1d5db", textAlign: "right" }}>Empresa</div>
                    <div style={{ padding: "7px 8px", borderRight: "1px solid #d1d5db", borderBottom: "1px solid #d1d5db" }}><input value={quickDeal?.company || ""} readOnly style={{ width: "100%", border: "1px solid #b6bcc6", padding: "6px 8px", background: "#f8fafc" }} /></div>
                    <div style={{ padding: "9px 10px", borderRight: "1px solid #d1d5db", borderBottom: "1px solid #d1d5db", textAlign: "right" }}>Negocio</div>
                    <div style={{ padding: "7px 8px", borderBottom: "1px solid #d1d5db" }}><input value={quickDeal?.businessName || ""} readOnly style={{ width: "100%", border: "1px solid #b6bcc6", padding: "6px 8px", background: "#f8fafc" }} /></div>

                    <div style={{ padding: "9px 10px", borderRight: "1px solid #d1d5db", borderBottom: "1px solid #d1d5db", textAlign: "right" }}>* Estado de la cotizacion</div>
                    <div style={{ padding: "7px 8px", borderRight: "1px solid #d1d5db", borderBottom: "1px solid #d1d5db" }}><select value={quoteStatus} onChange={(e) => setQuoteStatus(e.target.value)} style={{ width: "100%", border: "1px solid #b6bcc6", padding: "6px 8px" }}><option>Creado</option><option>Aceptado</option><option>Rechazado</option></select></div>
                    <div style={{ padding: "9px 10px", borderRight: "1px solid #d1d5db", borderBottom: "1px solid #d1d5db", textAlign: "right" }}>* Asignado a</div>
                    <div style={{ padding: "7px 8px", borderBottom: "1px solid #d1d5db" }}><select value={quoteAssignedTo} onChange={(e) => setQuoteAssignedTo(e.target.value)} style={{ width: "100%", border: "1px solid #b6bcc6", padding: "6px 8px" }}><option>Milena Bolanos</option><option>Natalia Espinoza</option><option>Carmenza Vanegas</option><option>Carolina Varon</option></select></div>

                    <div style={{ padding: "9px 10px", borderRight: "1px solid #d1d5db", borderBottom: "1px solid #d1d5db", textAlign: "right" }}>Valido hasta</div>
                    <div style={{ padding: "7px 8px", borderRight: "1px solid #d1d5db", borderBottom: "1px solid #d1d5db" }}><input type="date" value={actionDate} onChange={(e) => setActionDate(e.target.value)} style={{ width: "100%", border: "1px solid #b6bcc6", padding: "6px 8px" }} /></div>
                    <div style={{ padding: "9px 10px", borderRight: "1px solid #d1d5db", borderBottom: "1px solid #d1d5db", textAlign: "right" }}>Cartera Corriente</div>
                    <div style={{ padding: "7px 8px", borderBottom: "1px solid #d1d5db" }}><input value={money(Number(actionAmount || 0))} readOnly style={{ width: "100%", border: "1px solid #b6bcc6", padding: "6px 8px", background: "#f8fafc" }} /></div>

                    <div style={{ padding: "9px 10px", borderRight: "1px solid #d1d5db", textAlign: "right" }}>Fecha de Entrega</div>
                    <div style={{ padding: "7px 8px", borderRight: "1px solid #d1d5db" }}><input type="date" style={{ width: "100%", border: "1px solid #b6bcc6", padding: "6px 8px" }} /></div>
                    <div style={{ padding: "9px 10px", borderRight: "1px solid #d1d5db", textAlign: "right" }}>Estado de Cartera</div>
                    <div style={{ padding: "7px 8px" }}><select style={{ width: "100%", border: "1px solid #b6bcc6", padding: "6px 8px" }}><option>Seleccione una opcion</option><option>Al dia</option><option>Con mora</option></select></div>
                  </div>
                </section>

                <section style={{ border: "1px solid #d1d5db" }}>
                  <div style={{ padding: "7px 10px", borderBottom: "1px solid #d1d5db", fontWeight: 700, background: "#f8fafc" }}>Detalles de la descripcion</div>
                  <div style={{ display: "grid", gridTemplateColumns: "150px 1fr", borderTop: "1px solid #d1d5db" }}>
                    <div style={{ padding: "9px 10px", borderRight: "1px solid #d1d5db", borderBottom: "1px solid #d1d5db", textAlign: "right" }}>Descripcion</div>
                    <div style={{ padding: "7px 8px", borderBottom: "1px solid #d1d5db" }}><textarea value={actionNotes} onChange={(e) => setActionNotes(e.target.value)} rows={3} style={{ width: "100%", border: "1px solid #b6bcc6", padding: "6px 8px" }} /></div>
                    <div style={{ padding: "9px 10px", borderRight: "1px solid #d1d5db", textAlign: "right" }}>Forma de pago</div>
                    <div style={{ padding: "7px 8px" }}><select value={quotePaymentTerm} onChange={(e) => setQuotePaymentTerm(e.target.value)} style={{ width: "100%", maxWidth: 260, border: "1px solid #b6bcc6", padding: "6px 8px" }}><option>Seleccione una opcion</option><option>Contado</option><option>Anticipo del 60%</option><option>Credito a 30 dias</option><option>Credito a 45 dias</option><option>Credito a 60 dias</option></select></div>
                  </div>
                </section>

                <section style={{ border: "1px solid #d1d5db" }}>
                  <div style={{ padding: "7px 10px", borderBottom: "1px solid #d1d5db", fontWeight: 700, background: "#f8fafc" }}>Detalles del elemento</div>
                  <div style={{ padding: 10, display: "grid", gap: 8 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 8 }}>
                      <input placeholder="Nombre elemento" value={quoteItemName} onChange={(e) => setQuoteItemName(e.target.value)} style={{ border: "1px solid #b6bcc6", padding: "6px 8px" }} />
                      <input placeholder="Cantidad" value={quoteQty} onChange={(e) => setQuoteQty(e.target.value)} style={{ border: "1px solid #b6bcc6", padding: "6px 8px" }} />
                      <input placeholder="Precio" value={quotePrice} onChange={(e) => setQuotePrice(e.target.value)} style={{ border: "1px solid #b6bcc6", padding: "6px 8px" }} />
                      <input value={money(Number(quoteQty || 0) * Number(quotePrice || 0))} readOnly style={{ border: "1px solid #b6bcc6", padding: "6px 8px", background: "#f8fafc" }} />
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button style={{ border: "1px solid #b6bcc6", background: "#fff", padding: "6px 10px", cursor: "pointer" }}>+Agregar producto</button>
                      <button style={{ border: "1px solid #b6bcc6", background: "#fff", padding: "6px 10px", cursor: "pointer" }}>+Agregar servicio</button>
                    </div>
                    <div style={{ textAlign: "right", fontWeight: 700 }}>Total: {money(Number(quoteQty || 0) * Number(quotePrice || 0))}</div>
                  </div>
                </section>
              </div>
            ) : null}

            {quickActionType !== "Actividad" && quickActionType !== "Documento" && quickActionType !== "Correo" && quickActionType !== "Comentario" && quickActionType !== "WhatsApp" && quickActionType !== "Cotizacion" ? (
              <div style={{ padding: 14, display: "grid", gap: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <label style={{ display: "grid", gap: 6 }}><span>Asunto</span><input value={actionSubject} onChange={(e) => setActionSubject(e.target.value)} style={{ border: "1px solid #d8dee6", borderRadius: 6, padding: "8px 10px" }} /></label>
                  <label style={{ display: "grid", gap: 6 }}><span>Fecha</span><input type="date" value={actionDate} onChange={(e) => setActionDate(e.target.value)} style={{ border: "1px solid #d8dee6", borderRadius: 6, padding: "8px 10px" }} /></label>
                </div>
                <label style={{ display: "grid", gap: 6 }}><span>Notas</span><textarea value={actionNotes} onChange={(e) => setActionNotes(e.target.value)} rows={4} style={{ border: "1px solid #d8dee6", borderRadius: 6, padding: "8px 10px", resize: "vertical" }} /></label>
              </div>
            ) : null}

            <div style={{ borderTop: "1px solid #e5e7eb", padding: 12, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                style={{
                  border: "1px solid #b6bcc6",
                  background: "#fff",
                  borderRadius: 6,
                  padding: "8px 12px",
                  cursor: "pointer",
                  display: quickActionType === "Actividad" || quickActionType === "Documento" ? "inline-block" : "none",
                }}
              >
                Ir a forma completa
              </button>
              <button onClick={closeQuickAction} style={{ border: "none", background: "transparent", color: "#b91c1c", fontWeight: 700, cursor: "pointer" }}>Cancelar</button>
              <button onClick={saveQuickAction} style={{ border: "none", background: "#22b8aa", color: "#fff", borderRadius: 6, padding: "8px 14px", fontWeight: 800, cursor: "pointer", display: quickActionType === "Correo" ? "none" : "inline-block" }}>
                {quickActionType === "Correo" ? "Enviar" : quickActionType === "Comentario" ? "Guardar" : "Guardar"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
