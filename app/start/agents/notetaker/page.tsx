"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseAgents } from "@/app/start/agents/supabaseAgentsClient";
import { authedFetch, AuthRequiredError } from "@/app/start/agents/authedFetchAgents";

const C = {
  bg: "#141a29",
  dark: "#0d1322",
  card: "#1b2436",
  panel: "#10182a",
  border: "rgba(148,163,184,0.22)",
  blue: "#1da1ff",
  lime: "#a3e635",
  white: "#ffffff",
  muted: "#9ca3af",
  dim: "#6b7280",
  red: "#ef4444",
};

type TabId = "panel" | "reuniones" | "folders" | "settings";

type Meeting = {
  id: string;
  title: string | null;
  meeting_url: string | null;
  host: string | null;
  starts_at: string | null;
  duration_minutes: number;
  participants_count: number;
  status: "scheduled" | "recorded" | "cancelled";
  source: "manual" | "google_calendar";
  metadata?: {
    contact?: { name?: string | null; email?: string | null; phone?: string | null };
    crm?: {
      state?: string;
      summary?: string;
      intent?: string;
      priority?: string;
      next_action?: string;
      suggested_status?: string;
      score?: number;
    };
  } | null;
};

type Folder = {
  id: string;
  name: string;
  color: string;
};

type Calendar = {
  id: string;
  calendar_id: string;
  calendar_name: string | null;
  calendar_email: string | null;
  status: "connected" | "disconnected";
};

type NTState = {
  prompt: string;
  calendars: Calendar[];
  folders: Folder[];
  meetings: Meeting[];
};

const EMPTY: NTState = { prompt: "", calendars: [], folders: [], meetings: [] };

function isNoiseMeeting(m: Meeting) {
  const host = String(m.host || "").toLowerCase();
  const calendarId = String((m as any)?.metadata?.calendar_id || "").toLowerCase();
  return host.includes("holiday@group.v.calendar.google.com") || calendarId.includes("holiday@group.v.calendar.google.com");
}

function isCommercialCalendar(c: Calendar) {
  const id = String(c.calendar_id || "").toLowerCase();
  const email = String(c.calendar_email || "").toLowerCase();
  if (id.includes("@group.calendar.google.com")) return false;
  if (email.includes("@group.calendar.google.com")) return false;
  return true;
}

