"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Deal, STAGES, createId, emptyDeal, loadDeals, money, saveDeals } from "../../_lib/deals";

export default function AvanzaInicioPage() {
  const router = useRouter();
  const [allDeals, setAllDeals] = useState<Deal[]>([]);
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [form, setForm] = useState(emptyDeal());
  const [errors, setErrors] = useState<{ contactName?: string; businessName?: string; estimatedCloseDate?: string }>({});

  useEffect(() => {
    setAllDeals(loadDeals());
  }, []);

  const filteredDeals = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return allDeals;
    return allDeals.filter((d) => {
      const text = `${d.businessName} ${d.contactName} ${d.company}`.toLowerCase();
      return text.includes(term);
    });
  }, [allDeals, query]);

  const totals = useMemo(() => {
    const totalAmount = filteredDeals.reduce((sum, d) => sum + Number(d.totalOrderAmount || 0), 0);
    return { totalDeals: filteredDeals.length, totalAmount };
  }, [filteredDeals]);

  const columns = useMemo(
    () =>
      STAGES.map((stage) => ({
        stage,
        deals: filteredDeals.filter((deal) => deal.stage === stage.id),
      })),
    [filteredDeals]
  );

  const onChange = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSaveDeal = () => {
    const nextErrors: { contactName?: string; businessName?: string; estimatedCloseDate?: string } = {};
    if (!form.contactName.trim()) nextErrors.contactName = "Este campo es obligatorio";
    if (!form.businessName.trim()) nextErrors.businessName = "Este campo es obligatorio";
    if (!form.estimatedCloseDate.trim()) nextErrors.estimatedCloseDate = "Este campo es obligatorio";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const created: Deal = {
      ...form,
      id: createId("deal"),
      activities: [],
      createdAt: new Date().toISOString(),
      totalOrderAmount: Number(form.totalOrderAmount || 0),
      totalQuoteAmount: Number(form.totalQuoteAmount || 0),
    };

    const updated = [created, ...allDeals];
    setAllDeals(updated);
    saveDeals(updated);
    setShowCreate(false);
    setShowMore(false);
    setForm(emptyDeal());
    setErrors({});
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <section style={{ background: "#ffffff", border: "1px solid #d8dee6", borderRadius: 10, padding: 12, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => setShowCreate(true)}
            style={{ background: "#ff7a00", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 800, cursor: "pointer" }}
          >
            Crear negocio
          </button>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Escribe la palabra"
            style={{ minWidth: 260, flex: "1 1 360px", borderRadius: 20, border: "1px solid #d8dee6", padding: "9px 14px" }}
          />
          <div style={{ marginLeft: "auto", color: "#374151", fontWeight: 800 }}>{money(totals.totalAmount)} | {totals.totalDeals} Negocios</div>
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12, alignItems: "start" }}>
        {columns.map(({ stage, deals }) => (
          <section key={stage.id} style={{ background: "#eef1f6", border: "1px solid #d8dee6", borderRadius: 10, padding: 10, display: "grid", gap: 8 }}>
            <div style={{ borderRadius: 8, background: "#e7ebf3", padding: "10px 10px", border: "1px solid #d8dee6" }}>
              <div style={{ fontWeight: 800, color: "#2d3748", fontSize: 15 }}>{stage.label}</div>
              <div style={{ color: "#6b7280", fontSize: 12 }}>{money(deals.reduce((sum, d) => sum + Number(d.totalOrderAmount || 0), 0))} - {deals.length} Negocios</div>
            </div>

            {deals.map((deal) => (
              <button
                key={deal.id}
                onClick={() => router.push(`/avanza-crm/negocios?deal=${deal.id}`)}
                style={{ background: "#ffffff", border: "1px solid #d8dee6", borderRadius: 8, padding: "9px 10px", display: "grid", gap: 4, cursor: "pointer", textAlign: "left" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <strong style={{ fontSize: 13, color: "#2d3748" }}>{deal.businessName}</strong>
                  <span style={{ fontSize: 12, color: "#4b5563", whiteSpace: "nowrap" }}>{money(deal.totalOrderAmount)}</span>
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>{deal.contactName || deal.company || "Sin contacto"}</div>
              </button>
            ))}

            {deals.length === 0 ? <div style={{ fontSize: 12, color: "#9ca3af", padding: "4px 2px" }}>Sin negocios en esta etapa.</div> : null}
          </section>
        ))}
      </div>

      {showCreate ? (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.42)", zIndex: 3000, display: "grid", placeItems: "center", padding: 16 }}>
          <section style={{ width: "min(1080px, 96vw)", maxHeight: "92vh", overflow: "auto", background: "#f7fafc", border: "2px solid #3bc3b3", borderRadius: 8 }}>
            <div style={{ background: "#3bc3b3", color: "#fff", fontWeight: 800, padding: "10px 14px", display: "flex", alignItems: "center" }}>
              <span>Crear negocio</span>
              <button onClick={() => setShowCreate(false)} style={{ marginLeft: "auto", border: "none", background: "transparent", color: "#fff", fontSize: 16, cursor: "pointer" }}>x</button>
            </div>

            <div style={{ padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ borderRight: "1px solid #d1d5db", paddingRight: 14, display: "grid", gap: 10 }}>
                <h3 style={{ margin: 0, fontSize: 24 }}>Relacionado con</h3>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 13 }}>* Contacto</span>
                  <input value={form.contactName} onChange={(e) => onChange("contactName", e.target.value)} placeholder="Nombre del contacto relacionado" style={{ border: errors.contactName ? "1px solid #ef4444" : "1px solid #d8dee6", borderRadius: 6, padding: "8px 10px" }} />
                  {errors.contactName ? <span style={{ color: "#dc2626", fontSize: 12 }}>{errors.contactName}</span> : null}
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 13 }}>Empresa</span>
                  <input value={form.company} onChange={(e) => onChange("company", e.target.value)} placeholder="Nombre de la empresa relacionada" style={{ border: "1px solid #d8dee6", borderRadius: 6, padding: "8px 10px" }} />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 13 }}>* Negocio</span>
                  <input value={form.businessName} onChange={(e) => onChange("businessName", e.target.value)} placeholder="Nombre de tu negocio" style={{ border: errors.businessName ? "1px solid #ef4444" : "1px solid #d8dee6", borderRadius: 6, padding: "8px 10px" }} />
                  {errors.businessName ? <span style={{ color: "#dc2626", fontSize: 12 }}>{errors.businessName}</span> : null}
                </label>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                <h3 style={{ margin: 0, fontSize: 24 }}>Creacion de Contacto</h3>
                <div style={{ color: "#6b7280", fontSize: 13 }}>Completa la informacion para guardar tu contacto</div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 13 }}>Correo</span>
                    <input value={form.email} onChange={(e) => onChange("email", e.target.value)} placeholder="correo@empresa.com" style={{ border: "1px solid #d8dee6", borderRadius: 6, padding: "8px 10px" }} />
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 13 }}>Celular</span>
                    <input value={form.phone} onChange={(e) => onChange("phone", e.target.value)} placeholder="3001234567" style={{ border: "1px solid #d8dee6", borderRadius: 6, padding: "8px 10px" }} />
                  </label>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 13 }}>* Fase de venta</span>
                    <select value={form.stage} onChange={(e) => onChange("stage", e.target.value as Deal["stage"])} style={{ border: "1px solid #d8dee6", borderRadius: 6, padding: "8px 10px" }}>
                      {STAGES.map((s) => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 13 }}>* Fecha estimada de cierre</span>
                    <input type="date" value={form.estimatedCloseDate} onChange={(e) => onChange("estimatedCloseDate", e.target.value)} style={{ border: errors.estimatedCloseDate ? "1px solid #ef4444" : "1px solid #d8dee6", borderRadius: 6, padding: "8px 10px" }} />
                    {errors.estimatedCloseDate ? <span style={{ color: "#dc2626", fontSize: 12 }}>{errors.estimatedCloseDate}</span> : null}
                  </label>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 13 }}>Asignado a</span>
                    <input value={form.assignedTo} onChange={(e) => onChange("assignedTo", e.target.value)} style={{ border: "1px solid #d8dee6", borderRadius: 6, padding: "8px 10px" }} />
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 13 }}>Pais</span>
                    <input value={form.country} onChange={(e) => onChange("country", e.target.value)} style={{ border: "1px solid #d8dee6", borderRadius: 6, padding: "8px 10px" }} />
                  </label>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 13 }}>Origen de contacto</span>
                    <select value={form.contactOrigin} onChange={(e) => onChange("contactOrigin", e.target.value)} style={{ border: "1px solid #d8dee6", borderRadius: 6, padding: "8px 10px" }}>
                      <option value="">Seleccione una opcion</option>
                      <option>Feria comercial</option>
                      <option>Llamada en frio</option>
                      <option>WhatsApp</option>
                      <option>Correo</option>
                    </select>
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 13 }}>Origen del negocio</span>
                    <select value={form.businessOrigin} onChange={(e) => onChange("businessOrigin", e.target.value)} style={{ border: "1px solid #d8dee6", borderRadius: 6, padding: "8px 10px" }}>
                      <option value="">Seleccione una opcion</option>
                      <option>Inbound</option>
                      <option>Outbound</option>
                      <option>Referido</option>
                    </select>
                  </label>
                </div>

                <button onClick={() => setShowMore((v) => !v)} style={{ border: "none", background: "transparent", color: "#ea580c", fontWeight: 700, width: "fit-content", cursor: "pointer", padding: 0 }}>
                  {showMore ? "Ver menos campos ▲" : "Ver mas campos ▼"}
                </button>

                {showMore ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <label style={{ display: "grid", gap: 6 }}>
                      <span style={{ fontSize: 13 }}>Campana origen</span>
                      <input value={form.campaignOrigin} onChange={(e) => onChange("campaignOrigin", e.target.value)} style={{ border: "1px solid #d8dee6", borderRadius: 6, padding: "8px 10px" }} />
                    </label>
                    <label style={{ display: "grid", gap: 6 }}>
                      <span style={{ fontSize: 13 }}>Descripcion</span>
                      <textarea value={form.description} onChange={(e) => onChange("description", e.target.value)} rows={2} style={{ border: "1px solid #d8dee6", borderRadius: 6, padding: "8px 10px", resize: "vertical" }} />
                    </label>
                    <label style={{ display: "grid", gap: 6 }}>
                      <span style={{ fontSize: 13 }}>Motivo de perdida</span>
                      <input value={form.lossReason} onChange={(e) => onChange("lossReason", e.target.value)} style={{ border: "1px solid #d8dee6", borderRadius: 6, padding: "8px 10px" }} />
                    </label>
                    <label style={{ display: "grid", gap: 6 }}>
                      <span style={{ fontSize: 13 }}>Monto total pedidos</span>
                      <input type="number" value={form.totalOrderAmount || ""} onChange={(e) => onChange("totalOrderAmount", Number(e.target.value || 0))} style={{ border: "1px solid #d8dee6", borderRadius: 6, padding: "8px 10px" }} />
                    </label>
                    <label style={{ display: "grid", gap: 6 }}>
                      <span style={{ fontSize: 13 }}>Monto total cotizaciones</span>
                      <input type="number" value={form.totalQuoteAmount || ""} onChange={(e) => onChange("totalQuoteAmount", Number(e.target.value || 0))} style={{ border: "1px solid #d8dee6", borderRadius: 6, padding: "8px 10px" }} />
                    </label>
                    <label style={{ display: "grid", gap: 6 }}>
                      <span style={{ fontSize: 13 }}>Link anuncio</span>
                      <input value={form.adLink} onChange={(e) => onChange("adLink", e.target.value)} style={{ border: "1px solid #d8dee6", borderRadius: 6, padding: "8px 10px" }} />
                    </label>
                  </div>
                ) : null}
              </div>
            </div>

            <div style={{ borderTop: "1px solid #d1d5db", padding: 12, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setShowCreate(false)} style={{ border: "none", background: "transparent", color: "#b91c1c", fontWeight: 700, cursor: "pointer" }}>
                CANCELAR
              </button>
              <button onClick={onSaveDeal} style={{ border: "none", background: "#ff7a00", color: "#ffffff", borderRadius: 6, padding: "8px 16px", fontWeight: 800, cursor: "pointer" }}>
                GUARDAR
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
