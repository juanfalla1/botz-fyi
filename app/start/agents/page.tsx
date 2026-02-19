"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/supabaseClient";
import AuthModal from "@/app/start/agents/components/AgentsAuthModal";
import { authedFetch, AuthRequiredError } from "@/app/start/_utils/authedFetch";

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
  const [agents, setAgents] = useState<Agent[]>([]);
  const [user,   setUser]   = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [openAuth, setOpenAuth] = useState(false);
  const [search, setSearch] = useState("");
  const [subPlan, setSubPlan] = useState<string>("free");
  const [subStatus, setSubStatus] = useState<string>("inactive");
  const [trialEnd, setTrialEnd] = useState<string | null>(null);
  const [entCreditsUsed, setEntCreditsUsed] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const sessionUser = data?.session?.user || null;
      if (!mounted) return;
      setUser(sessionUser);
      setAuthLoading(false);
      setOpenAuth(!sessionUser);
      if (sessionUser) {
        fetchAgents();
        fetchEntitlement();
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user || null;
      setUser(u);
      setOpenAuth(!u);
      if (u) {
        fetchAgents();
        fetchEntitlement();
      }
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  // Fallback: keep local UI in sync with Supabase session.
  useEffect(() => {
    let alive = true;
    const sync = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const u = data?.session?.user || null;
        if (!alive) return;

        setUser((prev: any) => {
          const prevId = prev?.id || null;
          const nextId = u?.id || null;
          return prevId === nextId ? prev : u;
        });
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

  // Resilience: refresh session + data on focus.
  useEffect(() => {
    if (!user?.id) return;
    let alive = true;

    const refresh = async () => {
      if (!alive) return;
      try {
        await supabase.auth.refreshSession();
      } catch {
        // ignore
      }
      if (!alive) return;
      fetchEntitlement();
      fetchAgents();
    };

    const onFocus = () => refresh();
    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      alive = false;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [user?.id]);

  const cards = [
    { id: "voice",     title: "Crear Agente de Voz"  },
    { id: "text",      title: "Crear Agente de Texto" },
    { id: "flow",      title: "Crear Flujo"           },
    { id: "notetaker", title: "Configurar Notetaker"  },
  ];

  const templates = [
    { id: "lia",   name: "Lía",   cat: "Calificación de leads entrantes", emoji: "🎯" },
    { id: "alex",  name: "Alex",  cat: "Llamadas en frío salientes",       emoji: "📞" },
    { id: "julia", name: "Julia", cat: "Asistente Recepcionista",          emoji: "💬" },
  ];

  const filtered = agents.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

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
    return { name: "Pro", price: "US$99.00", credits: 100000 };
  }, [planTier]);

  const allPlans = useMemo(() => {
    return [
      { key: "pro", name: "Pro", price: "US$99.00", credits: 100000 },
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
          <div style={{ fontSize: 11, color: C.dim, marginBottom: 6 }}>Workspace</div>
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
              <span style={{ color: C.dim, fontSize: 12 }}>Uso</span>
              <span style={{ fontSize: 12, fontWeight: 900, color: C.white }}>{fmt(creditsUsedTotal)} / {fmt(planInfo.credits)}</span>
            </div>
            <div style={{ height: 8, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 999, overflow: "hidden", border: `1px solid ${C.border}` }}>
              <div style={{ width: `${Math.min(100, (creditsUsedTotal / Math.max(1, planInfo.credits)) * 100)}%`, height: "100%", background: `linear-gradient(90deg, ${C.lime}, ${C.blue})` }} />
            </div>

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
                   Ver planes
                 </button>
                 <button
                   onClick={async () => {
                     try { await supabase.auth.signOut(); } catch {}
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

        {/* top bar */}
        <div style={{ height: 56, borderBottom: `1px solid ${C.border}`, ...flex({ alignItems: "center", justifyContent: "flex-end" }), padding: "0 36px", backgroundColor: C.bg, position: "sticky", top: 0, zIndex: 10 }}>
          <button onClick={fetchAgents} style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 18 }}>⟳</button>
        </div>

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
                    router.push("/start/agents/create?type=voice&kind=notetaker");
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
          <p style={{ color: C.muted, fontSize: 15, margin: "0 0 14px" }}>O inicia con casos de uso populares</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 32 }}>
            {templates.map(t => (
              <button
                key={t.id}
                onClick={() => router.push(`/start/agents/create?template=${t.id}`)}
                style={{ ...flex({ alignItems: "center", gap: 14 }), backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, cursor: "pointer", textAlign: "left" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = C.hover; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = C.card;  }}
              >
                <div style={{ width: 52, height: 52, borderRadius: "50%", backgroundColor: `${C.lime}22`, ...flex({ alignItems: "center", justifyContent: "center" }), fontSize: 26, flexShrink: 0 }}>
                  {t.emoji}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{t.name}</div>
                  <div style={{ color: C.muted, fontSize: 13, marginTop: 2 }}>{t.cat}</div>
                </div>
              </button>
            ))}
          </div>

          {/* activity header */}
          <div style={{ ...flex({ alignItems: "center", justifyContent: "space-between" }), marginBottom: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Actividad reciente</h3>
            <button onClick={fetchAgents} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.lime}`, backgroundColor: "transparent", color: C.lime, cursor: "pointer", fontSize: 15 }}>⟳</button>
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
          <div style={{ backgroundColor: C.card, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>

            {/* head */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 200px", padding: "10px 16px", borderBottom: `1px solid ${C.border}` }}>
              {["Nombre","Tipo","Última actividad"].map(col => (
                <span key={col} style={{ color: C.dim, fontSize: 13, fontWeight: 600 }}>{col} ↕</span>
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
                <button
                  key={agent.id}
                  onClick={() => router.push(agent.type === "flow" ? `/start/flows/${agent.id}` : `/start/agents/${agent.id}`)}
                  style={{ width: "100%", display: "grid", gridTemplateColumns: "1fr 140px 200px", padding: "13px 16px", borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : "none", backgroundColor: "transparent", cursor: "pointer", textAlign: "left" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = C.hover; }}
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
                  <span style={{ color: C.muted, fontSize: 13 }}>
                    {new Date(agent.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                </button>
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
    </div>
  );
}