export default function NotetakerPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("panel");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<NTState>(EMPTY);
  const [meetingUrl, setMeetingUrl] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [search, setSearch] = useState("");
  const [savedPrompt, setSavedPrompt] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [messageTone, setMessageTone] = useState<"error" | "info">("error");
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  const showMessage = (message: string, tone: "error" | "info" = "error") => {
    setMessageTone(tone);
    setErrorMsg(message);
  };

  const loadState = async () => {
    try {
      const res = await authedFetch("/api/notetaker/state");
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo cargar el Copiloto IA");
      const data = json.data || {};
      setState({
        prompt: String(data.prompt || ""),
        calendars: Array.isArray(data.calendars) ? data.calendars : [],
        folders: Array.isArray(data.folders) ? data.folders : [],
        meetings: Array.isArray(data.meetings) ? data.meetings : [],
      });
    } catch (e) {
      if (e instanceof AuthRequiredError) {
        router.replace("/start/agents");
        return;
      }
      console.error(e);
      showMessage((e as any)?.message || "No se pudo cargar el Copiloto IA", "error");
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabaseAgents.auth.getSession();
      if (!mounted) return;
      if (!data?.session?.user) {
        router.replace("/start/agents");
        return;
      }
      await loadState();
      if (mounted) setLoading(false);
    })();

    const { data: sub } = supabaseAgents.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) router.replace("/start/agents");
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, [router]);

  const postOp = async (op: string, payload?: Record<string, any>) => {
    setSaving(true);
    try {
      const res = await authedFetch("/api/notetaker/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op, ...(payload || {}) }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo guardar");
      const data = json.data || {};
      setState({
        prompt: String(data.prompt || ""),
        calendars: Array.isArray(data.calendars) ? data.calendars : [],
        folders: Array.isArray(data.folders) ? data.folders : [],
        meetings: Array.isArray(data.meetings) ? data.meetings : [],
      });

      if (op === "sync_google") {
        const report = json?.sync_report || null;
        const errors = Array.isArray(report?.errors) ? report.errors : [];
        const fetched = Number(report?.eventsFetched || 0);
        const inserted = Number(report?.eventsInserted || 0);

        if (errors.length > 0) {
          const first = String(errors[0] || "");
          if (first.includes(":403")) {
            showMessage("Google Calendar sin permiso (403). Desvincula Google, revoca acceso en Google y vuelve a conectar.", "error");
          } else {
            showMessage(`Error de sincronización: ${first}`, "error");
          }
        } else if (fetched === 0) {
          showMessage("Conexión OK, pero Google no devolvió eventos en el rango actual.", "info");
        } else {
          showMessage(`Sincronización completa: ${inserted || fetched} evento(s) procesado(s).`, "info");
        }
      }
    } catch (e) {
      console.error(e);
      showMessage((e as any)?.message || "No se pudo guardar", "error");
    } finally {
      setSaving(false);
    }
  };

  const commercialMeetings = useMemo(() => state.meetings.filter((m) => !isNoiseMeeting(m)), [state.meetings]);
  const visibleCalendars = useMemo(() => state.calendars.filter((c) => isCommercialCalendar(c)), [state.calendars]);

  const calendarsConnected = visibleCalendars.filter((c) => c.status === "connected").length;
  const recorded = commercialMeetings.filter((m) => m.status === "recorded").length;

  const metrics = useMemo(() => {
    const total = commercialMeetings.reduce((a, m) => a + Number(m.duration_minutes || 0), 0);
    const upcoming = commercialMeetings.filter((m) => m.status === "scheduled").reduce((a, m) => a + Number(m.duration_minutes || 0), 0);
    const avg = commercialMeetings.length ? Math.round(total / commercialMeetings.length) : 0;
    return { total, upcoming, avg, month: commercialMeetings.length };
  }, [commercialMeetings]);

  const filteredMeetings = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return commercialMeetings;
    return commercialMeetings.filter((m) => {
      return (
        String(m.title || "").toLowerCase().includes(q) ||
        String(m.meeting_url || "").toLowerCase().includes(q) ||
        String(m.host || "").toLowerCase().includes(q) ||
        String(m.status || "").toLowerCase().includes(q)
      );
    });
  }, [search, commercialMeetings]);

  const connectGoogleCalendar = async () => {
    try {
      const initRes = await authedFetch("/api/integrations/google/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const initJson = await initRes.json();
      if (!initRes.ok || !initJson?.ok || !initJson?.auth_url) {
        throw new Error(initJson?.error || "No se pudo iniciar Google OAuth");
      }

      const popup = window.open(initJson.auth_url, "botz-google-oauth", "width=560,height=740");
      if (!popup) {
        showMessage("No se pudo abrir la ventana de Google. Revisa el bloqueador de popups.", "error");
        return;
      }

      const handleOauthMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (!event.data || event.data.type !== "BOTZ_GOOGLE_OAUTH_DONE") return;
        window.removeEventListener("message", handleOauthMessage);
        await postOp("sync_google");
      };

      window.addEventListener("message", handleOauthMessage);

      window.setTimeout(async () => {
        await postOp("sync_google");
      }, 5000);

      window.setTimeout(() => {
        window.removeEventListener("message", handleOauthMessage);
      }, 120000);
    } catch (e) {
      console.error(e);
      showMessage((e as any)?.message || "No se pudo conectar Google Calendar", "error");
    }
  };

  const openCalendarModal = () => {
    setShowCalendarModal(true);
  };

  const disconnectGoogleCalendar = async () => {
    await postOp("disconnect_google");
  };

  const createFolder = async () => {
    setFolderName("");
    setShowFolderModal(true);
  };

  const confirmCreateFolder = async () => {
    if (!folderName.trim()) {
      showMessage("Escribe un nombre para el playbook", "error");
      return;
    }
    await postOp("create_folder", { name: folderName.trim() });
    setShowFolderModal(false);
    setFolderName("");
  };

  const createMeeting = async () => {
    if (!meetingUrl.trim()) return;
    await postOp("create_meeting", {
      meeting_url: meetingUrl.trim(),
      contact_name: contactName.trim(),
      contact_email: contactEmail.trim(),
      contact_phone: contactPhone.trim(),
    });
    setMeetingUrl("");
    setContactName("");
    setContactEmail("");
    setContactPhone("");
  };

  const savePrompt = async () => {
    await postOp("save_prompt", { prompt: state.prompt });
    setSavedPrompt(true);
    window.setTimeout(() => setSavedPrompt(false), 1200);
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, color: C.white, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter,-apple-system,sans-serif" }}>
        Cargando Copiloto IA...
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.white, fontFamily: "Inter,-apple-system,sans-serif" }}>
      <div style={{ height: 72, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 16px", background: C.dark }}>
        {([
          ["panel", "Copiloto IA"],
          ["reuniones", "Interacciones"],
          ["folders", "Playbooks"],
          ["settings", "Estrategia"],
        ] as [TabId, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              height: 72,
              padding: "0 62px",
              border: "none",
              background: "transparent",
              borderBottom: tab === id ? `2px solid ${C.blue}` : "2px solid transparent",
              color: tab === id ? C.white : C.muted,
              fontWeight: tab === id ? 900 : 700,
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        ))}
        <button onClick={() => router.push("/start/agents")} style={{ marginLeft: "auto", border: `1px solid ${C.border}`, background: "transparent", color: C.white, borderRadius: 12, padding: "10px 14px", cursor: "pointer" }}>
          Volver
        </button>
      </div>

      {tab === "panel" && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 360px", minHeight: "calc(100vh - 72px)" }}>
          <div style={{ padding: 14, borderRight: `1px solid ${C.border}` }}>
            <div style={{ background: "linear-gradient(135deg, rgba(29,161,255,0.16), rgba(163,230,53,0.12))", border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
              <div style={{ fontWeight: 900, fontSize: 22 }}>Copiloto Comercial IA</div>
              <div style={{ color: C.muted, fontSize: 14, marginTop: 6, maxWidth: 760 }}>
                Convierte cada llamada o reunion en acciones comerciales: resumen, prioridad, siguiente paso y seguimiento. Todo se gestiona en esta misma sección.
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                <button onClick={() => setTab("reuniones")} style={{ borderRadius: 10, border: "none", background: `${C.blue}cc`, color: "#07101c", fontWeight: 900, padding: "10px 12px", cursor: "pointer" }}>+ Nueva interacción</button>
                <button onClick={createFolder} disabled={saving} style={{ borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.white, fontWeight: 800, padding: "10px 12px", cursor: "pointer" }}>+ Crear playbook</button>
                <button onClick={() => setTab("settings")} style={{ borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.white, fontWeight: 800, padding: "10px 12px", cursor: "pointer" }}>Ajustar estrategia IA</button>
              </div>
            </div>

            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
              <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 8 }}>¿Como baja al pipeline?</div>
              <div style={{ color: C.muted, fontSize: 13, lineHeight: 1.5 }}>
                1) Ve a <b style={{ color: C.white }}>Interacciones</b>.<br />
                2) Crea o sincroniza una interacción.<br />
                3) En la fila usa <b style={{ color: C.white }}>Analizar IA</b> y luego <b style={{ color: C.white }}>Guardar seguimiento</b>.<br />
                4) El copiloto deja prioridad, estado y siguiente accion dentro de esta bandeja.
              </div>
              <div style={{ marginTop: 10 }}>
                <button onClick={() => setTab("reuniones")} style={{ borderRadius: 10, border: "none", background: `${C.blue}cc`, color: "#07101c", fontWeight: 900, padding: "10px 12px", cursor: "pointer" }}>
                  Ir a Interacciones
                </button>
              </div>
            </div>

            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, display: "flex", alignItems: "center", gap: 18 }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>📅 {calendarsConnected} Fuente conectada</div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>🤖 {recorded} Interacción analizada</div>
              {calendarsConnected > 0 && (
                <button onClick={disconnectGoogleCalendar} disabled={saving} style={{ marginLeft: "auto", borderRadius: 12, border: `1px solid ${C.red}88`, background: "transparent", color: C.red, fontWeight: 900, padding: "11px 14px", cursor: saving ? "not-allowed" : "pointer" }}>
                  Desvincular Google
                </button>
              )}
              <button onClick={openCalendarModal} disabled={saving} style={{ marginLeft: calendarsConnected > 0 ? 0 : "auto", borderRadius: 12, border: "none", background: C.blue, color: "#07101c", fontWeight: 900, padding: "11px 18px", cursor: saving ? "not-allowed" : "pointer" }}>
                {calendarsConnected > 0 ? "Reconectar Google" : "+ Conectar Google Calendar"}
              </button>
            </div>

            <div style={{ marginTop: 14, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, minHeight: 360, padding: 16, display: "flex", flexDirection: "column" }}>
              <div style={{ fontWeight: 900, fontSize: 34, marginBottom: 10 }}>Fuentes de Conversación</div>
              {visibleCalendars.length === 0 ? (
                <div style={{ margin: "auto", textAlign: "center" }}>
                  <div style={{ fontSize: 42, color: C.muted }}>☒</div>
                  <div style={{ fontWeight: 900, fontSize: 44, lineHeight: 1.15, marginTop: 8 }}>No hay fuentes conectadas</div>
                  <div style={{ color: C.muted, fontSize: 16, marginTop: 10 }}>Conecta tu calendario para que el copiloto detecte reuniones y genere acciones comerciales automaticamente</div>
                  <button onClick={openCalendarModal} disabled={saving} style={{ marginTop: 16, borderRadius: 12, border: "none", background: C.blue, color: "#07101c", fontWeight: 900, padding: "12px 20px", cursor: saving ? "not-allowed" : "pointer" }}>
                    + Conectar Google Calendar
                  </button>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {visibleCalendars.map((cal) => (
                    <div key={cal.id} style={{ border: `1px solid ${C.border}`, borderRadius: 10, background: C.dark, padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontWeight: 800 }}>{cal.calendar_name || "Google Calendar"}</div>
                        <div style={{ color: C.muted, fontSize: 12 }}>{cal.calendar_email || cal.calendar_id}</div>
                        <div style={{ color: C.dim, fontSize: 11 }}>ID: {cal.calendar_id}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ color: C.blue, fontSize: 12, fontWeight: 900 }}>Activo</span>
                        <button
                          onClick={disconnectGoogleCalendar}
                          disabled={saving}
                          style={{ border: `1px solid ${C.red}88`, background: "transparent", color: C.red, borderRadius: 8, padding: "6px 8px", cursor: saving ? "not-allowed" : "pointer", fontSize: 12 }}
                        >
                          Desvincular
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: 14, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
              <div style={{ fontWeight: 900, fontSize: 34, marginBottom: 12 }}>Analítica Operativa IA</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12 }}>
                {[
                  ["ESTA SEMANA", `${metrics.total}m`, "Tiempo analizado"],
                  ["PRÓXIMAS", `${metrics.upcoming}m`, "Tiempo programado"],
                  ["PROMEDIO", `${metrics.avg}m`, "Por interacción"],
                  ["ESTE MES", `${metrics.month}`, "Total interacciones"],
                ].map((m, i) => (
                  <div key={i} style={{ background: C.dark, border: `1px solid ${i === 2 ? C.blue : C.border}`, borderRadius: 10, padding: 14 }}>
                    <div style={{ color: C.muted, fontSize: 11, fontWeight: 900 }}>{m[0]}</div>
                    <div style={{ fontSize: 36, fontWeight: 900, marginTop: 6 }}>{m[1]}</div>
                    <div style={{ color: C.dim, fontSize: 21, marginTop: 4 }}>{m[2]}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside style={{ background: C.panel, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>Bandeja de seguimiento</div>
              <div style={{ background: C.lime, color: "#111", borderRadius: 8, padding: "4px 8px", fontWeight: 900, fontSize: 12 }}>{commercialMeetings.length}</div>
            </div>
            <div style={{ borderTop: `1px solid ${C.border}`, margin: "0 -16px", marginBottom: 24 }} />
            {commercialMeetings.length === 0 ? (
                <div style={{ marginTop: 80, textAlign: "center" }}>
                  <div style={{ color: C.muted, fontSize: 30 }}>☑</div>
                  <div style={{ fontWeight: 900, fontSize: 40, lineHeight: 1.2, marginTop: 8 }}>No hay seguimientos activos</div>
                  <div style={{ color: C.muted, fontSize: 16, marginTop: 10, lineHeight: 1.5 }}>Aqui apareceran interacciones y acciones sugeridas para mover oportunidades en tu pipeline comercial</div>
                </div>
              ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {commercialMeetings.slice(0, 8).map((m) => (
                    <div key={m.id} style={{ background: C.dark, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
                      <div style={{ fontWeight: 800, fontSize: 13 }}>{m.title || "Reunión"}</div>
                      <div style={{ color: C.muted, fontSize: 12, marginTop: 3 }}>{m.starts_at ? new Date(m.starts_at).toLocaleString() : "Sin fecha"}</div>
                      <div style={{ color: "#93c5fd", fontSize: 11, marginTop: 6 }}>Siguiente acción sugerida: contactar en menos de 24h</div>
                    </div>
                  ))}
                </div>
            )}
          </aside>
        </div>
      )}

      {tab === "reuniones" && (
        <div style={{ padding: 16 }}>
            <div style={{ marginBottom: 10, padding: "10px 12px", borderRadius: 10, border: `1px solid rgba(29,161,255,0.35)`, background: "rgba(29,161,255,0.12)", color: "#cfe8ff", fontSize: 12 }}>
            En cada interacción: primero <b>Analizar IA</b> y despues <b>Guardar seguimiento</b>. No necesitas usar otra pantalla.
            </div>
            <div style={{ background: `${C.blue}1a`, border: `1px solid rgba(29,161,255,0.35)`, borderRadius: 10, padding: 14, display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ fontWeight: 800 }}>🤖 Registrar interacción y activar copiloto:</div>
            <input value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} placeholder="URL de Google Meet, Zoom o Teams" style={{ marginLeft: "auto", width: 420, maxWidth: "40vw", background: C.dark, border: `1px solid ${C.border}`, borderRadius: 8, color: C.white, padding: "9px 12px" }} />
            <button onClick={createMeeting} disabled={saving} style={{ border: "none", borderRadius: 8, background: C.blue, color: "#07101c", fontWeight: 900, padding: "10px 18px", cursor: saving ? "not-allowed" : "pointer" }}>➤ Procesar</button>
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 10, alignItems: "center" }}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar" style={{ width: 420, background: C.dark, border: `1px solid ${C.border}`, borderRadius: 8, color: C.white, padding: "10px 12px" }} />
            <button
              onClick={() => postOp("sync_google")}
              disabled={saving}
              style={{ border: "none", background: "transparent", color: C.white, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
            >
              ⟳ {saving ? "Sincronizando..." : "Actualizar"}
            </button>
          </div>

          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Nombre del contacto" style={{ background: C.dark, border: `1px solid ${C.border}`, borderRadius: 8, color: C.white, padding: "10px 12px" }} />
            <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="Email (opcional)" style={{ background: C.dark, border: `1px solid ${C.border}`, borderRadius: 8, color: C.white, padding: "10px 12px" }} />
            <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="Teléfono (opcional)" style={{ background: C.dark, border: `1px solid ${C.border}`, borderRadius: 8, color: C.white, padding: "10px 12px" }} />
          </div>

          <div style={{ marginTop: 8, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: "9px 6px", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 180px", fontWeight: 900 }}>
            <span>Interacción</span><span>Fecha</span><span>Duración</span><span>Host</span><span>Participantes</span><span>Estado</span><span>Acciones</span>
          </div>

          {filteredMeetings.length === 0 ? (
            <div style={{ paddingTop: 10 }}>No se encontraron interacciones.</div>
          ) : (
            filteredMeetings.map((m) => (
              <React.Fragment key={m.id}>
                <div style={{ padding: "10px 6px", borderBottom: `1px solid ${C.border}`, display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 240px", alignItems: "center", columnGap: 8 }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.title || m.meeting_url || "Reunión"}</span>
                  <span>{m.starts_at ? new Date(m.starts_at).toLocaleDateString() : "-"}</span>
                  <span>{m.duration_minutes || 0}m</span>
                  <span>{m.host || "-"}</span>
                  <span>{m.participants_count || 0}</span>
                  <span style={{ color: m.status === "scheduled" ? C.blue : m.status === "recorded" ? C.lime : C.red, fontWeight: 900 }}>
                    {m.status === "scheduled" ? "programada" : m.status === "recorded" ? "grabada" : "cancelada"}
                  </span>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button onClick={() => postOp("analyze_meeting", { meeting_id: m.id })} disabled={saving} style={{ border: `1px solid ${C.blue}88`, background: "transparent", color: C.blue, borderRadius: 8, padding: "6px 8px", cursor: saving ? "not-allowed" : "pointer", fontSize: 12 }}>
                      Analizar IA
                    </button>
                    <button onClick={() => postOp("save_pipeline", { meeting_id: m.id })} disabled={saving} style={{ border: `1px solid ${C.lime}88`, background: "transparent", color: C.lime, borderRadius: 8, padding: "6px 8px", cursor: saving ? "not-allowed" : "pointer", fontSize: 12 }}>
                      Guardar seguimiento
                    </button>
                    <button onClick={() => postOp("toggle_meeting", { meeting_id: m.id })} disabled={saving} style={{ border: `1px solid ${C.border}`, background: "transparent", color: C.white, borderRadius: 8, padding: "6px 8px", cursor: saving ? "not-allowed" : "pointer", fontSize: 12 }}>
                      {m.status === "scheduled" ? "Marcar grabada" : "Marcar próxima"}
                    </button>
                    <button onClick={() => postOp("delete_meeting", { meeting_id: m.id })} disabled={saving} style={{ border: `1px solid ${C.red}88`, background: "transparent", color: C.red, borderRadius: 8, padding: "6px 8px", cursor: saving ? "not-allowed" : "pointer", fontSize: 12 }}>
                      Eliminar
                    </button>
                  </div>
                </div>
                {(m.metadata?.crm?.summary || m.metadata?.crm?.next_action) && (
                  <div style={{ marginTop: 4, marginBottom: 8, marginLeft: 6, padding: "8px 10px", borderRadius: 8, background: "rgba(15,23,42,0.5)", border: `1px solid ${C.border}` }}>
                    {m.metadata?.crm?.summary && <div style={{ fontSize: 12, color: C.white }}>🧠 {m.metadata.crm.summary}</div>}
                    <div style={{ display: "flex", gap: 14, marginTop: 5, fontSize: 11, color: C.muted, flexWrap: "wrap" }}>
                      <span>Intención: <b style={{ color: C.white }}>{m.metadata?.crm?.intent || "-"}</b></span>
                      <span>Prioridad: <b style={{ color: C.white }}>{m.metadata?.crm?.priority || "-"}</b></span>
                      <span>Estado sugerido: <b style={{ color: C.white }}>{m.metadata?.crm?.suggested_status || "-"}</b></span>
                      <span>Seguimiento: <b style={{ color: C.white }}>{m.metadata?.crm?.state === "applied" ? "guardado" : "pendiente"}</b></span>
                    </div>
                    {m.metadata?.crm?.next_action && <div style={{ marginTop: 4, fontSize: 12, color: "#93c5fd" }}>➡ Siguiente acción: {m.metadata.crm.next_action}</div>}
                  </div>
                )}
              </React.Fragment>
            ))
          )}
        </div>
      )}

      {tab === "folders" && (
        <div>
          <div style={{ borderBottom: `1px solid ${C.border}`, padding: "18px 24px", display: "flex", alignItems: "center" }}>
            <div style={{ fontWeight: 900, fontSize: 20 }}>Playbooks comerciales</div>
            <button onClick={createFolder} disabled={saving} style={{ marginLeft: "auto", borderRadius: 10, border: "none", background: C.blue, color: "#07101c", fontWeight: 900, padding: "11px 24px", cursor: saving ? "not-allowed" : "pointer" }}>+ Nuevo playbook</button>
          </div>

          {state.folders.length === 0 ? (
            <div style={{ minHeight: "calc(100vh - 150px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 44, color: C.muted }}>⌧</div>
                <div style={{ fontSize: 44, fontWeight: 900, marginTop: 14 }}>Aún no hay playbooks</div>
                <div style={{ marginTop: 10, color: C.muted, fontSize: 18 }}>Crea tu primer playbook para estandarizar el seguimiento comercial</div>
                <button onClick={createFolder} disabled={saving} style={{ marginTop: 20, borderRadius: 12, border: "none", background: C.blue, color: "#07101c", fontWeight: 900, padding: "14px 24px", cursor: saving ? "not-allowed" : "pointer" }}>+ Crear playbook</button>
              </div>
            </div>
          ) : (
            <div style={{ padding: 24, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 12 }}>
              {state.folders.map((f) => (
                <div key={f.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontWeight: 900, fontSize: 17, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                    <button
                      onClick={() => postOp("delete_folder", { folder_id: f.id })}
                      disabled={saving}
                      style={{ border: `1px solid ${C.red}88`, background: "transparent", color: C.red, borderRadius: 8, padding: "6px 8px", cursor: saving ? "not-allowed" : "pointer", fontSize: 12 }}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "settings" && (
        <div style={{ display: "grid", gridTemplateColumns: "280px minmax(0,1fr)", minHeight: "calc(100vh - 72px)" }}>
          <aside style={{ borderRight: `1px solid ${C.border}`, background: C.panel, padding: 16 }}>
            <button style={{ width: "100%", textAlign: "left", borderRadius: 10, border: "none", background: `${C.blue}22`, color: C.blue, fontWeight: 900, padding: "12px 14px" }}>
              💡 Estrategia Comercial IA
            </button>
          </aside>
          <main style={{ padding: 24 }}>
            <div style={{ fontSize: 44, fontWeight: 900 }}>Estrategia Comercial IA</div>
            <p style={{ color: C.muted, fontSize: 16, marginTop: 10, maxWidth: 980 }}>
              Define tu metodologia comercial y criterios de conversion. El copiloto usara esto para resumir, calificar y recomendar acciones en cada interacción.
            </p>
            <div style={{ marginTop: 22, fontWeight: 800, color: C.muted, fontSize: 14 }}>Tu framework comercial</div>
            <textarea
              value={state.prompt}
              onChange={(e) => setState((s) => ({ ...s, prompt: e.target.value }))}
              placeholder="Describe tu metodología o framework comercial..."
              style={{ marginTop: 10, width: "100%", maxWidth: 980, minHeight: 300, resize: "vertical", background: C.dark, border: `1px solid ${C.border}`, borderRadius: 12, color: C.white, padding: 16, fontSize: 14, lineHeight: 1.5 }}
            />
            <p style={{ color: C.muted, fontSize: 14, marginTop: 8, maxWidth: 980 }}>
              Describe tu proceso comercial, criterios de calificacion y reglas de siguiente paso para que el copiloto mantenga seguimiento consistente.
            </p>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12 }}>
              <button onClick={savePrompt} disabled={saving} style={{ borderRadius: 10, border: "none", background: `${C.blue}cc`, color: "#07101c", fontWeight: 900, padding: "12px 24px", cursor: saving ? "not-allowed" : "pointer" }}>
                {saving ? "Guardando..." : "✨ Guardar y mejorar"}
              </button>
              {savedPrompt && <span style={{ color: C.blue, fontWeight: 800 }}>Guardado</span>}
            </div>
          </main>
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            position: "fixed",
            left: 16,
            bottom: 16,
            zIndex: 40,
            background: messageTone === "error" ? "rgba(239,68,68,0.14)" : "rgba(29,161,255,0.16)",
            border: messageTone === "error" ? `1px solid ${C.red}88` : `1px solid ${C.blue}88`,
            color: messageTone === "error" ? "#fecaca" : "#cfe8ff",
            borderRadius: 12,
            padding: "10px 12px",
            maxWidth: 520,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontWeight: 900 }}>{messageTone === "error" ? "Error:" : "Info:"}</span>
            <span style={{ fontSize: 13 }}>{errorMsg}</span>
            <button
              onClick={() => setErrorMsg("")}
              style={{
                marginLeft: "auto",
                border: "none",
                background: "transparent",
                color: messageTone === "error" ? "#fecaca" : "#cfe8ff",
                cursor: "pointer",
                fontWeight: 900,
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {showFolderModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(3,7,18,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ width: "100%", maxWidth: 460, borderRadius: 14, border: `1px solid ${C.border}`, background: C.card, padding: 16 }}>
            <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 8 }}>Nuevo playbook</div>
            <div style={{ color: C.muted, fontSize: 13, marginBottom: 12 }}>Escribe el nombre del playbook para organizar seguimientos.</div>
            <input
              autoFocus
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Ej. Clientes Q1"
              style={{ width: "100%", boxSizing: "border-box", background: C.dark, border: `1px solid ${C.border}`, borderRadius: 10, color: C.white, padding: "10px 12px" }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
              <button onClick={() => setShowFolderModal(false)} style={{ borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.white, padding: "10px 12px", cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={confirmCreateFolder} disabled={saving} style={{ borderRadius: 10, border: "none", background: C.blue, color: "#07101c", fontWeight: 900, padding: "10px 14px", cursor: saving ? "not-allowed" : "pointer" }}>
                {saving ? "Guardando..." : "Crear playbook"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCalendarModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 55, background: "rgba(3,7,18,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ width: "100%", maxWidth: 520, borderRadius: 14, border: `1px solid ${C.border}`, background: C.card, overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontWeight: 900, fontSize: 20 }}>Conectar Calendario</div>
              <button onClick={() => setShowCalendarModal(false)} style={{ border: `1px solid ${C.border}`, background: "transparent", color: C.white, borderRadius: 10, width: 30, height: 30, cursor: "pointer" }}>×</button>
            </div>

            <div style={{ padding: 16, color: C.muted, fontSize: 14, lineHeight: 1.4 }}>
              Conecta tu calendario para sincronizar reuniones automaticamente en Interacciones.
            </div>

            <div style={{ padding: "0 16px 16px 16px", display: "grid", gap: 10 }}>
              <div style={{ border: `1px solid ${C.lime}88`, borderRadius: 12, background: "rgba(163,230,53,0.08)", padding: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 900 }}>Google Calendar</div>
                  <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>Conexion recomendada</div>
                </div>
                <span style={{ color: C.lime, fontWeight: 900 }}>Seleccionado</span>
              </div>

              <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, background: C.dark, padding: 12, display: "flex", alignItems: "center", justifyContent: "space-between", opacity: 0.75 }}>
                <div>
                  <div style={{ fontWeight: 900 }}>Microsoft Outlook</div>
                  <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>Proximamente</div>
                </div>
              </div>
            </div>

            <div style={{ borderTop: `1px solid ${C.border}`, padding: 16, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setShowCalendarModal(false)} style={{ borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.white, padding: "10px 12px", cursor: "pointer" }}>
                Cancelar
              </button>
              <button
                onClick={async () => {
                  setShowCalendarModal(false);
                  await connectGoogleCalendar();
                }}
                disabled={saving}
                style={{ borderRadius: 10, border: "none", background: C.lime, color: "#111", fontWeight: 900, padding: "10px 14px", cursor: saving ? "not-allowed" : "pointer" }}
              >
                {saving ? "Conectando..." : "Conectar Calendario"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
