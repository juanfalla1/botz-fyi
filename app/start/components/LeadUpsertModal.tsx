"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X, Save, Loader2, Trash2 } from "lucide-react";
import { supabase } from "./supabaseClient";
import { Lead } from "./LeadsTable";
import { useAuth } from "../MainLayout";

type Props = {
  isOpen: boolean;
  mode: "create" | "edit";
  lead?: Lead | null;
  onClose: () => void;
  onSaved?: () => void; // para refrescar la tabla desde afuera
};

export default function LeadUpsertModal({ isOpen, mode, lead, onClose, onSaved }: Props) {
  const { user, isAsesor, teamMemberId, tenantId: authTenantId, triggerDataRefresh } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // Campos mínimos (ajústalos si tu tabla tiene más)
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("NUEVO");
  const [origen, setOrigen] = useState("WEB");
  const [source, setSource] = useState("Web");

  // Si tu Lead tiene tenant_id/user_id, se usan; si no existen, no rompen.
  const tenantId = (lead as any)?.tenant_id ?? authTenantId ?? null;
  const userId = (lead as any)?.user_id ?? user?.id ?? null;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isOpen) return;

    setMsg("");

    if (mode === "edit" && lead) {
      setName(lead.name || "");
      setPhone(lead.phone || "");
      setEmail(lead.email || "");
      setStatus((lead as any)?.status || "NUEVO");
      setOrigen((lead as any)?.origen || "WEB");
      setSource((lead as any)?.source || "Web");
    }

    if (mode === "create") {
      setName("");
      setPhone("");
      setEmail("");
      setStatus("NUEVO");
      setOrigen("WEB");
      setSource("Web");
    }
  }, [isOpen, mode, lead]);

  const normalizedPhone = useMemo(() => {
    // Mantén simple: no “invento” reglas raras; solo limpia espacios.
    return String(phone || "").trim();
  }, [phone]);

  const handleSave = async () => {
    setMsg("");

    if (!normalizedPhone) {
      setMsg("⚠️ Teléfono es obligatorio");
      return;
    }

    setSaving(true);

    try {
      if (mode === "edit" && lead?.id) {
        // UPDATE por id (lo más seguro para no tocar tu lógica actual)
        const payload: any = {
          name: name || "Cliente",
          phone: normalizedPhone,
          email: email || null,
          status,
          origen,
          source,
          updated_at: new Date().toISOString(),
        };

        // Si existen en tu tabla, se envían; si no, supabase ignora si la columna no existe? (si no existe, dará error)
        // Por eso SOLO los agrego si vienen en el lead actual:
        if (tenantId) payload.tenant_id = tenantId;
        if (userId) payload.user_id = userId;

        const { error } = await supabase.from("leads").update(payload).eq("id", lead.id);
        if (error) throw error;

        setMsg("✓ Guardado");
        triggerDataRefresh();
        onSaved?.();
        setTimeout(() => onClose(), 300);
      } else {
        // CREATE (INSERT)
        let resolvedTenantId = tenantId;
        let resolvedTeamMemberId = teamMemberId;

        if (isAsesor && (!resolvedTenantId || !resolvedTeamMemberId)) {
          const { data: { user: authUser } } = await supabase.auth.getUser();

          const authUserId = authUser?.id || null;
          const authEmail = authUser?.email || user?.email || null;

          if (authUserId) {
            const { data: tmByAuth } = await supabase
              .from("team_members")
              .select("id, tenant_id")
              .eq("auth_user_id", authUserId)
              .eq("activo", true)
              .maybeSingle();

            if (tmByAuth) {
              resolvedTeamMemberId = tmByAuth.id || resolvedTeamMemberId;
              resolvedTenantId = tmByAuth.tenant_id || resolvedTenantId;
            }
          }

          if ((!resolvedTenantId || !resolvedTeamMemberId) && authEmail) {
            const { data: tmByEmail } = await supabase
              .from("team_members")
              .select("id, tenant_id")
              .eq("email", authEmail)
              .eq("activo", true)
              .maybeSingle();

            if (tmByEmail) {
              resolvedTeamMemberId = tmByEmail.id || resolvedTeamMemberId;
              resolvedTenantId = tmByEmail.tenant_id || resolvedTenantId;
            }
          }
        }

        if (isAsesor && !resolvedTeamMemberId) {
          setMsg("❌ No se pudo identificar el asesor. Revisa team_members.");
          setSaving(false);
          return;
        }

        if (!resolvedTenantId) {
          setMsg("❌ No se pudo resolver tenant_id para este lead.");
          setSaving(false);
          return;
        }

        const payload: any = {
          name: name || "Cliente",
          phone: normalizedPhone,
          email: email || null,
          status,
          origen,
          source,
          updated_at: new Date().toISOString(),
        };

        // Si tu app es multi-tenant, normalmente aquí deberías pasar tenant_id real.
        // SOLO lo seteo si tú ya lo tienes disponible.
        payload.tenant_id = resolvedTenantId;
        if (userId) payload.user_id = userId;

        // Si crea un asesor, el lead queda asignado para su tablero
        if (isAsesor && resolvedTeamMemberId) {
          payload.asesor_id = resolvedTeamMemberId;
          payload.assigned_to = resolvedTeamMemberId;
        }

        const { error } = await supabase.from("leads").insert([payload]);
        if (error) throw error;

        setMsg("✓ Creado");
        triggerDataRefresh();
        onSaved?.();
        setTimeout(() => onClose(), 300);
      }
    } catch (e: any) {
      console.error(e);
      setMsg("❌ Error guardando (revisa consola)");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!lead?.id) return;
    const ok = window.confirm("¿Seguro que deseas eliminar este lead? Esta acción no se puede deshacer.");
    if (!ok) return;

    setSaving(true);
    setMsg("");

    try {
      const { error } = await supabase.from("leads").delete().eq("id", lead.id);
      if (error) throw error;

      setMsg("✓ Eliminado");
      triggerDataRefresh();
      onSaved?.();
      setTimeout(() => onClose(), 300);
    } catch (e: any) {
      console.error(e);
      setMsg("❌ Error eliminando (revisa consola)");
    } finally {
      setSaving(false);
    }
  };

  if (!mounted || !isOpen) return null;

  const modal = (
    <div style={{ position: "fixed", inset: 0, zIndex: 999999 }}>
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(3px)",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "560px",
          maxWidth: "92vw",
          background: "#0f172a",
          border: "1px solid #334155",
          borderRadius: "14px",
          boxShadow: "0 20px 80px rgba(0,0,0,0.6)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ padding: 18, borderBottom: "1px solid #1e293b", display: "flex", justifyContent: "space-between" }}>
          <div style={{ color: "white", fontWeight: 800, fontSize: 14 }}>
            {mode === "create" ? "➕ Crear Lead" : "✏️ Editar Lead"}
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}>
            <X />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 18, display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Nombre" value={name} onChange={setName} placeholder="Cliente" />
            <Field label="Teléfono" value={phone} onChange={setPhone} placeholder="+34..." />
          </div>

          <Field label="Email" value={email} onChange={setEmail} placeholder="cliente@email.com" />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <Select
              label="Estado"
              value={status}
              onChange={setStatus}
              options={[
                { value: "NUEVO", label: "NUEVO" },
                { value: "CONTACTADO", label: "CONTACTADO" },
                { value: "DOCUMENTACIÓN", label: "DOCUMENTACIÓN" },
                { value: "PRE-APROBADO", label: "PRE-APROBADO" },
                { value: "FIRMADO", label: "FIRMADO" },
                { value: "CAÍDA", label: "CAÍDA" },
              ]}
            />
            <Select
              label="Origen"
              value={origen}
              onChange={setOrigen}
              options={[
                { value: "WEB", label: "WEB" },
                { value: "WHATSAPP", label: "WHATSAPP" },
                { value: "META", label: "META" },
                { value: "GOOGLE", label: "GOOGLE" },
                { value: "REFERIDO", label: "REFERIDO" },
              ]}
            />
            <Select
              label="Source"
              value={source}
              onChange={setSource}
              options={[
                { value: "Web", label: "Web" },
                { value: "Meta Ads", label: "Meta Ads" },
                { value: "Google", label: "Google" },
                { value: "WhatsApp", label: "WhatsApp" },
              ]}
            />
          </div>

          {msg && (
            <div style={{ fontSize: 12, color: msg.startsWith("✓") ? "#34d399" : msg.startsWith("⚠️") ? "#fbbf24" : "#f87171" }}>
              {msg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: 18, borderTop: "1px solid #1e293b", display: "flex", gap: 10, justifyContent: "space-between" }}>
          <div>
            {mode === "edit" && (
              <button
                onClick={handleDelete}
                disabled={saving}
                style={{
                  background: "rgba(239,68,68,0.15)",
                  border: "1px solid rgba(239,68,68,0.35)",
                  color: "#f87171",
                  padding: "10px 12px",
                  borderRadius: 10,
                  cursor: saving ? "wait" : "pointer",
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12,
                }}
              >
                <Trash2 size={14} />
                Eliminar
              </button>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: saving ? "#334155" : "linear-gradient(90deg, #22d3ee, #0ea5e9)",
              border: "none",
              color: "#0b1220",
              padding: "10px 14px",
              borderRadius: 10,
              cursor: saving ? "wait" : "pointer",
              fontWeight: 900,
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
            }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {mode === "create" ? "Crear" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ color: "#cbd5e1", fontSize: 11, fontWeight: 800 }}>{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "10px 12px",
          background: "#0b1220",
          border: "1px solid #334155",
          borderRadius: 10,
          color: "white",
          outline: "none",
          fontSize: 13,
        }}
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ color: "#cbd5e1", fontSize: 11, fontWeight: 800 }}>{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 12px",
          background: "#0b1220",
          border: "1px solid #334155",
          borderRadius: 10,
          color: "white",
          outline: "none",
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} style={{ background: "#0b1220" }}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
