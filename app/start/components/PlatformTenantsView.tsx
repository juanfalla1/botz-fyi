"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
import { useAuth } from "../MainLayout";
import { Building2, Search, RefreshCw, ShieldCheck, UserPlus, Users } from "lucide-react";

type AppLanguage = "es" | "en";

type TenantRow = {
  id: string;
  empresa: string | null;
  email: string | null;
  telefono: string | null;
  status: string | null;
  trial_start: string | null;
  trial_end: string | null;
  source: string | null;
  created_at: string;
  auth_user_id: string | null;
  tenant_id?: string | null;
};

type TeamMemberRow = {
  id: string;
  nombre: string | null;
  email: string | null;
  rol: string | null;
  activo: boolean | null;
  auth_user_id: string | null;
  created_at: string | null;
};

const TEXT: Record<
  AppLanguage,
  {
    title: string;
    subtitle: string;
    search: string;
    refresh: string;
    tenants: string;
    selectTenant: string;
    tenant: string;
    company: string;
    status: string;
    created: string;
    owner: string;
    savedEmail: string;
    team: string;
    assignAdmin: string;
    adminEmail: string;
    assign: string;
    assigning: string;
    done: string;
    error: string;
    platformOnly: string;
  }
> = {
  es: {
    title: "Clientes (Platform Admin)",
    subtitle: "Lista de tenants y asignacion de administradores.",
    search: "Buscar por empresa o email...",
    refresh: "Refrescar",
    tenants: "Clientes",
    selectTenant: "Selecciona un cliente para ver detalle.",
    tenant: "Tenant",
    company: "Empresa",
    status: "Estado",
    created: "Creado",
    owner: "Owner (auth_user_id)",
    savedEmail: "Email guardado",
    team: "Equipo",
    assignAdmin: "Asignar Administrador",
    adminEmail: "Email del nuevo admin",
    assign: "Asignar",
    assigning: "Asignando...",
    done: "Listo",
    error: "Error",
    platformOnly: "Esta seccion es solo para Platform Admin.",
  },
  en: {
    title: "Clients (Platform Admin)",
    subtitle: "Tenants list and admin assignment.",
    search: "Search by company or email...",
    refresh: "Refresh",
    tenants: "Clients",
    selectTenant: "Select a tenant to see details.",
    tenant: "Tenant",
    company: "Company",
    status: "Status",
    created: "Created",
    owner: "Owner (auth_user_id)",
    savedEmail: "Saved email",
    team: "Team",
    assignAdmin: "Assign Administrator",
    adminEmail: "New admin email",
    assign: "Assign",
    assigning: "Assigning...",
    done: "Done",
    error: "Error",
    platformOnly: "This section is for Platform Admin only.",
  },
};

function fmtDate(raw?: string | null, lang: AppLanguage = "es") {
  if (!raw) return "-";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "-";
  const locale = lang === "en" ? "en-US" : "es-ES";
  return d.toLocaleString(locale, { year: "numeric", month: "short", day: "2-digit" });
}

