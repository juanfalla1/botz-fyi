"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Deal, Stage, createId, emptyDeal, loadDeals, loadStages, saveDeals } from "../_lib/deals";

const NAV_ITEMS = [
  { href: "/avanza-crm/inicio", label: "⌂" },
  { href: "/avanza-crm/dashboard", label: "Indicadores gerenciales" },
  { href: "/avanza-crm/empresas", label: "Empresas" },
  { href: "/avanza-crm/contactos", label: "Contactos" },
  { href: "/avanza-crm/negocios", label: "Negocios" },
  { href: "/avanza-crm/calendario", label: "Calendario" },
  { href: "/avanza-crm/informes", label: "Informes" },
  { href: "/avanza-crm/configuracion", label: "Configuración" },
];

const C = {
  bg: "#f2f4f8",
  top: "#2f3742",
  line: "#22b8aa",
  white: "#ffffff",
  text: "#293241",
  muted: "#6b7280",
  panel: "#ffffff",
  border: "#d8dee6",
  active: "#22b8aa",
};

export function AvanzaCrmShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [stages, setStages] = useState<Stage[]>([]);
  const [form, setForm] = useState(emptyDeal());
  const [errors, setErrors] = useState<{ contactName?: string; businessName?: string; estimatedCloseDate?: string }>({});

  useEffect(() => {
    const loaded = loadStages();
    setStages(loaded);
    setForm((prev) => ({ ...prev, stage: loaded[0]?.id || prev.stage }));
  }, []);

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

    const stage = stages.find((s) => s.id === form.stage)?.id || stages[0]?.id || "sin_contactar";
    const created: Deal = {
      ...form,
      stage,
      id: createId("deal"),
      activities: [],
      createdAt: new Date().toISOString(),
      totalOrderAmount: Number(form.totalOrderAmount || 0),
      totalQuoteAmount: Number(form.totalQuoteAmount || 0),
    };

    const nextDeals = [created, ...loadDeals()];
    saveDeals(nextDeals);
    setShowCreate(false);
    setShowMore(false);
    setErrors({});
    setForm({ ...emptyDeal(), stage: stages[0]?.id || "sin_contactar" });
  };

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/avanza-crm/inicio");
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        backgroundColor: C.bg,
        color: C.text,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <header
        style={{
          background: C.top,
          backgroundImage:
            "linear-gradient(rgba(47,55,66,0.92), rgba(47,55,66,0.92)), url('/avanza-crm/login-bg-v3.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          color: C.white,
          borderBottom: `3px solid ${C.line}`,
          position: "static",
          top: "auto",
          width: "auto",
          padding: 0,
          boxShadow: "none",
          backdropFilter: "none",
          display: "block",
        }}
      >
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>Avanza CRM</div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => setShowCreate(true)}
              style={{
                background: "#ff7a00",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "8px 14px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Crear negocio
            </button>
            <div style={{ fontSize: 12, color: "#c4cbd5" }}>OHAUS · Comercial</div>
          </div>
        </div>
        <nav style={{ maxWidth: 1400, margin: "0 auto", padding: "0 8px 8px", display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <button
            onClick={goBack}
            style={{
              border: "1px solid rgba(255,255,255,0.25)",
              background: "rgba(255,255,255,0.08)",
              color: C.white,
              borderRadius: 6,
              padding: "7px 10px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ←
          </button>
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  textDecoration: "none",
                  color: active ? "#0e4f49" : C.white,
                  background: active ? "#7fe1d7" : "rgba(255,255,255,0.08)",
                  padding: "7px 11px",
                  minWidth: item.label === "⌂" ? 40 : undefined,
                  textAlign: "center",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main style={{ width: "100%", padding: "10px 16px 16px", overflow: "auto", flex: 1 }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "grid", gap: 10 }}>
          {children}
        </div>
      </main>

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
                <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 13 }}>* Contacto</span><input value={form.contactName} onChange={(e) => onChange("contactName", e.target.value)} placeholder="Nombre del contacto relacionado" style={{ border: errors.contactName ? "1px solid #ef4444" : "1px solid #d8dee6", borderRadius: 6, padding: "8px 10px" }} />{errors.contactName ? <span style={{ color: "#dc2626", fontSize: 12 }}>{errors.contactName}</span> : null}</label>
                <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 13 }}>Empresa</span><input value={form.company} onChange={(e) => onChange("company", e.target.value)} placeholder="Nombre de la empresa relacionada" style={{ border: "1px solid #d8dee6", borderRadius: 6, padding: "8px 10px" }} /></label>
                <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 13 }}>* Negocio</span><input value={form.businessName} onChange={(e) => onChange("businessName", e.target.value)} placeholder="Nombre de tu negocio" style={{ border: errors.businessName ? "1px solid #ef4444" : "1px solid #d8dee6", borderRadius: 6, padding: "8px 10px" }} />{errors.businessName ? <span style={{ color: "#dc2626", fontSize: 12 }}>{errors.businessName}</span> : null}</label>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                <h3 style={{ margin: 0, fontSize: 24 }}>Creacion de Contacto</h3>
                <div style={{ color: "#6b7280", fontSize: 13 }}>Completa la informacion para guardar tu contacto</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 13 }}>Correo</span><input value={form.email} onChange={(e) => onChange("email", e.target.value)} placeholder="correo@empresa.com" style={{ border: "1px solid #d8dee6", borderRadius: 6, padding: "8px 10px" }} /></label>
                  <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 13 }}>Celular</span><input value={form.phone} onChange={(e) => onChange("phone", e.target.value)} placeholder="3001234567" style={{ border: "1px solid #d8dee6", borderRadius: 6, padding: "8px 10px" }} /></label>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 13 }}>* Fase de venta</span><select value={form.stage} onChange={(e) => onChange("stage", e.target.value)} style={{ border: "1px solid #d8dee6", borderRadius: 6, padding: "8px 10px" }}>{stages.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
                  <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 13 }}>* Fecha estimada de cierre</span><input type="date" value={form.estimatedCloseDate} onChange={(e) => onChange("estimatedCloseDate", e.target.value)} style={{ border: errors.estimatedCloseDate ? "1px solid #ef4444" : "1px solid #d8dee6", borderRadius: 6, padding: "8px 10px" }} />{errors.estimatedCloseDate ? <span style={{ color: "#dc2626", fontSize: 12 }}>{errors.estimatedCloseDate}</span> : null}</label>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 13 }}>Asignado a</span><input value={form.assignedTo} onChange={(e) => onChange("assignedTo", e.target.value)} style={{ border: "1px solid #d8dee6", borderRadius: 6, padding: "8px 10px" }} /></label>
                  <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 13 }}>Pais</span><input value={form.country} onChange={(e) => onChange("country", e.target.value)} style={{ border: "1px solid #d8dee6", borderRadius: 6, padding: "8px 10px" }} /></label>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 13 }}>Origen de contacto</span><select value={form.contactOrigin} onChange={(e) => onChange("contactOrigin", e.target.value)} style={{ border: "1px solid #d8dee6", borderRadius: 6, padding: "8px 10px" }}><option value="">Seleccione una opcion</option><option>Feria comercial</option><option>Llamada en frio</option><option>WhatsApp</option><option>Correo</option></select></label>
                  <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 13 }}>Origen del negocio</span><select value={form.businessOrigin} onChange={(e) => onChange("businessOrigin", e.target.value)} style={{ border: "1px solid #d8dee6", borderRadius: 6, padding: "8px 10px" }}><option value="">Seleccione una opcion</option><option>Inbound</option><option>Outbound</option><option>Referido</option></select></label>
                </div>
                <button onClick={() => setShowMore((v) => !v)} style={{ border: "none", background: "transparent", color: "#ea580c", fontWeight: 700, width: "fit-content", cursor: "pointer", padding: 0 }}>{showMore ? "Ver menos campos ▲" : "Ver mas campos ▼"}</button>
                {showMore ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 13 }}>Campana origen</span><input value={form.campaignOrigin} onChange={(e) => onChange("campaignOrigin", e.target.value)} style={{ border: "1px solid #d8dee6", borderRadius: 6, padding: "8px 10px" }} /></label>
                    <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 13 }}>Descripcion</span><textarea value={form.description} onChange={(e) => onChange("description", e.target.value)} rows={2} style={{ border: "1px solid #d8dee6", borderRadius: 6, padding: "8px 10px", resize: "vertical" }} /></label>
                    <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 13 }}>Motivo de perdida</span><input value={form.lossReason} onChange={(e) => onChange("lossReason", e.target.value)} style={{ border: "1px solid #d8dee6", borderRadius: 6, padding: "8px 10px" }} /></label>
                    <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 13 }}>Monto total pedidos</span><input type="number" value={form.totalOrderAmount || ""} onChange={(e) => onChange("totalOrderAmount", Number(e.target.value || 0))} style={{ border: "1px solid #d8dee6", borderRadius: 6, padding: "8px 10px" }} /></label>
                    <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 13 }}>Monto total cotizaciones</span><input type="number" value={form.totalQuoteAmount || ""} onChange={(e) => onChange("totalQuoteAmount", Number(e.target.value || 0))} style={{ border: "1px solid #d8dee6", borderRadius: 6, padding: "8px 10px" }} /></label>
                    <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 13 }}>Link anuncio</span><input value={form.adLink} onChange={(e) => onChange("adLink", e.target.value)} style={{ border: "1px solid #d8dee6", borderRadius: 6, padding: "8px 10px" }} /></label>
                  </div>
                ) : null}
              </div>
            </div>
            <div style={{ borderTop: "1px solid #d1d5db", padding: 12, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setShowCreate(false)} style={{ border: "none", background: "transparent", color: "#b91c1c", fontWeight: 700, cursor: "pointer" }}>CANCELAR</button>
              <button onClick={onSaveDeal} style={{ border: "none", background: "#ff7a00", color: "#ffffff", borderRadius: 6, padding: "8px 16px", fontWeight: 800, cursor: "pointer" }}>GUARDAR</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

export function AvanzaModuleCard({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <section style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", borderBottom: `2px solid ${C.line}`, fontWeight: 800 }}>{title}</div>
      <div style={{ padding: 14, color: C.muted, fontSize: 14 }}>{subtitle}</div>
    </section>
  );
}
