"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authedFetch } from "@/app/start/agents/authedFetchAgents";

const C = {
  bg: "#1a1d26",
  card: "#22262d",
  dark: "#111318",
  border: "rgba(255,255,255,0.10)",
  lime: "#a3e635",
  white: "#ffffff",
  muted: "#9ca3af",
};

type Agent = { id: string; name: string; type: string; status: string };
type NumberRow = {
  id: string;
  friendly_name: string;
  phone_number_e164: string;
  provider: string;
  status: string;
  assigned_agent_id: string | null;
};

export default function AgentNumbersPage() {
  const router = useRouter();
  const [rows, setRows] = useState<NumberRow[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ friendly_name: "", phone_number_e164: "", provider: "twilio", assigned_agent_id: "" });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authedFetch("/api/agents/numbers");
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo cargar numeros");
      setRows(Array.isArray(json.data) ? json.data : []);
      setAgents(Array.isArray(json.agents) ? json.agents : []);
    } catch (e: any) {
      setError(String(e?.message || "Error cargando datos"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchData(); }, []);

  const createNumber = async () => {
    try {
      const res = await authedFetch("/api/agents/numbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, assigned_agent_id: form.assigned_agent_id || null }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo crear");
      setForm({ friendly_name: "", phone_number_e164: "", provider: "twilio", assigned_agent_id: "" });
      await fetchData();
    } catch (e: any) {
      setError(String(e?.message || "Error creando numero"));
    }
  };

  const patchRow = async (id: string, patch: any) => {
    const res = await authedFetch(`/api/agents/numbers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const json = await res.json();
    if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo actualizar");
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: C.bg, color: C.white, fontFamily: "Inter,-apple-system,sans-serif" }}>
      <div style={{ height: 56, backgroundColor: C.dark, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 18px", gap: 12 }}>
        <button onClick={() => router.push("/start/agents")} style={{ background: "none", border: "none", color: C.lime, cursor: "pointer", fontWeight: 900 }}>← Volver</button>
        <div style={{ fontWeight: 900, fontSize: 16 }}>Numeros telefonicos</div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "22px 18px 36px" }}>
        <div style={{ color: C.muted, marginBottom: 14 }}>Configura numeros para llamadas reales y asignalos a tus agentes de voz.</div>
        {error && <div style={{ marginBottom: 12, border: `1px solid ${C.border}`, background: "rgba(239,68,68,0.12)", color: "#fca5a5", padding: "10px 12px", borderRadius: 10 }}>{error}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.2fr .9fr 1.2fr auto", gap: 10, marginBottom: 14, padding: 14, borderRadius: 14, border: `1px solid ${C.border}`, background: C.card }}>
          <input value={form.friendly_name} onChange={(e) => setForm((s) => ({ ...s, friendly_name: e.target.value }))} placeholder="Nombre (ej: Linea comercial)" style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white }} />
          <input value={form.phone_number_e164} onChange={(e) => setForm((s) => ({ ...s, phone_number_e164: e.target.value }))} placeholder="+573001234567" style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white }} />
          <select value={form.provider} onChange={(e) => setForm((s) => ({ ...s, provider: e.target.value }))} style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white }}>
            <option value="twilio">Twilio</option>
            <option value="sip">SIP</option>
            <option value="other">Otro</option>
          </select>
          <select value={form.assigned_agent_id} onChange={(e) => setForm((s) => ({ ...s, assigned_agent_id: e.target.value }))} style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white }}>
            <option value="">Sin asignar</option>
            {agents.filter((a) => a.type !== "flow").map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <button onClick={() => void createNumber()} style={{ borderRadius: 10, border: "none", background: C.lime, color: "#111", fontWeight: 900, padding: "0 14px", cursor: "pointer" }}>Agregar</button>
        </div>

        <div style={{ borderRadius: 14, border: `1px solid ${C.border}`, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: C.card }}>
              <tr>
                <th style={{ textAlign: "left", padding: 12 }}>Nombre</th>
                <th style={{ textAlign: "left", padding: 12 }}>Numero</th>
                <th style={{ textAlign: "left", padding: 12 }}>Proveedor</th>
                <th style={{ textAlign: "left", padding: 12 }}>Agente</th>
                <th style={{ textAlign: "left", padding: 12 }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {!loading && rows.length === 0 && <tr><td colSpan={5} style={{ padding: 14, color: C.muted }}>Sin numeros configurados.</td></tr>}
              {rows.map((r) => (
                <tr key={r.id} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={{ padding: 12 }}>{r.friendly_name || "-"}</td>
                  <td style={{ padding: 12 }}>{r.phone_number_e164}</td>
                  <td style={{ padding: 12 }}>{r.provider}</td>
                  <td style={{ padding: 12 }}>
                    <select value={r.assigned_agent_id || ""} onChange={async (e) => { await patchRow(r.id, { assigned_agent_id: e.target.value || null }); await fetchData(); }} style={{ padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white }}>
                      <option value="">Sin asignar</option>
                      {agents.filter((a) => a.type !== "flow").map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: 12 }}>
                    <select value={r.status} onChange={async (e) => { await patchRow(r.id, { status: e.target.value }); await fetchData(); }} style={{ padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white }}>
                      <option value="verified">Verificado</option>
                      <option value="purchased">Comprado</option>
                      <option value="pending">Pendiente</option>
                      <option value="inactive">Inactivo</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