export default function PlatformTenantsView() {
  const { isPlatformAdmin } = useAuth();
  const [language, setLanguage] = useState<AppLanguage>("es");
  const t = TEXT[language];

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const selectedTenant = useMemo(
    () => tenants.find((x) => String(x.id) === String(selectedTenantId)) || null,
    [tenants, selectedTenantId]
  );

  const [team, setTeam] = useState<TeamMemberRow[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);

  const [adminEmail, setAdminEmail] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignOk, setAssignOk] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("botz-language");
    if (saved === "es" || saved === "en") setLanguage(saved);
    const onLangChange = (event: Event) => {
      const next = (event as CustomEvent<AppLanguage>).detail;
      if (next === "es" || next === "en") setLanguage(next);
    };
    window.addEventListener("botz-language-change", onLangChange);
    return () => window.removeEventListener("botz-language-change", onLangChange);
  }, []);

  const fetchWithAuth = async (input: RequestInfo, init?: RequestInit) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("No session token");
    const headers = new Headers(init?.headers || {});
    headers.set("Authorization", `Bearer ${token}`);
    headers.set("Content-Type", headers.get("Content-Type") || "application/json");
    return await fetch(input, { ...init, headers });
  };

  const loadTenants = async () => {
    try {
      setError(null);
      setAssignOk(null);
      setLoading(true);
      const url = new URL("/api/platform/tenants", window.location.origin);
      if (q.trim()) url.searchParams.set("q", q.trim());
      const res = await fetchWithAuth(url.toString());
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || `HTTP ${res.status}`);
      setTenants(j?.tenants || []);
    } catch (e: any) {
      setTenants([]);
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const loadTeam = async (tenantId: string) => {
    try {
      setTeamLoading(true);
      const url = new URL("/api/platform/tenants", window.location.origin);
      url.searchParams.set("tenantId", tenantId);
      const res = await fetchWithAuth(url.toString());
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || `HTTP ${res.status}`);
      setTeam(j?.team || []);
    } catch (e) {
      setTeam([]);
    } finally {
      setTeamLoading(false);
    }
  };

  useEffect(() => {
    if (!isPlatformAdmin) return;
    loadTenants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlatformAdmin]);

  useEffect(() => {
    if (!selectedTenantId) {
      setTeam([]);
      setAdminEmail("");
      return;
    }
    loadTeam(selectedTenantId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenantId]);

  const assignAdmin = async () => {
    if (!selectedTenantId) return;
    const email = adminEmail.trim().toLowerCase();
    if (!email) return;

    try {
      setError(null);
      setAssignOk(null);
      setAssigning(true);

      const res = await fetchWithAuth("/api/platform/tenants/assign-admin", {
        method: "POST",
        body: JSON.stringify({ tenantId: selectedTenantId, email }),
      });

      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || `HTTP ${res.status}`);

      setAssignOk(t.done);
      await loadTenants();
      await loadTeam(selectedTenantId);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setAssigning(false);
    }
  };

  if (!isPlatformAdmin) {
    return (
      <div
        style={{
          padding: 18,
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.03)",
          color: "#94a3b8",
          fontSize: 13,
        }}
      >
        {t.platformOnly}
      </div>
    );
  }

  const filtered = tenants;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 16, height: "100%" }}>
      <div
        style={{
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.03)",
          padding: 14,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          minHeight: 520,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Building2 size={18} color="#22d3ee" />
            <div>
              <div style={{ fontWeight: 900, color: "#e2e8f0", fontSize: 14 }}>{t.tenants}</div>
              <div style={{ color: "#64748b", fontSize: 12 }}>{t.subtitle}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={loadTenants}
            disabled={loading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 10px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(0,0,0,0.25)",
              color: "#cbd5e1",
              cursor: loading ? "wait" : "pointer",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            <RefreshCw size={14} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            {t.refresh}
          </button>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={14} color="#64748b" style={{ position: "absolute", left: 10, top: 10 }} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.search}
              style={{
                width: "100%",
                padding: "8px 10px 8px 30px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(0,0,0,0.25)",
                color: "#e2e8f0",
                fontSize: 12,
                outline: "none",
              }}
            />
          </div>
          <button
            type="button"
            onClick={loadTenants}
            disabled={loading}
            style={{
              padding: "8px 12px",
              borderRadius: 12,
              border: "1px solid rgba(34,211,238,0.35)",
              background: "rgba(34,211,238,0.12)",
              color: "#22d3ee",
              cursor: loading ? "wait" : "pointer",
              fontSize: 12,
              fontWeight: 900,
            }}
          >
            OK
          </button>
        </div>

        <div style={{ marginTop: 10, color: "#64748b", fontSize: 12 }}>
          {loading ? "..." : `${filtered.length}`}
        </div>

        <div style={{ marginTop: 10, overflow: "auto", paddingRight: 6 }}>
          {filtered.map((row) => {
            const active = String(row.id) === String(selectedTenantId);
            return (
              <button
                key={row.id}
                type="button"
                onClick={() => setSelectedTenantId(row.id)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: active ? "1px solid rgba(34,211,238,0.40)" : "1px solid rgba(255,255,255,0.08)",
                  background: active ? "rgba(34,211,238,0.10)" : "rgba(255,255,255,0.03)",
                  color: "#e2e8f0",
                  cursor: "pointer",
                  marginBottom: 8,
                }}
              >
                <div style={{ fontWeight: 900, fontSize: 13 }}>{row.empresa || "(sin empresa)"}</div>
                <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <span>{row.email || "-"}</span>
                  <span style={{ opacity: 0.7 }}>•</span>
                  <span>{row.status || "-"}</span>
                  <span style={{ opacity: 0.7 }}>•</span>
                  <span>{fmtDate(row.created_at, language)}</span>
                </div>
                <div style={{ color: "#64748b", fontSize: 11, marginTop: 6 }}>{row.id}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.03)",
          padding: 16,
          overflow: "auto",
          minHeight: 520,
        }}
      >
        {!selectedTenant ? (
          <div style={{ color: "#94a3b8", fontSize: 13 }}>{t.selectTenant}</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <ShieldCheck size={18} color="#fbbf24" />
                  <div style={{ fontWeight: 950, color: "#e2e8f0" }}>{selectedTenant.empresa || "(sin empresa)"}</div>
                </div>
                <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 6 }}>{selectedTenant.id}</div>
              </div>
            </div>

            {error && (
              <div
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(239,68,68,0.25)",
                  background: "rgba(239,68,68,0.08)",
                  color: "#fecaca",
                  padding: "10px 12px",
                  fontSize: 12,
                }}
              >
                {t.error}: {error}
              </div>
            )}
            {assignOk && (
              <div
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(34,197,94,0.22)",
                  background: "rgba(34,197,94,0.10)",
                  color: "#bbf7d0",
                  padding: "10px 12px",
                  fontSize: 12,
                }}
              >
                {assignOk}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
              <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.18)", padding: 12 }}>
                <div style={{ color: "#64748b", fontSize: 11 }}>{t.company}</div>
                <div style={{ color: "#e2e8f0", fontWeight: 900, marginTop: 6 }}>{selectedTenant.empresa || "-"}</div>
              </div>
              <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.18)", padding: 12 }}>
                <div style={{ color: "#64748b", fontSize: 11 }}>{t.status}</div>
                <div style={{ color: "#e2e8f0", fontWeight: 900, marginTop: 6 }}>{selectedTenant.status || "-"}</div>
              </div>
              <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.18)", padding: 12 }}>
                <div style={{ color: "#64748b", fontSize: 11 }}>{t.owner}</div>
                <div style={{ color: "#e2e8f0", fontWeight: 800, marginTop: 6, fontSize: 12 }}>
                  {selectedTenant.auth_user_id || "-"}
                </div>
              </div>
              <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.18)", padding: 12 }}>
                <div style={{ color: "#64748b", fontSize: 11 }}>{t.savedEmail}</div>
                <div style={{ color: "#e2e8f0", fontWeight: 800, marginTop: 6, fontSize: 12 }}>{selectedTenant.email || "-"}</div>
              </div>
            </div>

            <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.18)", padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <UserPlus size={18} color="#22d3ee" />
                  <div style={{ fontWeight: 950, color: "#e2e8f0" }}>{t.assignAdmin}</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                <input
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder={t.adminEmail}
                  style={{
                    flex: 1,
                    minWidth: 260,
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(0,0,0,0.25)",
                    color: "#e2e8f0",
                    fontSize: 12,
                    outline: "none",
                  }}
                />
                <button
                  type="button"
                  onClick={assignAdmin}
                  disabled={assigning || !adminEmail.trim()}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(34,211,238,0.35)",
                    background: "rgba(34,211,238,0.14)",
                    color: "#22d3ee",
                    cursor: assigning ? "wait" : "pointer",
                    fontSize: 12,
                    fontWeight: 950,
                  }}
                >
                  <ShieldCheck size={16} />
                  {assigning ? t.assigning : t.assign}
                </button>
              </div>

              <div style={{ marginTop: 10, color: "#64748b", fontSize: 11 }}>
                Nota: el email debe existir en Auth (usuario registrado). Si no existe, crea el usuario primero.
              </div>
            </div>

            <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.18)", padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Users size={18} color="#a5b4fc" />
                  <div style={{ fontWeight: 950, color: "#e2e8f0" }}>{t.team}</div>
                </div>
                <div style={{ color: "#94a3b8", fontSize: 12 }}>{teamLoading ? "..." : `${team.length}`}</div>
              </div>

              <div style={{ marginTop: 10, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, color: "#cbd5e1" }}>
                  <thead>
                    <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      <th style={{ padding: "10px 8px", color: "#94a3b8", fontSize: 11 }}>Nombre</th>
                      <th style={{ padding: "10px 8px", color: "#94a3b8", fontSize: 11 }}>Email</th>
                      <th style={{ padding: "10px 8px", color: "#94a3b8", fontSize: 11 }}>Rol</th>
                      <th style={{ padding: "10px 8px", color: "#94a3b8", fontSize: 11 }}>Activo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {team.map((m) => (
                      <tr key={m.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <td style={{ padding: "10px 8px" }}>{m.nombre || "-"}</td>
                        <td style={{ padding: "10px 8px" }}>{m.email || "-"}</td>
                        <td style={{ padding: "10px 8px" }}>{m.rol || "-"}</td>
                        <td style={{ padding: "10px 8px" }}>{String(Boolean(m.activo))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `,
        }}
      />
    </div>
  );
}
