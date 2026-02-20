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

export default function NotetakerPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("panel");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<NTState>(EMPTY);
  const [meetingUrl, setMeetingUrl] = useState("");
  const [search, setSearch] = useState("");
  const [savedPrompt, setSavedPrompt] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [folderName, setFolderName] = useState("");

  const loadState = async () => {
    try {
      const res = await authedFetch("/api/notetaker/state");
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo cargar el Notetaker");
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
      setErrorMsg((e as any)?.message || "No se pudo cargar el Notetaker");
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
    } catch (e) {
      console.error(e);
      setErrorMsg((e as any)?.message || "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const calendarsConnected = state.calendars.filter((c) => c.status === "connected").length;
  const recorded = state.meetings.filter((m) => m.status === "recorded").length;

  const metrics = useMemo(() => {
    const total = state.meetings.reduce((a, m) => a + Number(m.duration_minutes || 0), 0);
    const upcoming = state.meetings.filter((m) => m.status === "scheduled").reduce((a, m) => a + Number(m.duration_minutes || 0), 0);
    const avg = state.meetings.length ? Math.round(total / state.meetings.length) : 0;
    return { total, upcoming, avg, month: state.meetings.length };
  }, [state.meetings]);

  const filteredMeetings = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return state.meetings;
    return state.meetings.filter((m) => {
      return (
        String(m.title || "").toLowerCase().includes(q) ||
        String(m.meeting_url || "").toLowerCase().includes(q) ||
        String(m.host || "").toLowerCase().includes(q) ||
        String(m.status || "").toLowerCase().includes(q)
      );
    });
  }, [search, state.meetings]);

  const connectGoogleCalendar = async () => {
    try {
      const initRes = await authedFetch("/api/integrations/google/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: "0811c118-5a2f-40cb-907e-8979e0984096" }),
      });
      const initJson = await initRes.json();
      if (!initRes.ok || !initJson?.ok || !initJson?.auth_url) {
        throw new Error(initJson?.error || "No se pudo iniciar Google OAuth");
      }

      const popup = window.open(initJson.auth_url, "botz-google-oauth", "width=560,height=740");
      if (!popup) {
        setErrorMsg("No se pudo abrir la ventana de Google. Revisa el bloqueador de popups.");
        return;
      }

      const timer = window.setInterval(async () => {
        if (popup.closed) {
          window.clearInterval(timer);
          await postOp("sync_google");
        }
      }, 800);
    } catch (e) {
      console.error(e);
      setErrorMsg((e as any)?.message || "No se pudo conectar Google Calendar");
    }
  };

  const createFolder = async () => {
    setFolderName("");
    setShowFolderModal(true);
  };

  const confirmCreateFolder = async () => {
    if (!folderName.trim()) {
      setErrorMsg("Escribe un nombre para la carpeta");
      return;
    }
    await postOp("create_folder", { name: folderName.trim() });
    setShowFolderModal(false);
    setFolderName("");
  };

  const createMeeting = async () => {
    if (!meetingUrl.trim()) return;
    await postOp("create_meeting", { meeting_url: meetingUrl.trim() });
    setMeetingUrl("");
  };

  const savePrompt = async () => {
    await postOp("save_prompt", { prompt: state.prompt });
    setSavedPrompt(true);
    window.setTimeout(() => setSavedPrompt(false), 1200);
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, color: C.white, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter,-apple-system,sans-serif" }}>
        Cargando notetaker...
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.white, fontFamily: "Inter,-apple-system,sans-serif" }}>
      <div style={{ height: 72, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 16px", background: C.dark }}>
        {([
          ["panel", "Panel"],
          ["reuniones", "Reuniones"],
          ["folders", "Carpetas"],
          ["settings", "Configuración"],
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
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, display: "flex", alignItems: "center", gap: 18 }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>📅 {calendarsConnected} Conectado</div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>🤖 {recorded} Grabado</div>
              <button onClick={connectGoogleCalendar} disabled={saving} style={{ marginLeft: "auto", borderRadius: 12, border: "none", background: C.blue, color: "#07101c", fontWeight: 900, padding: "11px 18px", cursor: saving ? "not-allowed" : "pointer" }}>
                + Conectar Calendario
              </button>
            </div>

            <div style={{ marginTop: 14, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, minHeight: 360, padding: 16, display: "flex", flexDirection: "column" }}>
              <div style={{ fontWeight: 900, fontSize: 34, marginBottom: 10 }}>Calendarios Conectados</div>
              {state.calendars.length === 0 ? (
                <div style={{ margin: "auto", textAlign: "center" }}>
                  <div style={{ fontSize: 42, color: C.muted }}>☒</div>
                  <div style={{ fontWeight: 900, fontSize: 44, lineHeight: 1.15, marginTop: 8 }}>No hay calendarios conectados</div>
                  <div style={{ color: C.muted, fontSize: 16, marginTop: 10 }}>Conecta tu Google Calendar para comenzar a programar bots de reuniones</div>
                  <button onClick={connectGoogleCalendar} disabled={saving} style={{ marginTop: 16, borderRadius: 12, border: "none", background: C.blue, color: "#07101c", fontWeight: 900, padding: "12px 20px", cursor: saving ? "not-allowed" : "pointer" }}>
                    + Conectar Calendario
                  </button>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {state.calendars.map((cal) => (
                    <div key={cal.id} style={{ border: `1px solid ${C.border}`, borderRadius: 10, background: C.dark, padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontWeight: 800 }}>{cal.calendar_name || "Google Calendar"}</div>
                        <div style={{ color: C.muted, fontSize: 12 }}>{cal.calendar_email || cal.calendar_id}</div>
                      </div>
                      <span style={{ color: C.blue, fontSize: 12, fontWeight: 900 }}>Conectado</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: 14, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
              <div style={{ fontWeight: 900, fontSize: 34, marginBottom: 12 }}>Análisis de Reuniones</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12 }}>
                {[
                  ["ESTA SEMANA", `${metrics.total}m`, "Minutos de Reunión"],
                  ["PRÓXIMAS", `${metrics.upcoming}m`, "Minutos Programados"],
                  ["DURACIÓN PROMEDIO", `${metrics.avg}m`, "Por Reunión"],
                  ["ESTE MES", `${metrics.month}`, "Total de Reuniones"],
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
              <div style={{ fontWeight: 900, fontSize: 16 }}>Reuniones Próximas</div>
              <div style={{ background: C.lime, color: "#111", borderRadius: 8, padding: "4px 8px", fontWeight: 900, fontSize: 12 }}>{state.meetings.length}</div>
            </div>
            <div style={{ borderTop: `1px solid ${C.border}`, margin: "0 -16px", marginBottom: 24 }} />
            {state.meetings.length === 0 ? (
              <div style={{ marginTop: 80, textAlign: "center" }}>
                <div style={{ color: C.muted, fontSize: 30 }}>☑</div>
                <div style={{ fontWeight: 900, fontSize: 40, lineHeight: 1.2, marginTop: 8 }}>No hay reuniones programadas</div>
                <div style={{ color: C.muted, fontSize: 16, marginTop: 10, lineHeight: 1.5 }}>Los bots de reuniones aparecerán aquí cuando se detecten eventos en tu calendario</div>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {state.meetings.slice(0, 8).map((m) => (
                  <div key={m.id} style={{ background: C.dark, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
                    <div style={{ fontWeight: 800, fontSize: 13 }}>{m.title || "Reunión"}</div>
                    <div style={{ color: C.muted, fontSize: 12, marginTop: 3 }}>{m.starts_at ? new Date(m.starts_at).toLocaleString() : "Sin fecha"}</div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      )}

      {tab === "reuniones" && (
        <div style={{ padding: 16 }}>
            <div style={{ background: `${C.blue}1a`, border: `1px solid rgba(29,161,255,0.35)`, borderRadius: 10, padding: 14, display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ fontWeight: 800 }}>🤖 Enviar Bot de Reunión:</div>
            <input value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} placeholder="URL de Google Meet, Zoom o Teams" style={{ marginLeft: "auto", width: 420, maxWidth: "40vw", background: C.dark, border: `1px solid ${C.border}`, borderRadius: 8, color: C.white, padding: "9px 12px" }} />
            <button onClick={createMeeting} disabled={saving} style={{ border: "none", borderRadius: 8, background: C.blue, color: "#07101c", fontWeight: 900, padding: "10px 18px", cursor: saving ? "not-allowed" : "pointer" }}>➤ Enviar Bot</button>
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 10, alignItems: "center" }}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar" style={{ width: 420, background: C.dark, border: `1px solid ${C.border}`, borderRadius: 8, color: C.white, padding: "10px 12px" }} />
            <button onClick={() => setSearch("")} style={{ border: "none", background: "transparent", color: C.white, cursor: "pointer" }}>⟳ Actualizar</button>
          </div>

          <div style={{ marginTop: 8, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: "9px 6px", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 180px", fontWeight: 900 }}>
            <span>Reunión</span><span>Fecha</span><span>Duración</span><span>Host</span><span>Participantes</span><span>Estado</span><span>Acciones</span>
          </div>

          {filteredMeetings.length === 0 ? (
            <div style={{ paddingTop: 10 }}>No se encontraron reuniones.</div>
          ) : (
            filteredMeetings.map((m) => (
              <div key={m.id} style={{ padding: "10px 6px", borderBottom: `1px solid ${C.border}`, display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 180px", alignItems: "center", columnGap: 8 }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.title || m.meeting_url || "Reunión"}</span>
                <span>{m.starts_at ? new Date(m.starts_at).toLocaleDateString() : "-"}</span>
                <span>{m.duration_minutes || 0}m</span>
                <span>{m.host || "-"}</span>
                <span>{m.participants_count || 0}</span>
                <span style={{ color: m.status === "scheduled" ? C.blue : m.status === "recorded" ? C.lime : C.red, fontWeight: 900 }}>
                  {m.status === "scheduled" ? "programada" : m.status === "recorded" ? "grabada" : "cancelada"}
                </span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => postOp("toggle_meeting", { meeting_id: m.id })} disabled={saving} style={{ border: `1px solid ${C.border}`, background: "transparent", color: C.white, borderRadius: 8, padding: "6px 8px", cursor: saving ? "not-allowed" : "pointer", fontSize: 12 }}>
                    {m.status === "scheduled" ? "Marcar grabada" : "Marcar próxima"}
                  </button>
                  <button onClick={() => postOp("delete_meeting", { meeting_id: m.id })} disabled={saving} style={{ border: `1px solid ${C.red}88`, background: "transparent", color: C.red, borderRadius: 8, padding: "6px 8px", cursor: saving ? "not-allowed" : "pointer", fontSize: 12 }}>
                    Eliminar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "folders" && (
        <div>
          <div style={{ borderBottom: `1px solid ${C.border}`, padding: "18px 24px", display: "flex", alignItems: "center" }}>
            <div style={{ fontWeight: 900, fontSize: 20 }}>Carpetas</div>
            <button onClick={createFolder} disabled={saving} style={{ marginLeft: "auto", borderRadius: 10, border: "none", background: C.blue, color: "#07101c", fontWeight: 900, padding: "11px 24px", cursor: saving ? "not-allowed" : "pointer" }}>+ Nueva carpeta</button>
          </div>

          {state.folders.length === 0 ? (
            <div style={{ minHeight: "calc(100vh - 150px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 44, color: C.muted }}>⌧</div>
                <div style={{ fontSize: 44, fontWeight: 900, marginTop: 14 }}>Aún no hay carpetas</div>
                <div style={{ marginTop: 10, color: C.muted, fontSize: 18 }}>Crea tu primera carpeta para organizar reuniones</div>
                <button onClick={createFolder} disabled={saving} style={{ marginTop: 20, borderRadius: 12, border: "none", background: C.blue, color: "#07101c", fontWeight: 900, padding: "14px 24px", cursor: saving ? "not-allowed" : "pointer" }}>+ Crear carpeta</button>
              </div>
            </div>
          ) : (
            <div style={{ padding: 24, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 12 }}>
              {state.folders.map((f) => (
                <div key={f.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
                  <div style={{ fontWeight: 900, fontSize: 17 }}>{f.name}</div>
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
              💡 Prompt Comercial Personalizado
            </button>
          </aside>
          <main style={{ padding: 24 }}>
            <div style={{ fontSize: 44, fontWeight: 900 }}>Prompt Comercial Personalizado</div>
            <p style={{ color: C.muted, fontSize: 16, marginTop: 10, maxWidth: 980 }}>
              Define tu metodología comercial o framework. La IA mejorará esta descripción y la usará para analizar todas tus reuniones.
            </p>
            <div style={{ marginTop: 22, fontWeight: 800, color: C.muted, fontSize: 14 }}>Tu framework comercial</div>
            <textarea
              value={state.prompt}
              onChange={(e) => setState((s) => ({ ...s, prompt: e.target.value }))}
              placeholder="Describe tu metodología o framework comercial..."
              style={{ marginTop: 10, width: "100%", maxWidth: 980, minHeight: 300, resize: "vertical", background: C.dark, border: `1px solid ${C.border}`, borderRadius: 12, color: C.white, padding: 16, fontSize: 14, lineHeight: 1.5 }}
            />
            <p style={{ color: C.muted, fontSize: 14, marginTop: 8, maxWidth: 980 }}>
              Describe tu proceso comercial, criterios de calificación o áreas específicas que quieres medir en cada llamada.
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
        <div style={{ position: "fixed", left: 16, bottom: 16, zIndex: 40, background: "rgba(239,68,68,0.14)", border: `1px solid ${C.red}88`, color: "#fecaca", borderRadius: 12, padding: "10px 12px", maxWidth: 440 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontWeight: 900 }}>Error:</span>
            <span style={{ fontSize: 13 }}>{errorMsg}</span>
            <button onClick={() => setErrorMsg("")} style={{ marginLeft: "auto", border: "none", background: "transparent", color: "#fecaca", cursor: "pointer", fontWeight: 900 }}>×</button>
          </div>
        </div>
      )}

      {showFolderModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(3,7,18,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ width: "100%", maxWidth: 460, borderRadius: 14, border: `1px solid ${C.border}`, background: C.card, padding: 16 }}>
            <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 8 }}>Nueva carpeta</div>
            <div style={{ color: C.muted, fontSize: 13, marginBottom: 12 }}>Escribe el nombre de la carpeta para organizar reuniones.</div>
            <input
              autoFocus
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Ej. Clientes Q1"
              style={{ width: "100%", background: C.dark, border: `1px solid ${C.border}`, borderRadius: 10, color: C.white, padding: "10px 12px" }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
              <button onClick={() => setShowFolderModal(false)} style={{ borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.white, padding: "10px 12px", cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={confirmCreateFolder} disabled={saving} style={{ borderRadius: 10, border: "none", background: C.blue, color: "#07101c", fontWeight: 900, padding: "10px 14px", cursor: saving ? "not-allowed" : "pointer" }}>
                {saving ? "Guardando..." : "Crear carpeta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
