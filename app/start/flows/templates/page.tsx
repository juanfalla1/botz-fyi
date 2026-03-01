"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { plantillaParaLlamar } from "@/app/start/flows/data/plantilla";
import { supabaseAgents } from "@/app/start/agents/supabaseAgentsClient";
import { authedFetch, AuthRequiredError } from "@/app/start/agents/authedFetchAgents";

const C = {
  bg: "#1a1d26",
  sidebar: "#15181f",
  card: "#22262d",
  dark: "#111318",
  border: "rgba(255,255,255,0.07)",
  blue: "#0096ff",
  lime: "#a3e635",
  white: "#ffffff",
  muted: "#9ca3af",
  dim: "#6b7280",
};

type Cat = "All Templates" | "Recent" | "Popular" | "AI" | "CRMs" | "Others" | "CMS";

const VISIBLE_CATEGORIES: Cat[] = ["All Templates", "AI", "Others"];

type FlowTemplate = {
  id: string;
  name: string;
  description: string;
  category: Cat;
  badges: string[];
  createdBy: string;
  nodes: Array<{ id: string; label: string; sub: string; x: number; y: number; accent?: "lime" | "blue" | "purple" }>;
  edges: Array<{ from: string; to: string; label?: string }>;
};

const TEMPLATES: FlowTemplate[] = [
  {
    id: plantillaParaLlamar.id,
    name: plantillaParaLlamar.name,
    description: plantillaParaLlamar.description,
    category: "AI",
    badges: ["📗", "📞"],
    createdBy: "Botz",
    nodes: plantillaParaLlamar.nodes,
    edges: plantillaParaLlamar.edges,
  },
  {
    id: "test_template_miquel_2026",
    name: "Test Tamplete Miquel 2026",
    description: "Test",
    category: "AI",
    badges: ["🧩", "📞"],
    createdBy: "Botz",
    nodes: [
      { id: "start", label: "Start", sub: "WEBHOOK", x: 520, y: 160, accent: "lime" },
      { id: "ai", label: "AI", sub: "LLM", x: 520, y: 320 },
      { id: "resp", label: "Response", sub: "OUTPUT", x: 820, y: 320 },
    ],
    edges: [
      { from: "start", to: "ai" },
      { from: "ai", to: "resp" },
    ],
  },
  {
    id: "flujo_para_llamar_gs",
    name: "flujo_para_llamar_gs",
    description: "Usa Google Sheets como fuente para llamadas.",
    category: "AI",
    badges: ["📗", "📞"],
    createdBy: "Botz",
    nodes: [
      { id: "start", label: "Start", sub: "SCHEDULED TASK", x: 520, y: 120, accent: "lime" },
      { id: "rows", label: "Get Rows", sub: "GOOGLE_SHEETS", x: 520, y: 250 },
      { id: "call", label: "Call", sub: "VOICE_AGENT", x: 520, y: 400, accent: "blue" },
      { id: "resp", label: "Response", sub: "OUTPUT", x: 820, y: 400 },
    ],
    edges: [
      { from: "start", to: "rows" },
      { from: "rows", to: "call" },
      { from: "call", to: "resp" },
    ],
  },
  {
    id: "openai_notion",
    name: "Open AI + Notion",
    description: "From intelligent content generation to business process automation.",
    category: "AI",
    badges: ["🤖", "🗒️"],
    createdBy: "Botz",
    nodes: [
      { id: "start", label: "Start", sub: "WEBHOOK", x: 520, y: 160, accent: "lime" },
      { id: "ai", label: "Generate", sub: "OPENAI", x: 520, y: 320, accent: "blue" },
      { id: "notion", label: "Create Page", sub: "NOTION", x: 820, y: 320 },
    ],
    edges: [
      { from: "start", to: "ai" },
      { from: "ai", to: "notion" },
    ],
  },
  {
    id: "whatsapp_openai",
    name: "Whatsapp + Open AI",
    description: "Improving customer service and automating repetitive tasks.",
    category: "Others",
    badges: ["🟢", "🤖"],
    createdBy: "Botz",
    nodes: [
      { id: "start", label: "Start", sub: "WHATSAPP", x: 520, y: 160, accent: "lime" },
      { id: "ai", label: "Reply", sub: "OPENAI", x: 520, y: 320, accent: "blue" },
      { id: "resp", label: "Send", sub: "WHATSAPP", x: 820, y: 320 },
    ],
    edges: [
      { from: "start", to: "ai" },
      { from: "ai", to: "resp" },
    ],
  },
];

