"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Deal, Stage, loadDeals, loadStages, money, saveDeals, saveStages } from "../../_lib/deals";

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

      <div style={{ display: "flex", gap: 12, alignItems: "stretch", overflowX: "auto", paddingBottom: 4 }}>
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
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <strong style={{ fontSize: 13, color: "#2d3748" }}>{deal.businessName}</strong>
                  <span style={{ fontSize: 12, color: "#4b5563", whiteSpace: "nowrap" }}>{money(deal.totalOrderAmount)}</span>
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>{deal.contactName || deal.company || "Sin contacto"}</div>
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
    </div>
  );
}
