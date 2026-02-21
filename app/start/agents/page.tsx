"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseAgents } from "./supabaseAgentsClient";
import AuthModal from "@/app/start/agents/components/AgentsAuthModal";
import { authedFetch, AuthRequiredError } from "./authedFetchAgents";

interface Agent {
  id: string;
  name: string;
  type: "voice" | "text" | "flow";
  status: "draft" | "active" | "paused";
  description: string;
  total_conversations: number;
  credits_used?: number;
  created_at: string;
}

interface UsageEvent {
  id: string;
  endpoint: string;
  action: string;
  credits_delta: number;
  created_at: string;
}

const C = {
  bg:      "#1a1d26",
  sidebar: "#15181f",
  card:    "#22262d",
  hover:   "#2a2e36",
  border:  "rgba(255,255,255,0.07)",
  blue:    "#0096ff",
  lime:    "#a3e635",
  white:   "#ffffff",
  muted:   "#9ca3af",
  dim:     "#6b7280",
};

export default function AgentStudio() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [user,   setUser]   = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [openAuth, setOpenAuth] = useState(false);
  const [search, setSearch] = useState("");
  const [subPlan, setSubPlan] = useState<string>("free");
  const [subStatus, setSubStatus] = useState<string>("inactive");
  const [trialEnd, setTrialEnd] = useState<string | null>(null);
  const [entCreditsUsed, setEntCreditsUsed] = useState<number | null>(null);
  const [usageEvents, setUsageEvents] = useState<UsageEvent[]>([]);
  const [usageSummary, setUsageSummary] = useState<{ today: number; seven_days: number; top_endpoint: string }>({ today: 0, seven_days: 0, top_endpoint: "-" });
  const [usageMissingTable, setUsageMissingTable] = useState(false);
  const [usageHoverIdx, setUsageHoverIdx] = useState<number | null>(null);
  const [renameModal, setRenameModal] = useState<{ id: string; current: string } | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // ✅ IMPORTANTE: Agentes requiere login COMPLETAMENTE independiente
  // Solo comparte sesión si es específicamente de Agentes
  useEffect(() => {
    let mounted = true;
    
    const initAgents = async () => {
      // Verificar si ya hay sesión activa
      const { data } = await supabaseAgents.auth.getSession();
      const sessionUser = data?.session?.user || null;
      
      console.log("🔑 [Agentes] Init check:", { 
        user: sessionUser?.email || "No session", 
        userMetadata: sessionUser?.user_metadata 
      });
      
      if (!mounted) return;
      
      if (sessionUser) {
        setUser(sessionUser);
        setAuthLoading(false);
        setOpenAuth(false);
        fetchAgents();
        fetchEntitlement();
        fetchUsage();
        return;
      }

      setUser(null);
      setAuthLoading(false);
      setOpenAuth(true);
    };
    
    initAgents();

    const { data: { subscription } } = supabaseAgents.auth.onAuthStateChange((event, session) => {
      const u = session?.user || null;
      console.log("🔑 [Agentes] Auth event:", event, "User:", u?.email || "No user");
      
      if (event === "SIGNED_IN" && u) {
        // Marcar como modo Agentes al hacer login exitoso
        if (typeof window !== "undefined") {
          localStorage.setItem("botz-agents-mode", "true");
          console.log("✅ [Agentes] Login exitoso - Marcado como modo Agentes");
        }
        setUser(u);
        setOpenAuth(false);
        fetchAgents();
        fetchEntitlement();
        fetchUsage();
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setOpenAuth(true);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Fallback: keep local UI in sync with Supabase session.
  useEffect(() => {
    let alive = true;
    const sync = async () => {
      try {
        const { data } = await supabaseAgents.auth.getSession();
        const u = data?.session?.user || null;
        if (!alive) return;

        setUser(u);
        setOpenAuth(!u);
      } catch {
        // ignore
      }
    };

    const timer = setInterval(sync, 12000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  const fetchEntitlement = async () => {
    try {
      const res = await authedFetch("/api/agents/entitlement");
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo cargar el plan");

      const ent = json.data || {};
      setSubPlan(String(ent.plan_key || "pro"));
      setSubStatus(String(ent.status || "trial"));
      setTrialEnd(ent.trial_end ? String(ent.trial_end) : null);
      setEntCreditsUsed(Number(json.credits_used_total ?? ent.credits_used ?? 0));
    } catch (e) {
      if (e instanceof AuthRequiredError) {
        setOpenAuth(true);
        return;
      }
      // If entitlement isn't available yet, keep defaults.
      setSubPlan("pro");
      setSubStatus("trial");
    }
  };

  const fetchAgents = async () => {
    try {
      const res = await authedFetch("/api/agents/list");
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo cargar");
      setAgents(json.data || []);
    } catch (e) {
      if (e instanceof AuthRequiredError) setOpenAuth(true);
      console.error(e);
      setAgents([]);
    }
  };

  const fetchUsage = async () => {
    try {
      const res = await authedFetch("/api/agents/usage?limit=400");
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo cargar uso");
      setUsageEvents(Array.isArray(json.data) ? json.data : []);
      setUsageMissingTable(Boolean(json?.missing_table));
      setUsageSummary({
        today: Number(json?.summary?.today || 0),
        seven_days: Number(json?.summary?.seven_days || 0),
        top_endpoint: String(json?.summary?.top_endpoint || "-"),
      });
    } catch (e) {
      console.error(e);
      setUsageEvents([]);
      setUsageMissingTable(false);
      setUsageSummary({ today: 0, seven_days: 0, top_endpoint: "-" });
    }
  };

  const usageChart = useMemo(() => {
    const days = 30;
    const labels: string[] = [];
    const voice: number[] = [];
    const flow: number[] = [];
    const text: number[] = [];
    const map = new Map<string, { voice: number; flow: number; text: number }>();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      labels.push(key.slice(5));
      map.set(key, { voice: 0, flow: 0, text: 0 });
    }

    for (const ev of usageEvents) {
      const key = String(ev.created_at || "").slice(0, 10);
      const row = map.get(key);
      if (!row) continue;
      const ep = String(ev.endpoint || "");
      const delta = Number(ev.credits_delta || 0) || 0;
      if (ep.includes("/flows/")) row.flow += delta;
      else if (ep.includes("chat-test")) row.text += delta;
      else row.voice += delta;
    }

    for (const k of map.keys()) {
      const r = map.get(k)!;
      voice.push(r.voice);
      flow.push(r.flow);
      text.push(r.text);
    }

    const max = Math.max(1, ...voice, ...flow, ...text);
    return { labels, voice, flow, text, max };
  }, [usageEvents]);

  const updateAgent = async (id: string, patch: Record<string, any>) => {
    const res = await authedFetch("/api/agents/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, patch }),
    });
    const json = await res.json();
    if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo actualizar");
  };

  const openAgent = (agent: Agent) => {
    router.push(agent.type === "flow" ? `/start/flows/${agent.id}` : `/start/agents/${agent.id}`);
  };

  const togglePublic = async (agent: Agent) => {
    try {
      const next = agent.status === "active" ? "draft" : "active";
      await updateAgent(agent.id, { status: next });
      await fetchAgents();
    } catch (e) {
      console.error(e);
    }
  };

  const duplicateAgent = async (agent: Agent) => {
    try {
      const res = await authedFetch("/api/agents/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${agent.name} (copia)`,
          type: agent.type,
          description: agent.description,
          configuration: (agent as any).configuration || {},
          status: "draft",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo duplicar");
      await fetchAgents();
    } catch (e) {
      console.error(e);
    }
  };

  const deleteAgent = async (agent: Agent) => {
    try {
      await updateAgent(agent.id, { status: "archived" });
      await fetchAgents();
    } catch (e) {
      console.error(e);
    }
  };

  const renameAgent = async (agent: Agent) => {
    setRenameModal({ id: agent.id, current: agent.name || "" });
    setRenameValue(agent.name || "");
  };

  const confirmRenameAgent = async () => {
    if (!renameModal) return;
    const name = renameValue.trim();
    if (!name || name === renameModal.current) {
      setRenameModal(null);
      setRenameValue("");
      return;
    }
    try {
      await updateAgent(renameModal.id, { name });
      await fetchAgents();
    } catch (e) {
      console.error(e);
    } finally {
      setRenameModal(null);
      setRenameValue("");
    }
  };

  // Resilience: refresh session + data on focus.
  useEffect(() => {
    if (!user?.id) return;
    let alive = true;

    const refresh = async () => {
      if (!alive) return;
      try {
        await supabaseAgents.auth.refreshSession();
      } catch {
        // ignore
      }
      if (!alive) return;
      fetchEntitlement();
      fetchAgents();
      fetchUsage();
    };

    const onFocus = () => refresh();
    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    const usageTimer = setInterval(() => {
      if (alive) fetchUsage();
    }, 15000);
    return () => {
      alive = false;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
      clearInterval(usageTimer);
    };
  }, [user?.id]);

  const cards = [
    { id: "voice",     title: "Crear Agente de Voz"  },
    { id: "text",      title: "Crear Agente de Texto" },
    { id: "flow",      title: "Crear Flujo"           },
    { id: "notetaker", title: "Configurar Notetaker"  },
  ];

  const templates = [
    {
      id: "lia",
      name: "Lía",
      cat: "Calificación de leads entrantes",
      emoji: "🎯",
      gender: "f" as const,
      demo: "Hola, soy Lia de Botz. Te ayudo a calificar leads en menos de dos minutos.",
      convo: [
        { who: "Botz", text: "Hola, soy Lía de Botz. ¿Te puedo hacer tres preguntas rápidas para calificar tu interés?" },
        { who: "Cliente", text: "Sí, claro." },
        { who: "Botz", text: "Perfecto. ¿Cuál es tu objetivo y en qué plazo lo quieres resolver?" },
      ],
    },
    {
      id: "alex",
      name: "Bruno",
      cat: "Llamadas en frío salientes",
      emoji: "📞",
      gender: "m" as const,
      demo: "Hola, soy Bruno de Botz. Te llamo para validar interés y agendar una llamada comercial.",
      convo: [
        { who: "Botz", text: "Hola, te habla Bruno de Botz. Te llamo porque vi que tu equipo está creciendo." },
        { who: "Cliente", text: "Sí, estamos buscando automatizar parte del proceso comercial." },
        { who: "Botz", text: "Excelente. Si te parece, te agendo una demo de 15 minutos esta semana." },
      ],
    },
    {
      id: "julia",
      name: "Sofía",
      cat: "Asistente recepcionista",
      emoji: "💬",
      gender: "f" as const,
      demo: "Hola, soy Sofía, tu recepcionista virtual. Puedo tomar datos y dirigir tu consulta al área correcta.",
      convo: [
        { who: "Botz", text: "Hola, soy Sofía, asistente virtual de Botz. ¿Tu consulta es de ventas, soporte o facturación?" },
        { who: "Cliente", text: "Es sobre soporte técnico." },
        { who: "Botz", text: "Gracias. Te conecto con soporte y dejo tu ticket registrado ahora mismo." },
      ],
    },
  ];
  type Template = typeof templates[number];
  const [playingTemplateId, setPlayingTemplateId] = useState<string | null>(null);
  const [exampleTemplate, setExampleTemplate] = useState<Template | null>(null);
  const [exampleLineIdx, setExampleLineIdx] = useState(0);

  const stopPreviewVoice = () => {
    try {
      window.speechSynthesis.cancel();
    } catch {}
    setPlayingTemplateId(null);
  };

  const playPreviewVoice = (t: typeof templates[number]) => {
    try {
      const synth = window.speechSynthesis;
      synth.cancel();
      const utter = new SpeechSynthesisUtterance(t.demo);
      utter.lang = "es-ES";
      utter.rate = 1;
      utter.pitch = t.gender === "f" ? 1.15 : 0.9;

      const voices = synth.getVoices();
      const esVoices = voices.filter(v => v.lang.toLowerCase().startsWith("es"));
      const femaleHint = /(female|mujer|paulina|monica|maria|helena|sofia)/i;
      const maleHint = /(male|hombre|jorge|diego|carlos|enrique|pablo)/i;
      const voice = t.gender === "f"
        ? esVoices.find(v => femaleHint.test(v.name)) || esVoices[0]
        : esVoices.find(v => maleHint.test(v.name)) || esVoices[0];
      if (voice) utter.voice = voice;

      utter.onend = () => setPlayingTemplateId(null);
      utter.onerror = () => setPlayingTemplateId(null);
      setPlayingTemplateId(t.id);
      synth.speak(utter);
    } catch {
      setPlayingTemplateId(null);
    }
  };

  useEffect(() => {
    return () => {
      try { window.speechSynthesis.cancel(); } catch {}
    };
  }, []);

  useEffect(() => {
    if (!exampleTemplate) return;
    setExampleLineIdx(0);
    const timer = window.setInterval(() => {
      setExampleLineIdx((i) => ((i + 1) % Math.max(1, exampleTemplate.convo.length)));
    }, 1900);
    return () => window.clearInterval(timer);
  }, [exampleTemplate]);

  const listType = (searchParams.get("type") || "").toLowerCase();

  const filtered = agents
    .filter(a => String((a as any).status || "").toLowerCase() !== "archived")
    .filter(a => (listType === "voice" || listType === "text" || listType === "flow") ? a.type === listType : true)
    .filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  const listTitle = listType === "voice" ? "Agentes de Voz" : listType === "text" ? "Agentes de Texto" : listType === "flow" ? "Flujos" : "Actividad reciente";

  const creditsUsedFromAgents = useMemo(() => {
    return (agents || []).reduce((sum, a) => sum + (Number(a.credits_used || 0) || 0), 0);
  }, [agents]);

  const creditsUsedTotal = entCreditsUsed == null ? creditsUsedFromAgents : entCreditsUsed;

  const planTier = useMemo(() => {
    const p = String(subPlan || "pro").toLowerCase();
    if (p === "prime") return "prime";
    if (p === "scale") return "scale";
    return "pro";
  }, [subPlan]);

  const planInfo = useMemo(() => {
    if (planTier === "prime") return { name: "Prime", price: "US$1,499.00", credits: 1500000 };
    if (planTier === "scale") return { name: "Scale Up", price: "US$499.00", credits: 500000 };
    return { name: "Pro", price: "US$99.00", credits: 2000 };
  }, [planTier]);

  const allPlans = useMemo(() => {
    return [
      { key: "pro", name: "Pro", price: "US$99.00", credits: 2000 },
      { key: "scale", name: "Scale Up", price: "US$499.00", credits: 500000 },
      { key: "prime", name: "Prime", price: "US$1,499.00", credits: 1500000 },
    ] as const;
  }, []);

  const trialInfo = useMemo(() => {
    if (String(subStatus) !== "trial") return { label: "", daysLeft: null as number | null, expired: false };
    if (!trialEnd) return { label: "Trial activo", daysLeft: null as number | null, expired: false };
    const end = new Date(trialEnd);
    if (Number.isNaN(end.getTime())) return { label: "Trial activo", daysLeft: null as number | null, expired: false };
    const msLeft = end.getTime() - Date.now();
    const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000));
    if (daysLeft <= 0) return { label: "Trial terminado", daysLeft: 0, expired: true };
    return { label: `Trial: ${daysLeft} dias restantes`, daysLeft, expired: false };
  }, [subStatus, trialEnd]);

  const isBlocked = useMemo(() => {
    if (String(subStatus) === "blocked") return true;
    if (trialInfo.expired) return true;
    if (creditsUsedTotal >= planInfo.credits) return true;
    return false;
  }, [subStatus, trialInfo.expired, creditsUsedTotal, planInfo.credits]);

  const fmt = (n: number) => {
    try {
      return new Intl.NumberFormat("en-US").format(Math.max(0, Math.floor(n || 0)));
    } catch {
      return String(Math.max(0, Math.floor(n || 0)));
    }
  };

  const formatCredits = (value: number) => {
    const n = Math.max(0, Number(value) || 0);
    if (n < 1000) return String(Math.round(n));
    if (n < 1000000) {
      const k = n / 1000;
      return `${k >= 10 ? Math.round(k) : Number(k.toFixed(1))}K`;
    }
    const m = n / 1000000;
    return `${m >= 10 ? Math.round(m) : Number(m.toFixed(1))}M`;
  };

  const usagePct = Math.min(100, (creditsUsedTotal / Math.max(1, planInfo.credits)) * 100);
  const usagePctDisplay =
    usagePct <= 0
      ? 0
      : usagePct < 2
      ? Math.min(100, 2 + usagePct * 9)
      : usagePct < 10
      ? Math.min(100, 20 + (usagePct - 2) * 3)
      : usagePct;
  const usageTone = usagePct >= 100 ? "danger" : usagePct >= 80 ? "warning" : "normal";
  const showWarn80 = usagePct >= 80 && usagePct < 90;
  const showWarn90 = usagePct >= 90 && usagePct < 100;
  const usageBarBg =
    usageTone === "danger"
      ? "linear-gradient(90deg, #ef4444, #dc2626)"
      : usageTone === "warning"
      ? "linear-gradient(90deg, #f59e0b, #d97706)"
      : "linear-gradient(90deg, #0ea5e9, #2563eb)";

  const typeColor = (t: string) =>
    t === "voice" ? { bg: "rgba(239,68,68,.15)",   fg: "#f87171" } :
    t === "text"  ? { bg: `${C.blue}22`,            fg: C.blue    } :
                    { bg: "rgba(139,92,246,.15)",    fg: "#a78bfa" };

  /* ---------- styles ---------- */
  const flex = (extra?: object): React.CSSProperties => ({ display: "flex", ...extra });
  const col  = (extra?: object): React.CSSProperties => ({ display: "flex", flexDirection: "column", ...extra });

  return (
    <div style={{ ...flex(), minHeight: "100vh", backgroundColor: C.bg, fontFamily: "Inter,-apple-system,sans-serif", color: C.white }}>

       <AuthModal
         open={openAuth}
         onClose={() => {
           setOpenAuth(false);
           router.push("/");
         }}
          onLoggedIn={() => {
            setOpenAuth(false);
            fetchAgents();
          }}
        />

      {/* ════════ SIDEBAR ════════ */}
      <aside style={{ ...col(), width: 260, minWidth: 260, backgroundColor: C.sidebar, borderRight: `1px solid ${C.border}`, position: "fixed", top: 0, left: 0, bottom: 0 }}>

        {/* Logo */}
        <div style={{ ...flex({ alignItems: "center", gap: 10 }), padding: "20px 16px 10px" }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: C.blue, ...flex({ alignItems: "center", justifyContent: "center" }) }}>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 18 }}>B</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: 22 }}>Botz</span>
          <span style={{ marginLeft: "auto", color: C.dim, cursor: "pointer" }}>«</span>
        </div>

        {/* Workspace */}
        <div style={{ padding: "0 12px 14px" }}>
          <div style={{ ...flex({ alignItems: "center", justifyContent: "space-between" }), padding: "10px 12px", borderRadius: 12, backgroundColor: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}` }}>
            <div style={flex({ alignItems: "center", gap: 10 })}>
              <div style={{ width: 26, height: 26, borderRadius: 10, backgroundColor: `${C.blue}22`, display: "flex", alignItems: "center", justifyContent: "center", color: C.blue, fontWeight: 900, fontSize: 12 }}>
                B
              </div>
              <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
                <span style={{ color: C.white, fontSize: 14, fontWeight: 900 }}>Botz</span>
                <span style={{ color: C.dim, fontSize: 12 }}>{subStatus === "trial" ? (trialInfo.label || "Trial") : planInfo.name}</span>
              </div>
            </div>
            <span style={{ color: C.dim, fontWeight: 900 }}>•</span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: "0 12px", flex: 1 }}>
          <button
            onClick={() => router.push("/start")}
            style={{ ...flex({ alignItems: "center", gap: 10 }), padding: "10px 12px", borderRadius: 12, marginBottom: 6, cursor: "pointer", width: "100%", backgroundColor: "transparent", border: "none", textAlign: "left" }}
          >
            <span style={{ width: 22, textAlign: "center" }}>🏠</span>
            <span style={{ color: C.muted, fontSize: 14, fontWeight: 800 }}>Inicio</span>
          </button>
          <div style={{ ...flex({ alignItems: "center", gap: 10 }), padding: "10px 12px", borderRadius: 12, backgroundColor: `${C.lime}14`, cursor: "default", border: `1px solid ${C.border}` }}>
            <span style={{ width: 22, textAlign: "center" }}>🤖</span>
            <span style={{ color: C.white, fontSize: 14, fontWeight: 900 }}>Agentes</span>
            <span style={{ marginLeft: "auto", fontSize: 11, padding: "2px 8px", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, color: C.muted, fontWeight: 900 }}>BETA</span>
          </div>
        </nav>

        {/* Plan / Usage */}
        <div style={{ padding: 12 }}>
          <div style={{ borderRadius: 16, padding: 16, background: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)", border: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ color: C.dim, fontSize: 11, fontWeight: 900, letterSpacing: 0.6 }}>PLAN</div>
                <div style={{ fontWeight: 900, fontSize: 16, marginTop: 4 }}>{planInfo.name}</div>
                <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{planInfo.price} / mes</div>
              </div>
              <div style={{ padding: "6px 10px", borderRadius: 999, border: `1px solid ${C.border}`, backgroundColor: "rgba(0,0,0,0.18)", color: C.lime, fontWeight: 900, fontSize: 12 }}>
                {fmt(planInfo.credits)} creditos
              </div>
            </div>

            <div style={{ height: 12 }} />

            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
              {allPlans.map(p => {
                const active = p.key === planTier;
                return (
                  <button
                    key={p.key}
                    onClick={() => router.push("/start/agents/plans")}
                    style={{
                      flex: "0 0 auto",
                      borderRadius: 12,
                      border: `1px solid ${active ? C.lime : C.border}`,
                      backgroundColor: active ? "rgba(163,230,53,0.08)" : "rgba(0,0,0,0.14)",
                      padding: "10px 10px",
                      cursor: "pointer",
                      color: C.white,
                      minWidth: 132,
                      textAlign: "left",
                    }}
                  >
                    <div style={{ fontWeight: 900, fontSize: 13 }}>{p.name}</div>
                    <div style={{ color: C.dim, fontSize: 12, marginTop: 2 }}>{p.price}/mo</div>
                    <div style={{ color: C.muted, fontSize: 12, marginTop: 6, fontWeight: 900 }}>{fmt(p.credits)} cr</div>
                  </button>
                );
              })}
            </div>

            <div style={{ ...flex({ justifyContent: "space-between" }), marginBottom: 6 }}>
              <span style={{ color: C.dim, fontSize: 12 }}>Creditos usados</span>
              <span style={{ fontSize: 12, fontWeight: 900, color: C.white }}>{formatCredits(creditsUsedTotal)} / {formatCredits(planInfo.credits)}</span>
            </div>
            <div style={{ height: 8, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 999, overflow: "hidden", border: `1px solid ${C.border}` }}>
              <div
                style={{
                  width: `${usagePctDisplay}%`,
                  minWidth: creditsUsedTotal > 0 ? 2 : 0,
                  height: "100%",
                  background: usageBarBg,
                  transition: "width .35s ease",
                }}
              />
            </div>

            {(showWarn80 || showWarn90) && (
              <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 10, border: `1px solid ${showWarn90 ? "rgba(239,68,68,0.45)" : "rgba(245,158,11,0.45)"}`, background: showWarn90 ? "rgba(239,68,68,0.10)" : "rgba(245,158,11,0.10)" }}>
                <div style={{ color: showWarn90 ? "#fca5a5" : "#fcd34d", fontSize: 12, fontWeight: 900 }}>
                  {showWarn90 ? "Te quedan muy pocos creditos (90%+ usado)" : "Vas por 80% de consumo"}
                </div>
                <button
                  onClick={() => router.push("/start/agents/plans")}
                  style={{ marginTop: 8, width: "100%", padding: "9px 0", borderRadius: 10, border: `1px solid ${C.lime}`, background: "transparent", color: C.lime, fontWeight: 900, cursor: "pointer", fontSize: 12 }}
                >
                  Recargar ahora
                </button>
              </div>
            )}

            {trialInfo.label && (
              <div style={{ marginTop: 10, color: C.muted, fontSize: 12 }}>
                {trialInfo.label}
              </div>
            )}

            <button
              onClick={() => router.push("/start/agents/plans")}
              style={{ width: "100%", marginTop: 12, padding: "10px 0", borderRadius: 12, border: `1px solid ${C.lime}`, backgroundColor: "transparent", color: C.lime, fontWeight: 900, fontSize: 13, cursor: "pointer" }}
            >
              Cambiar plan
            </button>
          </div>
        </div>

        {/* User */}
        <div style={{ ...flex({ alignItems: "center", gap: 10 }), padding: "12px 16px", borderTop: `1px solid ${C.border}` }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: C.blue, ...flex({ alignItems: "center", justifyContent: "center" }), color: "#fff", fontWeight: 600, fontSize: 13, flexShrink: 0 }}>
            {user?.email?.charAt(0).toUpperCase() || "U"}
          </div>
          <span style={{ color: C.muted, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user?.email || "usuario@email.com"}
          </span>
        </div>
      </aside>

       {/* ════════ MAIN ════════ */}
       <main style={{ ...col(), marginLeft: 260, flex: 1 }}>

         {isBlocked && (
           <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
             <div style={{ width: "92vw", maxWidth: 560, borderRadius: 18, border: `1px solid ${C.border}`, background: "linear-gradient(180deg, rgba(21,24,31,0.98), rgba(17,19,24,0.98))", padding: 18, boxShadow: "0 40px 120px rgba(0,0,0,0.6)" }}>
               <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 6 }}>Acceso pausado</div>
               <div style={{ color: C.muted, fontSize: 13, lineHeight: 1.55 }}>
                 {creditsUsedTotal >= planInfo.credits ? "Se agotaron tus creditos." : (trialInfo.expired ? "Tu trial de 3 dias termino." : "Tu cuenta esta bloqueada.")}
               </div>
                <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                  <button
                    onClick={() => router.push("/start/agents/plans")}
                    style={{ flex: 1, padding: "12px 14px", borderRadius: 12, border: "none", backgroundColor: C.lime, color: "#111", fontWeight: 900, cursor: "pointer" }}
                  >
                    Recargar ahora
                  </button>
                 <button
                   onClick={async () => {
                     try { await supabaseAgents.auth.signOut(); } catch {}
                     router.push("/");
                   }}
                   style={{ flex: 1, padding: "12px 14px", borderRadius: 12, border: `1px solid ${C.border}`, backgroundColor: "transparent", color: C.white, fontWeight: 900, cursor: "pointer" }}
                 >
                   Cerrar sesion
                 </button>
               </div>
             </div>
           </div>
         )}

        {/* body */}
          <div style={{ padding: "44px 40px", overflowY: "auto" }}>

          <h1 style={{ fontSize: 30, fontWeight: 800, margin: "0 0 6px" }}>
            Hola {user?.email?.split("@")[0] || (authLoading ? "..." : "Usuario")}
          </h1>
          <p style={{ color: C.muted, fontSize: 16, margin: "0 0 34px" }}>¿Qué quieres crear hoy?</p>

          {/* 4-col creation cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18, marginBottom: 36 }}>
            {cards.map(card => (
              <button
                key={card.id}
                onClick={() => {
                  if (card.id === "notetaker") {
                    router.push("/start/agents/notetaker");
                    return;
                  }
                  if (card.id === "flow") {
                    router.push("/start/flows/templates");
                    return;
                  }
                  router.push(`/start/agents/create?type=${card.id}`);
                }}
                style={{ ...col(), backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: "24px 22px 18px", cursor: "pointer", textAlign: "left", minHeight: 200, transition: "background .15s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = C.hover; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = C.card;  }}
              >
                <span style={{ color: C.white, fontWeight: 800, fontSize: 15, lineHeight: 1.25 }}>{card.title}</span>
                <span style={{ textAlign: "center", fontSize: 64, marginTop: "auto", paddingTop: 16, lineHeight: 1 }}>🤖</span>
              </button>
            ))}
          </div>

          {/* templates */}
          <p style={{ color: "#b8c3d9", fontSize: 15, margin: "0 0 14px", letterSpacing: 0.2 }}>○ inicia con casos de uso populares</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 32 }}>
            {templates.map(t => (
              <div
                key={t.id}
                onClick={() => router.push(`/start/agents/create?template=${t.id}`)}
                style={{ ...flex({ alignItems: "center", gap: 16 }), background: "linear-gradient(180deg, rgba(27,33,46,0.98), rgba(21,27,39,0.98))", border: "1px solid rgba(89,108,141,0.34)", borderRadius: 16, padding: "18px 20px", cursor: "pointer", textAlign: "left", minHeight: 92 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "linear-gradient(180deg, rgba(32,40,56,0.98), rgba(24,31,46,0.98))"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "linear-gradient(180deg, rgba(27,33,46,0.98), rgba(21,27,39,0.98))"; }}
                role="button"
              >
                <div style={{ width: 70, height: 70, borderRadius: "50%", background: "radial-gradient(circle at 30% 30%, rgba(0,150,255,0.26), rgba(163,230,53,0.20))", border: "1px solid rgba(89,108,141,0.42)", ...flex({ alignItems: "center", justifyContent: "center" }), fontSize: 32, flexShrink: 0 }}>
                  {t.emoji}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 900, fontSize: 15, lineHeight: 1.1 }}>{t.name}</div>
                  <div style={{ color: C.muted, fontSize: 14, marginTop: 6 }}>{t.cat}</div>
                  <div style={{ color: C.dim, fontSize: 12, marginTop: 4 }}>{t.gender === "f" ? "Voz femenina" : "Voz masculina"}</div>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (playingTemplateId === t.id) stopPreviewVoice();
                      else playPreviewVoice(t);
                    }}
                    style={{ borderRadius: 10, border: `1px solid ${playingTemplateId === t.id ? "rgba(0,150,255,0.65)" : "rgba(89,108,141,0.45)"}`, background: playingTemplateId === t.id ? "rgba(0,150,255,0.16)" : "transparent", color: playingTemplateId === t.id ? "#66c6ff" : C.white, padding: "8px 10px", cursor: "pointer", fontSize: 12, fontWeight: 800 }}
                  >
                    {playingTemplateId === t.id ? "Detener" : "Probar voz"}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExampleTemplate(t);
                    }}
                    style={{ borderRadius: 10, border: "none", background: `${C.lime}cc`, color: "#111", padding: "8px 10px", cursor: "pointer", fontSize: 12, fontWeight: 900 }}
                  >
                    Usar
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* usage dashboard */}
          <div style={{ marginBottom: 26, borderRadius: 14, border: "1px solid rgba(56,189,248,0.22)", background: "linear-gradient(180deg, rgba(24,30,44,0.98), rgba(20,25,38,0.98))", overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(148,163,184,0.18)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ color: C.white, fontSize: 24, fontWeight: 900 }}>Creditos usados: {fmt(entCreditsUsed || 0)}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ color: C.muted, fontSize: 12 }}>
                  {usageChart.labels[0] || "-"} - {usageChart.labels[usageChart.labels.length - 1] || "-"}
                </span>
                <button onClick={() => fetchUsage()} style={{ border: "1px solid rgba(148,163,184,0.25)", background: "transparent", color: C.white, borderRadius: 8, padding: "6px 10px", fontSize: 12, cursor: "pointer" }}>Actualizar</button>
              </div>
            </div>

            <div style={{ padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 26, marginBottom: 10 }}>
                <span style={{ color: "#a78bfa", fontSize: 13, fontWeight: 800 }}>● Agentes de Voz</span>
                <span style={{ color: "#34d399", fontSize: 13, fontWeight: 800 }}>● Flow Studio</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "48px 1fr", gap: 8 }}>
                <div style={{ display: "grid", alignContent: "space-between", minHeight: 250, color: C.dim, fontSize: 12, paddingBottom: 20 }}>
                  {[1, 0.8, 0.6, 0.4, 0.2, 0].map((m, idx) => (
                    <span key={idx}>{Math.round(usageChart.max * m)}</span>
                  ))}
                </div>

                <div style={{ borderRadius: 10, border: "1px solid rgba(148,163,184,0.2)", background: "rgba(15,23,42,0.45)", padding: "8px 8px 10px", overflowX: "auto" }}>
                  <div style={{ minWidth: 760 }}>
                    <svg
                      viewBox="0 0 900 210"
                      style={{ width: "100%", height: 210, display: "block" }}
                      onMouseLeave={() => setUsageHoverIdx(null)}
                    >
                      {[0, 0.2, 0.4, 0.6, 0.8, 1].map((m, i) => {
                        const y = 190 - m * 170;
                        return (
                          <line
                            key={i}
                            x1={20}
                            y1={y}
                            x2={880}
                            y2={y}
                            stroke="rgba(148,163,184,0.16)"
                            strokeWidth="1"
                          />
                        );
                      })}

                      <polyline
                        fill="none"
                        stroke="#a78bfa"
                        strokeWidth="2.6"
                        points={usageChart.voice.map((v, i) => {
                          const x = 24 + (i * (852 / Math.max(1, usageChart.labels.length - 1)));
                          const y = 190 - ((v || 0) / usageChart.max) * 170;
                          return `${x},${y}`;
                        }).join(" ")}
                      />

                      <polyline
                        fill="none"
                        stroke="#34d399"
                        strokeWidth="2.6"
                        points={usageChart.flow.map((v, i) => {
                          const x = 24 + (i * (852 / Math.max(1, usageChart.labels.length - 1)));
                          const y = 190 - ((v || 0) / usageChart.max) * 170;
                          return `${x},${y}`;
                        }).join(" ")}
                      />

                      {usageChart.labels.map((label, i) => {
                        const x = 24 + (i * (852 / Math.max(1, usageChart.labels.length - 1)));
                        const vy = 190 - ((usageChart.voice[i] || 0) / usageChart.max) * 170;
                        const fy = 190 - ((usageChart.flow[i] || 0) / usageChart.max) * 170;
                        return (
                          <g key={`${label}-${i}`}>
                            <rect
                              x={Math.max(0, x - (852 / Math.max(1, usageChart.labels.length - 1)) / 2)}
                              y={0}
                              width={Math.max(14, (852 / Math.max(1, usageChart.labels.length - 1)))}
                              height={210}
                              fill="transparent"
                              onMouseEnter={() => setUsageHoverIdx(i)}
                            />
                            <circle cx={x} cy={vy} r="2.2" fill="#a78bfa" />
                            <circle cx={x} cy={fy} r="2.2" fill="#34d399" />
                            <text x={x} y={205} textAnchor="middle" fontSize="10" fill="#6b7280">{label}</text>
                          </g>
                        );
                      })}

                      {usageHoverIdx !== null && usageChart.labels[usageHoverIdx] && (() => {
                        const i = usageHoverIdx;
                        const x = 24 + (i * (852 / Math.max(1, usageChart.labels.length - 1)));
                        const v = usageChart.voice[i] || 0;
                        const f = usageChart.flow[i] || 0;
                        const yRef = 190 - (Math.max(v, f) / usageChart.max) * 170;
                        const tx = Math.max(110, Math.min(790, x));
                        const ty = Math.max(12, yRef - 84);
                        return (
                          <g>
                            <rect x={tx - 86} y={ty} width={172} height={72} rx={8} fill="rgba(3,7,18,0.96)" stroke="rgba(148,163,184,0.35)" />
                            <text x={tx - 72} y={ty + 18} fill="#ffffff" fontSize="12" fontWeight="700">{usageChart.labels[i]}</text>
                            <rect x={tx - 72} y={ty + 28} width={10} height={10} fill="#a78bfa" />
                            <text x={tx - 58} y={ty + 37} fill="#e5e7eb" fontSize="12">Agentes de Voz: {fmt(v)}</text>
                            <rect x={tx - 72} y={ty + 46} width={10} height={10} fill="#34d399" />
                            <text x={tx - 58} y={ty + 55} fill="#e5e7eb" fontSize="12">Flow Studio: {fmt(f)}</text>
                          </g>
                        );
                      })()}
                    </svg>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 10, color: C.muted, fontSize: 12 }}>
                Total acumulado real: <span style={{ color: C.white, fontWeight: 900 }}>{fmt(entCreditsUsed || 0)} cr</span>
              </div>
              {usageMissingTable && (
                <div style={{ marginTop: 8, color: "#fca5a5", fontSize: 12 }}>
                  Falta crear la tabla de eventos (migration 015), por eso el grafico no recibe trazas reales todavia.
                </div>
              )}
            </div>
          </div>

          {/* activity header */}
          <div style={{ ...flex({ alignItems: "center", justifyContent: "space-between" }), marginBottom: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{listTitle}</h3>
          </div>

          {/* search */}
          <div style={{ position: "relative", display: "inline-block", marginBottom: 14 }}>
            <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: C.dim, pointerEvents: "none" }}>🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Inicio Buscar"
              style={{ paddingLeft: 36, paddingRight: 14, paddingTop: 9, paddingBottom: 9, backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.white, fontSize: 14, outline: "none", width: 260 }}
            />
          </div>

          {/* table */}
          <div style={{ backgroundColor: "#272d37", borderRadius: 12, border: "1px solid rgba(255,255,255,0.14)", overflow: "hidden" }}>

            {/* head */}
            <div style={{ display: "grid", gridTemplateColumns: "minmax(320px,1fr) 120px 170px 260px", padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.14)" }}>
              {["Nombre","Tipo","Última actividad","Acciones"].map(col => (
                <span key={col} style={{ color: "#cbd5e1", fontSize: 13, fontWeight: 700 }}>{col} ↕</span>
              ))}
            </div>

            {/* rows */}
            {filtered.length === 0 ? (
              <div style={{ padding: 48, textAlign: "center" }}>
                <div style={{ fontSize: 38, marginBottom: 10 }}>🤖</div>
                <p style={{ color: C.muted, margin: 0 }}>No hay agentes todavía</p>
                <p style={{ color: C.dim, fontSize: 13, marginTop: 6 }}>Crea tu primer agente usando las opciones de arriba</p>
              </div>
            ) : filtered.map((agent, i) => {
              const tc = typeColor(agent.type);
              return (
                <div
                  key={agent.id}
                  onClick={() => openAgent(agent)}
                  style={{ width: "100%", display: "grid", gridTemplateColumns: "minmax(320px,1fr) 120px 170px 260px", padding: "13px 16px", borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.14)" : "none", backgroundColor: "transparent", cursor: "pointer", textAlign: "left", alignItems: "center" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "#313846"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
                >
                  <div style={flex({ alignItems: "center", gap: 12 })}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: `${C.blue}22`, ...flex({ alignItems: "center", justifyContent: "center" }), fontSize: 17 }}>
                      {agent.type === "voice" ? "📞" : agent.type === "text" ? "💬" : "⚡"}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{agent.name}</span>
                  </div>
                  <div>
                    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500, backgroundColor: tc.bg, color: tc.fg }}>
                      {agent.type}
                    </span>
                  </div>
                  <span style={{ color: "#d1d5db", fontSize: 13 }}>
                    {new Date(agent.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>

                  <div style={flex({ alignItems: "center", gap: 8, justifyContent: "flex-start", minWidth: 0 })} onClick={(e) => e.stopPropagation()}>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#cbd5e1", fontSize: 12, marginRight: 4, whiteSpace: "nowrap" }}>
                      Público
                      <input
                        type="checkbox"
                        checked={agent.status === "active"}
                        onChange={() => togglePublic(agent)}
                      />
                    </label>
                    <button onClick={() => renameAgent(agent)} style={{ width: 36, height: 36, border: "1px solid rgba(255,255,255,0.18)", background: "transparent", color: "#e5e7eb", cursor: "pointer", borderRadius: 10, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} title="Renombrar">✎</button>
                    <button onClick={() => duplicateAgent(agent)} style={{ width: 36, height: 36, border: "1px solid rgba(255,255,255,0.18)", background: "transparent", color: "#e5e7eb", cursor: "pointer", borderRadius: 10, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} title="Duplicar">⎘</button>
                    <button onClick={() => deleteAgent(agent)} style={{ width: 36, height: 36, border: "1px solid rgba(248,113,113,0.55)", background: "transparent", color: "#f87171", cursor: "pointer", borderRadius: 10, display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, flexShrink: 0 }} title="Eliminar">🗑</button>
                  </div>
                </div>
              );
            })}

            {/* pagination */}
            <div style={{ ...flex({ alignItems: "center", gap: 6 }), padding: "12px 16px", borderTop: `1px solid ${C.border}` }}>
              <span style={{ color: C.dim, fontSize: 13, marginRight: 10 }}>
                Mostrando 1 a {filtered.length} de {filtered.length} entradas
              </span>
              {["«","‹","1","›","»"].map((b, i) => (
                <button key={i} style={{ width: b === "1" ? 32 : 28, height: 32, borderRadius: 6, backgroundColor: b === "1" ? C.blue : "transparent", border: b === "1" ? "none" : `1px solid ${C.border}`, color: b === "1" ? "#fff" : C.dim, cursor: "pointer", fontSize: 13, fontWeight: b === "1" ? 700 : 400 }}>
                  {b}
                </button>
              ))}
              <select style={{ marginLeft: 8, padding: "5px 8px", borderRadius: 6, backgroundColor: C.card, border: `1px solid ${C.border}`, color: C.white, fontSize: 13 }}>
                <option>5</option><option>10</option><option>25</option>
              </select>
            </div>
          </div>
        </div>
      </main>

      {exampleTemplate && (
        <div
          onClick={() => setExampleTemplate(null)}
          style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(2,6,23,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 680, borderRadius: 16, border: `1px solid ${C.border}`, background: "linear-gradient(180deg, rgba(26,29,38,0.98), rgba(17,19,24,0.98))", padding: 18 }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 18 }}>Ejemplo de llamada: {exampleTemplate.name}</div>
                <div style={{ color: C.muted, fontSize: 13, marginTop: 2 }}>{exampleTemplate.cat}</div>
              </div>
              <button onClick={() => setExampleTemplate(null)} style={{ border: "none", background: "transparent", color: C.muted, fontSize: 20, cursor: "pointer" }}>x</button>
            </div>

            <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, background: C.card, padding: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, background: exampleTemplate.convo[exampleLineIdx]?.who === "Botz" ? "rgba(0,150,255,0.16)" : "rgba(255,255,255,0.04)", transition: "all .2s ease" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(0,150,255,0.22)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🤖</div>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 13 }}>Botz</div>
                      <div style={{ color: C.muted, fontSize: 12 }}>Agente</div>
                    </div>
                    {exampleTemplate.convo[exampleLineIdx]?.who === "Botz" && <div style={{ marginLeft: "auto", color: C.blue, fontSize: 12, fontWeight: 900 }}>Hablando...</div>}
                  </div>
                </div>

                <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, background: exampleTemplate.convo[exampleLineIdx]?.who !== "Botz" ? "rgba(163,230,53,0.14)" : "rgba(255,255,255,0.04)", transition: "all .2s ease" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🙂</div>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 13 }}>Cliente</div>
                      <div style={{ color: C.muted, fontSize: 12 }}>Humano</div>
                    </div>
                    {exampleTemplate.convo[exampleLineIdx]?.who !== "Botz" && <div style={{ marginLeft: "auto", color: C.lime, fontSize: 12, fontWeight: 900 }}>Hablando...</div>}
                  </div>
                </div>
              </div>

              <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, background: "rgba(15,23,42,0.6)", padding: 12, minHeight: 92 }}>
                <div style={{ color: C.dim, fontSize: 11, fontWeight: 900, marginBottom: 6 }}>TRANSCRIPCION EN VIVO</div>
                <div style={{ fontSize: 15, lineHeight: 1.45 }}>
                  {exampleTemplate.convo[exampleLineIdx]?.text}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button
                onClick={() => {
                  if (playingTemplateId === exampleTemplate.id) stopPreviewVoice();
                  else playPreviewVoice(exampleTemplate);
                }}
                style={{ borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.white, padding: "10px 12px", cursor: "pointer", fontWeight: 800 }}
              >
                {playingTemplateId === exampleTemplate.id ? "Detener audio" : "Escuchar llamada"}
              </button>
              <button
                onClick={() => {
                  router.push(`/start/agents/create?template=${exampleTemplate.id}`);
                  setExampleTemplate(null);
                }}
                style={{ borderRadius: 10, border: "none", background: `${C.lime}cc`, color: "#111", padding: "10px 12px", cursor: "pointer", fontWeight: 900 }}
              >
                Usar plantilla
              </button>
            </div>
          </div>
        </div>
      )}

      {renameModal && (
        <div
          onClick={() => {
            setRenameModal(null);
            setRenameValue("");
          }}
          style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(2,6,23,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 560, boxSizing: "border-box", borderRadius: 16, border: "1px solid rgba(56,189,248,0.28)", background: "linear-gradient(180deg, rgba(16,24,40,0.98), rgba(12,18,30,0.98))", padding: 18, boxShadow: "0 24px 80px rgba(2,6,23,0.65)" }}
          >
            <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 6, color: C.white }}>Renombrar agente</div>
            <div style={{ color: "#9fb2cd", fontSize: 13, marginBottom: 12 }}>Escribe el nuevo nombre para este agente.</div>

            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void confirmRenameAgent();
                if (e.key === "Escape") {
                  setRenameModal(null);
                  setRenameValue("");
                }
              }}
              placeholder="Nuevo nombre"
              style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(56,189,248,0.35)", background: "rgba(15,23,42,0.85)", color: C.white, fontSize: 14, outline: "none" }}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button
                onClick={() => {
                  setRenameModal(null);
                  setRenameValue("");
                }}
                style={{ borderRadius: 10, border: "1px solid rgba(56,189,248,0.35)", background: "transparent", color: C.white, padding: "10px 12px", cursor: "pointer", fontWeight: 800 }}
              >
                Cancelar
              </button>
              <button
                onClick={() => void confirmRenameAgent()}
                style={{ borderRadius: 10, border: "none", background: "linear-gradient(90deg, #84cc16, #a3e635)", color: "#111", padding: "10px 14px", cursor: "pointer", fontWeight: 900 }}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
