"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

type Msg = { role: "user" | "assistant"; content: string };

export default function WidgetAgentPage() {
  const searchParams = useSearchParams();
  const agentId = String(searchParams.get("agentId") || "").trim();

  const [title, setTitle] = useState("Botz");
  const [role, setRole] = useState("Asistente virtual");
  const [welcome, setWelcome] = useState("¡Hola! ¿En qué te puedo ayudar?");
  const [examples, setExamples] = useState<string[]>([]);
  const [primary, setPrimary] = useState("#a3e635");
  const [bg, setBg] = useState("#0b1220");
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const colors = useMemo(() => ({
    border: "rgba(255,255,255,0.12)",
    text: "#f8fafc",
    muted: "#94a3b8",
    userBg: "#0ea5e9",
    assistantBg: "rgba(255,255,255,0.08)",
  }), []);

  useEffect(() => {
    if (!agentId) {
      setError("Falta agentId");
      setLoadingConfig(false);
      return;
    }

    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/agents/public-config?agentId=${encodeURIComponent(agentId)}`);
        const json = await res.json();
        if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo cargar widget");
        if (!alive) return;
        const data = json.data || {};
        setTitle(String(data.name || "Botz"));
        setRole(String(data.role || "Asistente virtual"));
        setWelcome(String(data.welcome_message || "¡Hola! ¿En qué te puedo ayudar?"));
        setExamples(Array.isArray(data.examples) ? data.examples.slice(0, 4).map((x: any) => String(x || "")).filter(Boolean) : []);
        setPrimary(String(data?.widget?.primary_color || "#a3e635"));
        setBg(String(data?.widget?.bg_color || "#0b1220"));
        setMessages([{ role: "assistant", content: String(data.welcome_message || "¡Hola! ¿En qué te puedo ayudar?") }]);
      } catch (e: any) {
        if (!alive) return;
        setError(String(e?.message || "No disponible"));
      } finally {
        if (alive) setLoadingConfig(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [agentId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const send = async (input?: string) => {
    const raw = String(input ?? text).trim();
    if (!raw || sending || !agentId) return;

    const nextHistory = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: raw }]);
    setText("");
    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/agents/public-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, message: raw, history: nextHistory }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo responder");
      const reply = String(json?.data?.reply || "").trim() || "Sin respuesta";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (e: any) {
      setError(String(e?.message || "Error en conversación"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ height: "100dvh", background: bg, color: colors.text, fontFamily: "Inter,system-ui,sans-serif", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "12px 14px", borderBottom: `1px solid ${colors.border}`, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: "50%", background: primary, color: "#111", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>B</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 900, lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
          <div style={{ fontSize: 11, color: colors.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{role}</div>
        </div>
        <button
          type="button"
          onClick={() => window.parent?.postMessage({ type: "botz-widget-close" }, "*")}
          style={{ marginLeft: "auto", border: `1px solid ${colors.border}`, borderRadius: 8, background: "transparent", color: colors.muted, cursor: "pointer", width: 28, height: 28 }}
          title="Cerrar"
        >
          x
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
        {loadingConfig && <div style={{ color: colors.muted, fontSize: 13 }}>Cargando agente...</div>}
        {error && <div style={{ color: "#fca5a5", fontSize: 13, marginBottom: 8 }}>{error}</div>}

        {!loadingConfig && examples.length > 0 && messages.length <= 1 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            {examples.map((ex, idx) => (
              <button
                key={`${ex}-${idx}`}
                type="button"
                onClick={() => send(ex)}
                style={{ border: `1px solid ${colors.border}`, borderRadius: 999, padding: "7px 10px", background: "rgba(255,255,255,0.04)", color: colors.text, cursor: "pointer", fontSize: 12 }}
              >
                {ex}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {messages.map((m, idx) => (
            <div key={idx} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "88%", borderRadius: 12, padding: "9px 11px", fontSize: 13, lineHeight: 1.45, background: m.role === "user" ? colors.userBg : colors.assistantBg }}>
              {m.content}
            </div>
          ))}
          {sending && (
            <div style={{ alignSelf: "flex-start", maxWidth: "88%", borderRadius: 12, padding: "9px 11px", fontSize: 13, lineHeight: 1.45, background: colors.assistantBg, color: colors.muted }}>
              Escribiendo...
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${colors.border}`, padding: 10, display: "flex", gap: 8 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
          placeholder="Escribe un mensaje..."
          style={{ flex: 1, border: `1px solid ${colors.border}`, borderRadius: 10, background: "rgba(255,255,255,0.03)", color: colors.text, padding: "10px 11px", outline: "none", fontSize: 13 }}
        />
        <button
          type="button"
          onClick={() => send()}
          disabled={sending || !text.trim()}
          style={{ border: "none", borderRadius: 10, background: primary, color: "#111", fontWeight: 900, padding: "0 12px", cursor: sending ? "not-allowed" : "pointer" }}
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
