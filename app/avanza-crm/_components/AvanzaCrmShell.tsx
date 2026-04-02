"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

const NAV_ITEMS = [
  { href: "/avanza-crm/inicio", label: "⌂" },
  { href: "/avanza-crm/dashboard", label: "Indicadores gerenciales" },
  { href: "/avanza-crm/empresas", label: "Empresas" },
  { href: "/avanza-crm/contactos", label: "Contactos" },
  { href: "/avanza-crm/negocios", label: "Negocios" },
  { href: "/avanza-crm/calendario", label: "Calendario" },
  { href: "/avanza-crm/informes", label: "Informes" },
  { href: "/avanza-crm/configuracion", label: "Configuración" },
];

const C = {
  bg: "#f2f4f8",
  top: "#2f3742",
  line: "#22b8aa",
  white: "#ffffff",
  text: "#293241",
  muted: "#6b7280",
  panel: "#ffffff",
  border: "#d8dee6",
  active: "#22b8aa",
};

export function AvanzaCrmShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/avanza-crm/inicio");
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        backgroundColor: C.bg,
        color: C.text,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <header
        style={{
          background: C.top,
          backgroundImage:
            "linear-gradient(rgba(47,55,66,0.92), rgba(47,55,66,0.92)), url('/avanza-crm/login-bg-v3.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          color: C.white,
          borderBottom: `3px solid ${C.line}`,
          position: "static",
          top: "auto",
          width: "auto",
          padding: 0,
          boxShadow: "none",
          backdropFilter: "none",
          display: "block",
        }}
      >
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>Avanza CRM</div>
          <div style={{ marginLeft: "auto", fontSize: 12, color: "#c4cbd5" }}>OHAUS · Comercial</div>
        </div>
        <nav style={{ maxWidth: 1400, margin: "0 auto", padding: "0 8px 8px", display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <button
            onClick={goBack}
            style={{
              border: "1px solid rgba(255,255,255,0.25)",
              background: "rgba(255,255,255,0.08)",
              color: C.white,
              borderRadius: 6,
              padding: "7px 10px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ←
          </button>
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  textDecoration: "none",
                  color: active ? "#0e4f49" : C.white,
                  background: active ? "#7fe1d7" : "rgba(255,255,255,0.08)",
                  padding: "7px 11px",
                  minWidth: item.label === "⌂" ? 40 : undefined,
                  textAlign: "center",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main style={{ width: "100%", padding: "10px 16px 16px", overflow: "auto", flex: 1 }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "grid", gap: 10 }}>
          {children}
        </div>
      </main>
    </div>
  );
}

export function AvanzaModuleCard({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <section style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", borderBottom: `2px solid ${C.line}`, fontWeight: 800 }}>{title}</div>
      <div style={{ padding: 14, color: C.muted, fontSize: 14 }}>{subtitle}</div>
    </section>
  );
}
