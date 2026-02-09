"use client";

import React, { useState } from "react";

export default function WhatsAppMetaConnectModal({
  isOpen,
  onClose,
  tenantId,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  onSaved: () => void;
}) {
  const [meta_access_token, setToken] = useState("");
  const [meta_phone_number_id, setPhoneId] = useState("");
  const [meta_waba_id, setWabaId] = useState("");
  const [meta_verify_token, setVerifyToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/whatsapp/meta/callback`
      : "https://www.botz.fyi/api/whatsapp/meta/callback";

  const save = async () => {
    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch("/api/whatsapp/meta/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          meta_access_token,
          meta_phone_number_id,
          meta_waba_id,
          meta_verify_token,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "No se pudo guardar");

      setMsg(
        `✅ Guardado. Webhook URL: ${data.webhook_url || webhookUrl} | Verify token: ${
          data.verify_token || meta_verify_token
        }`
      );
      onSaved();
    } catch (e: any) {
      setMsg(`❌ ${e?.message || "Error"}`);
    } finally {
      setLoading(false);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setMsg("✅ Copiado al portapapeles");
    } catch {
      setMsg("⚠️ No se pudo copiar (bloqueo del navegador)");
    }
  };

  const colors = {
    bg: "#070b14",
    panel: "rgba(255,255,255,0.06)",
    panel2: "rgba(255,255,255,0.04)",
    border: "rgba(255,255,255,0.10)",
    border2: "rgba(255,255,255,0.14)",
    text: "#e5e7eb",
    muted: "#94a3b8",
    blue: "#3b82f6",
    green: "#22c55e",
    red: "#ef4444",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    background: colors.panel2,
    border: `1px solid ${colors.border}`,
    color: "#fff",
    outline: "none",
    fontSize: 14,
  };

  const btnStyle: React.CSSProperties = {
    padding: "12px 14px",
    borderRadius: 12,
    border: `1px solid ${colors.border}`,
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 14,
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.72)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(6px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "min(680px, 92vw)",
          borderRadius: 22,
          padding: 22,
          position: "relative",
          background: `linear-gradient(180deg, rgba(59,130,246,0.10), rgba(34,197,94,0.06))`,
          border: `1px solid ${colors.border2}`,
          boxShadow: "0 20px 70px rgba(0,0,0,0.55)",
        }}
      >
        <div
          style={{
            background: colors.bg,
            borderRadius: 18,
            border: `1px solid ${colors.border}`,
            padding: 22,
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              width: 40,
              height: 40,
              borderRadius: 12,
              border: `1px solid ${colors.border}`,
              background: "rgba(255,255,255,0.06)",
              color: "#fff",
              fontSize: 20,
              cursor: "pointer",
            }}
            aria-label="Cerrar"
            title="Cerrar"
          >
            ✕
          </button>

          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 14,
                display: "grid",
                placeItems: "center",
                background: "rgba(34,197,94,0.12)",
                border: "1px solid rgba(34,197,94,0.25)",
                color: colors.green,
                fontWeight: 900,
              }}
            >
              WA
            </div>

            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, color: "#fff", fontSize: 22, fontWeight: 900 }}>
                Conectar WhatsApp Meta (Cloud API)
              </h3>
              <p style={{ margin: "6px 0 0 0", color: colors.muted, fontSize: 13 }}>
                Meta <b>NO</b> usa QR. Pega credenciales + configura webhook.
              </p>
              <div style={{ marginTop: 6, color: colors.muted, fontSize: 12 }}>
                Tenant: <span style={{ color: "#fff", fontWeight: 700 }}>{tenantId}</span>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
            <label style={{ color: colors.muted, fontSize: 12, fontWeight: 700 }}>
              access_token
              <input
                style={inputStyle}
                placeholder="Pega tu access token"
                value={meta_access_token}
                onChange={(e) => setToken(e.target.value)}
              />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label style={{ color: colors.muted, fontSize: 12, fontWeight: 700 }}>
                phone_number_id
                <input
                  style={inputStyle}
                  placeholder="Ej: 1234567890"
                  value={meta_phone_number_id}
                  onChange={(e) => setPhoneId(e.target.value)}
                />
              </label>

              <label style={{ color: colors.muted, fontSize: 12, fontWeight: 700 }}>
                waba_id
                <input
                  style={inputStyle}
                  placeholder="WhatsApp Business Account ID"
                  value={meta_waba_id}
                  onChange={(e) => setWabaId(e.target.value)}
                />
              </label>
            </div>

            <label style={{ color: colors.muted, fontSize: 12, fontWeight: 700 }}>
              verify_token (lo inventas tú)
              <input
                style={inputStyle}
                placeholder="Ej: botz_meta_verify_2026"
                value={meta_verify_token}
                onChange={(e) => setVerifyToken(e.target.value)}
              />
            </label>
          </div>

          <div
            style={{
              marginTop: 14,
              padding: 14,
              borderRadius: 14,
              background: colors.panel,
              border: `1px solid ${colors.border}`,
            }}
          >
            <div style={{ color: "#fff", fontWeight: 900, fontSize: 13 }}>
              Webhook URL (Meta Developers → Webhooks)
            </div>

            <div
              style={{
                marginTop: 8,
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  flex: 1,
                  minWidth: 260,
                  padding: "10px 12px",
                  borderRadius: 12,
                  background: "rgba(0,0,0,0.35)",
                  border: `1px solid ${colors.border}`,
                  color: "#e2e8f0",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  fontSize: 12,
                  overflowX: "auto",
                }}
              >
                {webhookUrl}
              </div>

              <button
                style={{
                  ...btnStyle,
                  background: "rgba(59,130,246,0.15)",
                  color: colors.blue,
                }}
                onClick={() => copy(webhookUrl)}
                type="button"
              >
                Copiar URL
              </button>

              <button
                style={{
                  ...btnStyle,
                  background: "rgba(34,197,94,0.14)",
                  color: colors.green,
                }}
                onClick={() => copy(meta_verify_token || "")}
                type="button"
              >
                Copiar verify_token
              </button>
            </div>

            <div style={{ color: colors.muted, marginTop: 10, fontSize: 12, lineHeight: 1.5 }}>
              En Meta: pega la URL y usa el <b>mismo verify_token</b>. Luego suscribe los eventos
              (messages / message_template_status_update / etc. según tu caso).
            </div>
          </div>

          {msg && (
            <div
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 14,
                background: msg.startsWith("❌")
                  ? "rgba(239,68,68,0.10)"
                  : msg.startsWith("⚠️")
                  ? "rgba(251,191,36,0.10)"
                  : "rgba(34,197,94,0.10)",
                border: msg.startsWith("❌")
                  ? "1px solid rgba(239,68,68,0.22)"
                  : msg.startsWith("⚠️")
                  ? "1px solid rgba(251,191,36,0.22)"
                  : "1px solid rgba(34,197,94,0.22)",
                color: "#fff",
                fontSize: 13,
              }}
            >
              {msg}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
            <button
              onClick={onClose}
              type="button"
              style={{
                ...btnStyle,
                background: "rgba(255,255,255,0.06)",
                color: "#fff",
              }}
            >
              Cancelar
            </button>

            <button
              onClick={save}
              disabled={loading}
              type="button"
              style={{
                ...btnStyle,
                background: loading
                  ? "rgba(34,197,94,0.22)"
                  : "linear-gradient(90deg, rgba(34,197,94,0.95), rgba(59,130,246,0.95))",
                color: "#071018",
                border: "none",
                opacity: loading ? 0.75 : 1,
              }}
            >
              {loading ? "Guardando..." : "Guardar y activar Meta"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