export default function FlowTemplatesPage() {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [cat, setCat] = useState<Cat>("All Templates");
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState<string | null>(null);
  const [language, setLanguage] = useState<"es" | "en">("es");

  const tr = (es: string, en: string) => (language === "en" ? en : es);
  const trTpl = (text: string) => {
    if (language !== "en") return text;
    const map: Record<string, string> = {
      "Usa Google Sheets como fuente para llamadas.": "Use Google Sheets as the call source.",
      "Llama una lista de contactos y registra el resultado.": "Call a contact list and log results.",
    };
    return map[text] || text;
  };

  const trTplName = (name: string) => {
    if (language !== "en") return name;
    const map: Record<string, string> = {
      "plantilla_para_llamar": "Call Template",
      "flujo_para_llamar_gs": "Call Flow GS",
      "Test Tamplete Miquel 2026": "Test Template Miquel 2026",
      "Whatsapp + Open AI": "WhatsApp + Open AI",
    };
    return map[name] || name;
  };

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("botz-language");
    if (saved === "es" || saved === "en") setLanguage(saved);

    const onLanguageChange = (evt: Event) => {
      const next = String((evt as CustomEvent<string>)?.detail || "").toLowerCase();
      if (next === "es" || next === "en") setLanguage(next);
    };

    window.addEventListener("botz-language-change", onLanguageChange as EventListener);
    return () => window.removeEventListener("botz-language-change", onLanguageChange as EventListener);
  }, []);

  React.useEffect(() => {
    const onResize = () => {
      if (typeof window === "undefined") return;
      setIsMobile(window.innerWidth < 980);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabaseAgents.auth.getSession();
      const u = data?.session?.user || null;
      if (!mounted) return;
      if (!u) router.replace("/start/agents");
    })();

    const { data: sub } = supabaseAgents.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) router.replace("/start/agents");
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  const list = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return TEMPLATES.filter(t => {
      const okCat = (cat === "All Templates") ? true : t.category === cat;
      const okQ = !qq ? true : (t.name.toLowerCase().includes(qq) || t.description.toLowerCase().includes(qq));
      return okCat && okQ;
    });
  }, [cat, q]);

  const flex = (extra?: React.CSSProperties): React.CSSProperties => ({ display: "flex", ...extra });
  const col = (extra?: React.CSSProperties): React.CSSProperties => ({ display: "flex", flexDirection: "column", ...extra });
  const input = (extra?: React.CSSProperties): React.CSSProperties => ({
    width: "100%",
    boxSizing: "border-box" as const,
    padding: "13px 16px",
    backgroundColor: C.dark,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    color: C.white,
    fontSize: 14,
    outline: "none",
    ...extra,
  });

  const createFlowFromTemplate = async (tpl: FlowTemplate | null) => {
    setCreating(tpl?.id || "scratch");
    try {
      const name = tpl ? tpl.name : "New Flow";
      const templateId = tpl?.id || "";
      const templateConfig = templateId === plantillaParaLlamar.id ? plantillaParaLlamar.config : undefined;
      const cfg: any = {
        flow: {
          template_id: templateId,
          nodes: tpl?.nodes || [],
          edges: tpl?.edges || [],
          template_config: templateConfig || undefined,
        },
      };

      const res = await authedFetch("/api/flows/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: tpl?.description || "",
          configuration: cfg,
          status: "draft",
        }),
      });

      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo crear");
      router.push(`/start/flows/${json.data.id}`);
    } catch (e) {
      if (e instanceof AuthRequiredError) {
        router.replace("/start/agents");
        return;
      }
      console.error(e);
      const msg = (e as any)?.message || "No se pudo crear el flujo";
      alert(`No se pudo crear el flujo: ${msg}`);
    } finally {
      setCreating(null);
    }
  };

  return (
    <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,.55)",
          zIndex: 120,
          overflow: "auto",
          padding: isMobile ? "64px 8px 8px" : "72px 18px 18px",
          boxSizing: "border-box",
        }}
      >
      <div
        style={{
          position: "relative",
          minHeight: "calc(100vh - 90px)",
          backgroundColor: C.bg,
          border: `1px solid ${C.border}`,
          borderRadius: 18,
          overflow: "hidden",
          fontFamily: "Inter,-apple-system,sans-serif",
          color: C.white,
        }}
      >
        <button
          onClick={() => router.push("/start/agents")}
          style={{ position: "absolute", top: 14, right: 18, background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 22, zIndex: 5 }}
          aria-label="Close"
        >
          ×
        </button>

        <div style={{ ...flex({ flexDirection: isMobile ? "column" : "row" }), height: "100%" }}>
          {/* left categories */}
            <aside style={{ width: isMobile ? "100%" : 230, backgroundColor: C.sidebar, borderRight: isMobile ? "none" : `1px solid ${C.border}`, borderBottom: isMobile ? `1px solid ${C.border}` : "none", padding: isMobile ? 12 : 18 }}>
              <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 14, color: C.white }}>{tr("Todas las plantillas", "All Templates")}</div>
            <div style={{ display: "flex", flexDirection: isMobile ? "row" : "column", gap: 8, overflowX: isMobile ? "auto" : "visible" }}>
            {VISIBLE_CATEGORIES.map(c => {
              const count = c === "All Templates" ? TEMPLATES.length : TEMPLATES.filter(t => t.category === c).length;
              return (
              <button
                key={c}
                onClick={() => setCat(c)}
                style={{
                  width: isMobile ? "auto" : "100%",
                  textAlign: "left",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "10px 10px",
                  borderRadius: 10,
                  color: cat === c ? C.white : C.muted,
                  fontWeight: cat === c ? 900 : 700,
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {c} <span style={{ color: C.dim, fontWeight: 800 }}>({count})</span>
              </button>
              );
            })}
            </div>
          </aside>

          {/* main */}
          <div style={{ flex: 1, minWidth: 0, padding: isMobile ? 12 : 22, overflow: "auto" }}>
            <div style={{ fontSize: isMobile ? 24 : 34, fontWeight: 900, marginBottom: 6 }}>{tr("Todas las Plantillas", "All Templates")}</div>
            <div style={{ color: C.muted, fontSize: isMobile ? 14 : 16, marginBottom: 18 }}>{tr("Ahorra tiempo, destácate y obtén resultados.", "Save time, stand out, and get results.")}</div>

            <div style={{ ...flex({ alignItems: "center", gap: 12 }), marginBottom: 16 }}>
              <div style={{ flex: 1, position: "relative" }}>
                <div style={{ position: "absolute", left: 14, top: 12, color: C.dim }}>⌕</div>
                <input
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="OpenAI, Notion, Google Sheets..."
                  style={input({ paddingLeft: 38 })}
                />
              </div>
            </div>

            <button
              onClick={() => createFlowFromTemplate(null)}
              disabled={!!creating}
              style={{
                ...flex({ alignItems: "center", gap: 12 }),
                width: "100%",
                backgroundColor: "transparent",
                border: "none",
                padding: "12px 6px",
                cursor: creating ? "not-allowed" : "pointer",
                color: C.white,
                fontWeight: 900,
                fontSize: 18,
                marginBottom: 10,
              }}
            >
              <span style={{ width: 28, height: 28, borderRadius: 999, border: `1px solid ${C.border}`, ...flex({ alignItems: "center", justifyContent: "center" }), color: C.white }}>
                +
              </span>
              {tr("Nuevo flujo desde cero", "New Flow From Scratch")}
            </button>

            <div style={{ color: C.muted, fontWeight: 900, margin: "12px 0 12px" }}>
              {cat} ({list.length})
            </div>

            <div style={{ height: isMobile ? "auto" : "calc(100% - 220px)", overflow: "auto", paddingRight: isMobile ? 0 : 6 }}>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 14 }}>
                {list.map(t => (
                  <button
                    key={t.id}
                    onClick={() => createFlowFromTemplate(t)}
                    disabled={!!creating}
                    style={{
                      backgroundColor: C.card,
                      border: `1px solid ${creating === t.id ? C.lime : C.border}`,
                      borderRadius: 16,
                      padding: 18,
                      minHeight: 170,
                      cursor: creating ? "not-allowed" : "pointer",
                      textAlign: "left",
                      color: C.white,
                    }}
                  >
                    <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 8, lineHeight: 1.15, overflowWrap: "anywhere", wordBreak: "break-word" }}>
                      {trTplName(t.name)}
                    </div>
                    <div style={{ color: C.muted, fontSize: 13, minHeight: 32, lineHeight: 1.4 }}>
                      {trTpl(t.description)}
                    </div>
                    <div style={{ ...flex({ alignItems: "center", gap: 10 }), marginTop: 14 }}>
                      {t.badges.map((b, i) => (
                        <span key={i} style={{ width: 30, height: 30, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, ...flex({ alignItems: "center", justifyContent: "center" }), fontSize: 14 }}>
                          {b}
                        </span>
                      ))}
                    </div>
                    <div style={{ marginTop: 18, paddingTop: 12, borderTop: `1px solid ${C.border}`, color: C.dim, fontSize: 12, ...flex({ alignItems: "center", justifyContent: "space-between" }) }}>
                      <span>Created by {t.createdBy}</span>
                      <span style={{ color: C.dim }}>{creating === t.id ? "Creating..." : ""}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {isMobile && (
              <div style={{ marginTop: 14 }}>
                <button
                  onClick={() => router.push("/start/agents")}
                  style={{ width: "100%", borderRadius: 12, border: `1px solid ${C.border}`, background: "transparent", color: C.white, padding: "11px 12px", cursor: "pointer", fontWeight: 900 }}
                >
                  ← Volver a Agentes
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
